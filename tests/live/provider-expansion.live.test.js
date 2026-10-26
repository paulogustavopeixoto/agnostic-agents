require('dotenv').config();
const { MistralAdapter, XAIAdapter, ElevenLabsProducer, ProducerRuntime, FalJobBackend,
  HiggsfieldJobBackend, ProducerJobRunner, FileRunStore } = require('../..');
const { verifyLiveCall } = require('../../scripts/certifyProviders');
const suite = process.env.RUN_LIVE_EXTENDED_TESTS === '1' ? describe : describe.skip;
jest.setTimeout(180000);
const configured = names => names.every(name => process.env[name]?.trim()) ? test : test.skip;

suite('Extended provider live smoke (explicit billable opt-in)', () => {
  for (const [id, Adapter] of [['MISTRAL', MistralAdapter], ['XAI', XAIAdapter]]) {
    configured([`${id}_API_KEY`, `${id}_TEST_MODEL`])(`${id} generates text on an explicit model`, async () => {
      await verifyLiveCall(async () => {
        const adapter = new Adapter(process.env[`${id}_API_KEY`], { model: process.env[`${id}_TEST_MODEL`], timeoutMs: 30000 });
        const response = await adapter.generateText('Reply with the single word hello.', { maxTokens: 30 });
        expect(response.completionStatus).toBe('completed');
        expect(response.message.toLowerCase()).toContain('hello');
      });
    });
  }
  configured(['ELEVENLABS_API_KEY', 'ELEVENLABS_TEST_MODEL', 'ELEVENLABS_TEST_VOICE_ID'])(
    'ElevenLabs produces bounded MP3 bytes through the runtime', async () => {
      await verifyLiveCall(async () => {
        let asset;
        const producer = new ElevenLabsProducer({ apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: process.env.ELEVENLABS_TEST_VOICE_ID, model: process.env.ELEVENLABS_TEST_MODEL,
          saveArtifact: async value => { asset = value; return { artifactId: 'live-memory-audio' }; } });
        const run = await new ProducerRuntime({ producer, authorize: async () => true }).run({
          operation: 'generateAudio', content: [{ type: 'text', text: 'Hello.' }],
        });
        expect(run.status).toBe('completed');
        expect(asset.mimeType).toBe('audio/mpeg');
        expect(asset.data.byteLength).toBeGreaterThan(0);
      });
    });
  for (const [id, Backend, key] of [['FAL', FalJobBackend, 'FAL_KEY'], ['HIGGSFIELD', HiggsfieldJobBackend, 'HIGGSFIELD_API_KEY']]) {
    configured([key, `${id}_TEST_MODEL_PATH`, `${id}_TEST_OPERATION`, `${id}_TEST_INPUT_JSON`, `${id}_TEST_MIME_TYPE`])(
      `${id} submits and polls one host-configured media job`, async () => {
        await verifyLiveCall(async () => {
          const operation = process.env[`${id}_TEST_OPERATION`];
          const input = JSON.parse(process.env[`${id}_TEST_INPUT_JSON`]);
          const references = new Map();
          const backend = new Backend({ apiKey: process.env[key], modelPath: process.env[`${id}_TEST_MODEL_PATH`], operation,
            toInput: () => input,
            toContent: async (result, { jobId }) => {
              const url = operation === 'generateImage' ? result.images?.[0]?.url : result.video?.url;
              if (typeof url !== 'string' || new URL(url).protocol !== 'https:') throw new Error('Missing HTTPS asset reference.');
              references.set(jobId, url);
              // A reference-only test registry, not a durable asset import or CDN test.
              return [{ type: operation === 'generateImage' ? 'image' : 'video', artifactId: jobId,
                mimeType: process.env[`${id}_TEST_MIME_TYPE`] }];
            },
          });
          const runner = new ProducerJobRunner({ backend, runStore: new FileRunStore({ directory: '.agnostic-agents/certification' }),
            authorize: async () => true, maxPolls: 30, pollIntervalMs: 2000, invocationTimeoutMs: 30000 });
          const started = await runner.start({ operation, content: [] });
          if (!started.state.remoteJob.jobId) throw new Error('Submission uncertain; inspect private certification run records.');
          let final;
          try {
            final = await runner.resume(started.id);
            expect(final.status).toBe('completed');
            expect(references.has(started.state.remoteJob.jobId)).toBe(true);
          } finally {
            if (!final || final.status === 'paused') {
              // Best effort only. The saved ID must be reconciled if this fails.
              try { await backend.cancel(started.state.remoteJob.jobId); } catch {}
            }
          }
        });
      });
  }
});
