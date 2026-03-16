const fs = require('fs');
const os = require('os');
const path = require('path');

const { Tool } = require('../src/tools/adapters/Tool');
const { OpenAIAdapter } = require('../src/llm/OpenAi');
const { GeminiAdapter } = require('../src/llm/Gemini');
const { AnthropicAdapter } = require('../src/llm/Anthropic');
const { HFAdapter } = require('../src/llm/HuggingFace');
const { DeepSeekAdapter } = require('../src/llm/DeepSeek');
const { RetryManager } = require('../src/utils/RetryManager');
const { AdapterCapabilityError } = require('../src/errors');

function disableRetries(adapter) {
  adapter.retryManager = new RetryManager({ retries: 0, baseDelay: 1, maxDelay: 1 });
  return adapter;
}

describe('Adapter unit tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('OpenAIAdapter', () => {
    test('generateText returns plain text', async () => {
      const adapter = disableRetries(new OpenAIAdapter('test-key'));
      adapter.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'hello world' } }],
            }),
          },
        },
      };

      await expect(adapter.generateText([{ role: 'user', content: 'Hello' }])).resolves.toEqual({
        message: 'hello world',
      });
    });

    test('generateText parses tool calls', async () => {
      const adapter = disableRetries(new OpenAIAdapter('test-key'));
      adapter.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: '',
                  function_call: {
                    name: 'lookup',
                    arguments: '{"city":"Lisbon"}',
                    id: 'call_1',
                  },
                },
              }],
            }),
          },
        },
      };

      await expect(adapter.generateText([{ role: 'user', content: 'Use a tool' }])).resolves.toEqual({
        message: '',
        toolCalls: [{ name: 'lookup', arguments: { city: 'Lisbon' }, id: 'call_1' }],
      });
    });

    test('generateText falls back to empty arguments when tool call JSON is invalid', async () => {
      const adapter = disableRetries(new OpenAIAdapter('test-key'));
      adapter.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'fallback',
                  function_call: {
                    name: 'lookup',
                    arguments: '{bad json',
                  },
                },
              }],
            }),
          },
        },
      };

      await expect(adapter.generateText([{ role: 'user', content: 'Use a tool' }])).resolves.toEqual({
        message: 'fallback',
        toolCalls: [{ name: 'lookup', arguments: {}, id: expect.any(String) }],
      });
    });

    test('generateToolResult returns final assistant text', async () => {
      const adapter = disableRetries(new OpenAIAdapter('test-key'));
      adapter.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'tool result answer' } }],
            }),
          },
        },
      };

      const result = await adapter.generateToolResult(
        [{ role: 'user', content: 'Question' }],
        { name: 'lookup', arguments: { city: 'Lisbon' }, id: 'call_1' },
        { forecast: 'sunny' }
      );

      expect(result).toBe('tool result answer');
    });

    test('generateImage returns URLs or base64 payloads', async () => {
      const adapter = disableRetries(new OpenAIAdapter('test-key'));
      adapter.openai = {
        images: {
          generate: jest.fn()
            .mockResolvedValueOnce({ data: [{ url: 'https://example.com/image.png' }] })
            .mockResolvedValueOnce({ data: [{ url: 'https://example.com/image.png' }] }),
        },
      };

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: async () => Buffer.from('image-bytes'),
      });

      await expect(
        adapter.generateImage({ user: 'Draw something' }, { returnBase64: false })
      ).resolves.toEqual(['https://example.com/image.png']);

      const base64Result = await adapter.generateImage({ user: 'Draw something' }, { returnBase64: true });
      expect(base64Result[0]).toMatch(/^data:image\/png;base64,/);
      expect(fetchSpy).toHaveBeenCalled();
    });

    test('analyzeImage returns model output and rejects invalid input', async () => {
      const adapter = disableRetries(new OpenAIAdapter('test-key'));
      adapter.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'image summary' } }],
            }),
          },
        },
      };

      await expect(
        adapter.analyzeImage('https://example.com/image.png', { prompt: { user: 'Describe it' } })
      ).resolves.toBe('image summary');

      await expect(adapter.analyzeImage({ nope: true })).rejects.toThrow(
        'Unsupported imageData format. Must be a URL, base64 string, or Buffer.'
      );
    });

    test('embedChunks validates input and returns embeddings', async () => {
      const adapter = disableRetries(new OpenAIAdapter('test-key'));
      adapter.openai = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: [0.1, 0.2] }],
          }),
        },
      };

      await expect(adapter.embedChunks(['hello'])).resolves.toEqual([{ embedding: [0.1, 0.2] }]);
      await expect(adapter.embedChunks([''])).rejects.toThrow(
        'embedChunks requires a non-empty array of non-empty strings.'
      );
    });

    test('transcribeAudio accepts buffers and generateAudio returns buffers', async () => {
      const adapter = new OpenAIAdapter('test-key');
      const createReadStreamSpy = jest.spyOn(fs, 'createReadStream').mockReturnValue({ mocked: true });
      adapter.openai = {
        audio: {
          transcriptions: {
            create: jest.fn().mockResolvedValue({ text: 'hello transcript' }),
          },
          speech: {
            create: jest.fn().mockResolvedValue({
              arrayBuffer: async () => Buffer.from('mp3-data'),
            }),
          },
        },
      };

      await expect(adapter.transcribeAudio(Buffer.from('audio-data'))).resolves.toBe('hello transcript');
      await expect(adapter.generateAudio('Hello')).resolves.toEqual(Buffer.from('mp3-data'));
      expect(createReadStreamSpy).toHaveBeenCalled();
      await expect(adapter.analyzeVideo(Buffer.from('x'))).rejects.toThrow(
        'OpenAIAdapter does not support analyzeVideo().'
      );
      await expect(adapter.generateVideo('Prompt')).rejects.toThrow(
        'OpenAIAdapter does not support generateVideo().'
      );
    });
  });

  describe('GeminiAdapter', () => {
    test('generateText and generateToolResult normalize responses', async () => {
      const adapter = disableRetries(new GeminiAdapter('test-key'));
      const model = {
        generateContent: jest.fn()
          .mockResolvedValueOnce({
            response: {
              text: () => 'hello from gemini',
              functionCalls: [{ name: 'calculate', args: { expression: '1+1' } }],
            },
          })
          .mockResolvedValueOnce({
            response: { text: () => 'tool follow-up answer' },
          }),
      };

      adapter.genAI = {
        getGenerativeModel: jest.fn().mockReturnValue(model),
      };

      const result = await adapter.generateText([{ role: 'user', content: 'Hi' }]);
      expect(result).toEqual({
        message: 'hello from gemini',
        toolCalls: [{ id: expect.any(String), name: 'calculate', arguments: { expression: '1+1' } }],
      });

      await expect(
        adapter.generateToolResult([{ role: 'user', content: 'Hi' }], { name: 'calculate' }, { result: 2 })
      ).resolves.toBe('tool follow-up answer');
    });

    test('analyzeImage, embedChunks, analyzeVideo, and generateVideo work with mocked SDKs', async () => {
      const adapter = disableRetries(new GeminiAdapter('test-key'));
      const multimodalModel = {
        generateContent: jest.fn()
          .mockResolvedValueOnce({ response: { text: () => 'image answer' } })
          .mockResolvedValueOnce({
            response: {
              candidates: [{ content: { parts: [{ text: 'video answer' }] } }],
            },
          }),
      };
      const embedModel = {
        embedContent: jest.fn().mockResolvedValue({
          embeddings: [{ values: [0.5, 0.2, 0.1] }],
        }),
      };

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: async () => Buffer.from('video-bytes'),
      });

      adapter.genAI = {
        apiKey: 'test-key',
        getGenerativeModel: jest.fn()
          .mockReturnValueOnce(multimodalModel)
          .mockReturnValueOnce(embedModel)
          .mockReturnValueOnce(multimodalModel),
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            done: true,
            response: { generatedVideos: [{ video: { uri: 'https://example.com/video.mp4' } }] },
          }),
        },
        operations: {
          getVideosOperation: jest.fn(),
        },
      };

      await expect(
        adapter.analyzeImage('https://example.com/image.png', { prompt: { user: 'Describe it' } })
      ).resolves.toBe('image answer');
      await expect(adapter.embedChunks(['hello'])).resolves.toEqual([{ embedding: [0.5, 0.2, 0.1] }]);
      await expect(
        adapter.analyzeVideo('/tmp/video.mp4', { prompt: { user: 'Describe video' } })
      ).resolves.toBe('video answer');
      await expect(adapter.generateVideo('Make a clip')).resolves.toEqual(Buffer.from('video-bytes'));
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe('AnthropicAdapter', () => {
    test('generateText returns text or tool calls and generateToolResult returns text', async () => {
      const adapter = disableRetries(new AnthropicAdapter('test-key'));
      adapter.client = {
        messages: {
          create: jest.fn()
            .mockResolvedValueOnce({
              content: [
                { type: 'text', text: 'hello anthropic' },
                { type: 'tool_use', name: 'lookup', input: { city: 'Lisbon' }, id: 'tool_1' },
              ],
            })
            .mockResolvedValueOnce({
              content: [{ type: 'text', text: 'tool result answer' }],
            }),
        },
      };

      const result = await adapter.generateText({ system: 'sys', user: 'hi' });
      expect(result).toEqual({
        message: '',
        toolCalls: [{ name: 'lookup', arguments: { city: 'Lisbon' }, id: 'tool_1' }],
      });

      await expect(
        adapter.generateToolResult({ system: 'sys', user: 'hi' }, { name: 'lookup', arguments: {}, id: 'tool_1' }, { ok: true })
      ).resolves.toBe('tool result answer');
    });

    test('unsupported media methods throw', async () => {
      const adapter = disableRetries(new AnthropicAdapter('test-key'));

      await expect(adapter.generateImage('x')).rejects.toThrow('AnthropicAdapter does not support generateImage().');
      await expect(adapter.analyzeImage('x')).rejects.toThrow('AnthropicAdapter does not support analyzeImage().');
      await expect(adapter.embedChunks(['x'])).rejects.toThrow('AnthropicAdapter does not support embedChunks().');
      await expect(adapter.transcribeAudio(Buffer.from('x'))).rejects.toThrow(
        'AnthropicAdapter does not support transcribeAudio().'
      );
      await expect(adapter.generateAudio('x')).rejects.toThrow(
        'AnthropicAdapter does not support generateAudio().'
      );
    });
  });

  describe('HFAdapter', () => {
    test('generateText, generateToolResult, generateImage, analyzeImage, and embedChunks work', async () => {
      const adapter = disableRetries(new HFAdapter('test-key'));
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      adapter.inference = {
        textGeneration: jest.fn()
          .mockResolvedValueOnce({ generated_text: '{"toolCall":{"name":"lookup","arguments":{"city":"Lisbon"}}}' })
          .mockResolvedValueOnce({ generated_text: 'final answer' }),
        textToImage: jest.fn().mockResolvedValue(Buffer.from('image')),
        imageToText: jest.fn().mockResolvedValue([{ generated_text: 'image caption' }]),
        featureExtraction: jest.fn().mockResolvedValue([0.9, 0.1]),
      };

      await expect(adapter.generateText({ user: 'hi' })).resolves.toEqual({
        message: '',
        toolCalls: [{ name: 'lookup', arguments: { city: 'Lisbon' }, id: expect.any(String) }],
      });

      await expect(
        adapter.generateToolResult({ user: 'hi' }, { name: 'lookup', arguments: {} }, { ok: true })
      ).resolves.toBe('final answer');

      await expect(adapter.generateImage({ user: 'draw' })).resolves.toEqual(Buffer.from('image'));
      await expect(adapter.analyzeImage(Buffer.from('img'))).resolves.toBe('image caption');
      await expect(adapter.embedChunks(['hello'])).resolves.toEqual([[0.9, 0.1]]);
      await expect(adapter.generateVideo('clip')).rejects.toThrow(
        'HFAdapter does not support generateVideo().'
      );
      expect(warnSpy).not.toHaveBeenCalled();
    });

    test('analyzeVideo rejects unsupported local file formats', async () => {
      const adapter = disableRetries(new HFAdapter('test-key'));
      await expect(adapter.analyzeVideo('/tmp/video.txt')).rejects.toThrow(
        'Unsupported file format: txt. Supported formats: mp4, avi, mov, webm'
      );
    });
  });

  describe('DeepSeekAdapter', () => {
    test('generateText, generateToolResult, embedChunks, and unsupported methods behave correctly', async () => {
      const adapter = disableRetries(new DeepSeekAdapter('test-key'));
      adapter.openai = {
        chat: {
          completions: {
            create: jest.fn()
              .mockResolvedValueOnce({
                choices: [{
                  message: {
                    content: '',
                    function_call: { name: 'lookup', arguments: '{"q":"weather"}', id: 'tool_1' },
                  },
                }],
              })
              .mockResolvedValueOnce({
                choices: [{ message: { content: 'deepseek final answer' } }],
              }),
          },
        },
        embeddings: {
          create: jest.fn().mockResolvedValue({ data: [{ embedding: [1, 2, 3] }] }),
        },
      };

      await expect(adapter.generateText({ user: 'hi' })).resolves.toEqual({
        message: '',
        toolCalls: [{ name: 'lookup', arguments: { q: 'weather' }, id: 'tool_1' }],
      });
      await expect(
        adapter.generateToolResult({ user: 'hi' }, { name: 'lookup', arguments: {} }, { ok: true })
      ).resolves.toBe('deepseek final answer');
      await expect(adapter.embedChunks(['hello'])).resolves.toEqual([{ embedding: [1, 2, 3] }]);
      await expect(adapter.generateImage('x')).rejects.toThrow('DeepSeekAdapter does not support generateImage().');
      await expect(adapter.analyzeImage('x')).rejects.toThrow('DeepSeekAdapter does not support analyzeImage().');
      await expect(adapter.transcribeAudio(Buffer.from('x'))).rejects.toThrow(
        'DeepSeekAdapter does not support transcribeAudio().'
      );
      await expect(adapter.generateAudio('x')).rejects.toThrow(
        'DeepSeekAdapter does not support generateAudio().'
      );
    });

    test('generateText falls back to empty arguments when tool call JSON is invalid', async () => {
      const adapter = disableRetries(new DeepSeekAdapter('test-key'));
      adapter.openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'fallback',
                  function_call: {
                    name: 'lookup',
                    arguments: '{bad json',
                  },
                },
              }],
            }),
          },
        },
      };

      await expect(adapter.generateText({ user: 'hi' })).resolves.toEqual({
        message: 'fallback',
        toolCalls: [{ name: 'lookup', arguments: {}, id: expect.any(String) }],
      });
    });
  });

  describe('Adapter capability contract', () => {
    test('all adapters expose the normalized capability map', () => {
      const adapters = [
        new OpenAIAdapter('test-key'),
        new GeminiAdapter('test-key'),
        new AnthropicAdapter('test-key'),
        new HFAdapter('test-key'),
        new DeepSeekAdapter('test-key'),
      ];

      for (const adapter of adapters) {
        const capabilities = adapter.getCapabilities();
        expect(capabilities).toEqual(expect.objectContaining({
          generateText: true,
          toolCalling: expect.any(Boolean),
          embeddings: expect.any(Boolean),
          imageAnalysis: expect.any(Boolean),
          imageGeneration: expect.any(Boolean),
          audioTranscription: expect.any(Boolean),
          audioGeneration: expect.any(Boolean),
          videoAnalysis: expect.any(Boolean),
          videoGeneration: expect.any(Boolean),
        }));
      }
    });

    test('unsupported capabilities reject with AdapterCapabilityError consistently', async () => {
      const cases = [
        { adapter: new OpenAIAdapter('test-key'), method: 'generateVideo', args: ['prompt'] },
        { adapter: new AnthropicAdapter('test-key'), method: 'generateImage', args: ['prompt'] },
        { adapter: new AnthropicAdapter('test-key'), method: 'analyzeVideo', args: [Buffer.from('x')] },
        { adapter: new HFAdapter('test-key'), method: 'generateVideo', args: ['prompt'] },
        { adapter: new DeepSeekAdapter('test-key'), method: 'analyzeImage', args: ['prompt'] },
      ];

      for (const testCase of cases) {
        await expect(testCase.adapter[testCase.method](...testCase.args)).rejects.toBeInstanceOf(
          AdapterCapabilityError
        );
      }
    });
  });
});
