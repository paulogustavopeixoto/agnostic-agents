"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  FAL_AI_SUPPORTED_MODEL_IDS: () => FAL_AI_SUPPORTED_MODEL_IDS,
  HfInference: () => HfInference,
  HfInferenceEndpoint: () => HfInferenceEndpoint,
  INFERENCE_PROVIDERS: () => INFERENCE_PROVIDERS,
  InferenceOutputError: () => InferenceOutputError,
  REPLICATE_SUPPORTED_MODEL_IDS: () => REPLICATE_SUPPORTED_MODEL_IDS,
  SAMBANOVA_SUPPORTED_MODEL_IDS: () => SAMBANOVA_SUPPORTED_MODEL_IDS,
  TOGETHER_SUPPORTED_MODEL_IDS: () => TOGETHER_SUPPORTED_MODEL_IDS,
  audioClassification: () => audioClassification,
  audioToAudio: () => audioToAudio,
  automaticSpeechRecognition: () => automaticSpeechRecognition,
  chatCompletion: () => chatCompletion,
  chatCompletionStream: () => chatCompletionStream,
  documentQuestionAnswering: () => documentQuestionAnswering,
  featureExtraction: () => featureExtraction,
  fillMask: () => fillMask,
  imageClassification: () => imageClassification,
  imageSegmentation: () => imageSegmentation,
  imageToImage: () => imageToImage,
  imageToText: () => imageToText,
  objectDetection: () => objectDetection,
  questionAnswering: () => questionAnswering,
  request: () => request,
  sentenceSimilarity: () => sentenceSimilarity,
  streamingRequest: () => streamingRequest,
  summarization: () => summarization,
  tableQuestionAnswering: () => tableQuestionAnswering,
  tabularClassification: () => tabularClassification,
  tabularRegression: () => tabularRegression,
  textClassification: () => textClassification,
  textGeneration: () => textGeneration,
  textGenerationStream: () => textGenerationStream,
  textToImage: () => textToImage,
  textToSpeech: () => textToSpeech,
  tokenClassification: () => tokenClassification,
  translation: () => translation,
  visualQuestionAnswering: () => visualQuestionAnswering,
  zeroShotClassification: () => zeroShotClassification,
  zeroShotImageClassification: () => zeroShotImageClassification
});
module.exports = __toCommonJS(src_exports);

// src/tasks/index.ts
var tasks_exports = {};
__export(tasks_exports, {
  audioClassification: () => audioClassification,
  audioToAudio: () => audioToAudio,
  automaticSpeechRecognition: () => automaticSpeechRecognition,
  chatCompletion: () => chatCompletion,
  chatCompletionStream: () => chatCompletionStream,
  documentQuestionAnswering: () => documentQuestionAnswering,
  featureExtraction: () => featureExtraction,
  fillMask: () => fillMask,
  imageClassification: () => imageClassification,
  imageSegmentation: () => imageSegmentation,
  imageToImage: () => imageToImage,
  imageToText: () => imageToText,
  objectDetection: () => objectDetection,
  questionAnswering: () => questionAnswering,
  request: () => request,
  sentenceSimilarity: () => sentenceSimilarity,
  streamingRequest: () => streamingRequest,
  summarization: () => summarization,
  tableQuestionAnswering: () => tableQuestionAnswering,
  tabularClassification: () => tabularClassification,
  tabularRegression: () => tabularRegression,
  textClassification: () => textClassification,
  textGeneration: () => textGeneration,
  textGenerationStream: () => textGenerationStream,
  textToImage: () => textToImage,
  textToSpeech: () => textToSpeech,
  tokenClassification: () => tokenClassification,
  translation: () => translation,
  visualQuestionAnswering: () => visualQuestionAnswering,
  zeroShotClassification: () => zeroShotClassification,
  zeroShotImageClassification: () => zeroShotImageClassification
});

// src/config.ts
var HF_HUB_URL = "https://huggingface.co";
var HF_INFERENCE_API_URL = "https://api-inference.huggingface.co";

// src/providers/fal-ai.ts
var FAL_AI_API_BASE_URL = "https://fal.run";
var FAL_AI_SUPPORTED_MODEL_IDS = {
  "text-to-image": {
    "black-forest-labs/FLUX.1-schnell": "fal-ai/flux/schnell",
    "black-forest-labs/FLUX.1-dev": "fal-ai/flux/dev"
  },
  "automatic-speech-recognition": {
    "openai/whisper-large-v3": "fal-ai/whisper"
  }
};

// src/providers/replicate.ts
var REPLICATE_API_BASE_URL = "https://api.replicate.com";
var REPLICATE_SUPPORTED_MODEL_IDS = {
  "text-to-image": {
    "black-forest-labs/FLUX.1-schnell": "black-forest-labs/flux-schnell",
    "ByteDance/SDXL-Lightning": "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637"
  }
  // "text-to-speech": {
  // 	"SWivid/F5-TTS": "x-lance/f5-tts:87faf6dd7a692dd82043f662e76369cab126a2cf1937e25a9d41e0b834fd230e"
  // },
};

// src/providers/sambanova.ts
var SAMBANOVA_API_BASE_URL = "https://api.sambanova.ai";
var SAMBANOVA_SUPPORTED_MODEL_IDS = {
  /** Chat completion / conversational */
  conversational: {
    "Qwen/Qwen2.5-Coder-32B-Instruct": "Qwen2.5-Coder-32B-Instruct",
    "Qwen/Qwen2.5-72B-Instruct": "Qwen2.5-72B-Instruct",
    "Qwen/QwQ-32B-Preview": "QwQ-32B-Preview",
    "meta-llama/Llama-3.3-70B-Instruct": "Meta-Llama-3.3-70B-Instruct",
    "meta-llama/Llama-3.2-1B-Instruct": "Meta-Llama-3.2-1B-Instruct",
    "meta-llama/Llama-3.2-3B-Instruct": "Meta-Llama-3.2-3B-Instruct",
    "meta-llama/Llama-3.2-11B-Vision-Instruct": "Llama-3.2-11B-Vision-Instruct",
    "meta-llama/Llama-3.2-90B-Vision-Instruct": "Llama-3.2-90B-Vision-Instruct",
    "meta-llama/Llama-3.1-8B-Instruct": "Meta-Llama-3.1-8B-Instruct",
    "meta-llama/Llama-3.1-70B-Instruct": "Meta-Llama-3.1-70B-Instruct",
    "meta-llama/Llama-3.1-405B-Instruct": "Meta-Llama-3.1-405B-Instruct",
    "meta-llama/Llama-Guard-3-8B": "Meta-Llama-Guard-3-8B"
  }
};

// src/providers/together.ts
var TOGETHER_API_BASE_URL = "https://api.together.xyz";
var TOGETHER_SUPPORTED_MODEL_IDS = {
  "text-to-image": {
    "black-forest-labs/FLUX.1-Canny-dev": "black-forest-labs/FLUX.1-canny",
    "black-forest-labs/FLUX.1-Depth-dev": "black-forest-labs/FLUX.1-depth",
    "black-forest-labs/FLUX.1-dev": "black-forest-labs/FLUX.1-dev",
    "black-forest-labs/FLUX.1-Redux-dev": "black-forest-labs/FLUX.1-redux",
    "black-forest-labs/FLUX.1-schnell": "black-forest-labs/FLUX.1-pro",
    "stabilityai/stable-diffusion-xl-base-1.0": "stabilityai/stable-diffusion-xl-base-1.0"
  },
  conversational: {
    "databricks/dbrx-instruct": "databricks/dbrx-instruct",
    "deepseek-ai/deepseek-llm-67b-chat": "deepseek-ai/deepseek-llm-67b-chat",
    "google/gemma-2-9b-it": "google/gemma-2-9b-it",
    "google/gemma-2b-it": "google/gemma-2-27b-it",
    "llava-hf/llava-v1.6-mistral-7b-hf": "llava-hf/llava-v1.6-mistral-7b-hf",
    "meta-llama/Llama-2-13b-chat-hf": "meta-llama/Llama-2-13b-chat-hf",
    "meta-llama/Llama-2-70b-hf": "meta-llama/Llama-2-70b-hf",
    "meta-llama/Llama-2-7b-chat-hf": "meta-llama/Llama-2-7b-chat-hf",
    "meta-llama/Llama-3.2-11B-Vision-Instruct": "meta-llama/Llama-Vision-Free",
    "meta-llama/Llama-3.2-3B-Instruct": "meta-llama/Llama-3.2-3B-Instruct-Turbo",
    "meta-llama/Llama-3.2-90B-Vision-Instruct": "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
    "meta-llama/Llama-3.3-70B-Instruct": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3-70B-Instruct": "meta-llama/Llama-3-70b-chat-hf",
    "meta-llama/Meta-Llama-3-8B-Instruct": "togethercomputer/Llama-3-8b-chat-hf-int4",
    "meta-llama/Meta-Llama-3.1-405B-Instruct": "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-70B-Instruct": "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-8B-Instruct": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo-128K",
    "microsoft/WizardLM-2-8x22B": "microsoft/WizardLM-2-8x22B",
    "mistralai/Mistral-7B-Instruct-v0.3": "mistralai/Mistral-7B-Instruct-v0.3",
    "mistralai/Mixtral-8x22B-Instruct-v0.1": "mistralai/Mixtral-8x22B-Instruct-v0.1",
    "mistralai/Mixtral-8x7B-Instruct-v0.1": "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO": "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
    "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF": "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF",
    "Qwen/Qwen2-72B-Instruct": "Qwen/Qwen2-72B-Instruct",
    "Qwen/Qwen2.5-72B-Instruct": "Qwen/Qwen2.5-72B-Instruct-Turbo",
    "Qwen/Qwen2.5-7B-Instruct": "Qwen/Qwen2.5-7B-Instruct-Turbo",
    "Qwen/Qwen2.5-Coder-32B-Instruct": "Qwen/Qwen2.5-Coder-32B-Instruct",
    "Qwen/QwQ-32B-Preview": "Qwen/QwQ-32B-Preview",
    "scb10x/llama-3-typhoon-v1.5-8b-instruct": "scb10x/scb10x-llama3-typhoon-v1-5-8b-instruct",
    "scb10x/llama-3-typhoon-v1.5x-70b-instruct-awq": "scb10x/scb10x-llama3-typhoon-v1-5x-4f316"
  },
  "text-generation": {
    "meta-llama/Meta-Llama-3-8B": "meta-llama/Meta-Llama-3-8B",
    "mistralai/Mixtral-8x7B-v0.1": "mistralai/Mixtral-8x7B-v0.1"
  }
};

// src/lib/isUrl.ts
function isUrl(modelOrUrl) {
  return /^http(s?):/.test(modelOrUrl) || modelOrUrl.startsWith("/");
}

// src/lib/makeRequestOptions.ts
var HF_HUB_INFERENCE_PROXY_TEMPLATE = `${HF_HUB_URL}/api/inference-proxy/{{PROVIDER}}`;
var tasks = null;
async function makeRequestOptions(args, options) {
  const { accessToken, endpointUrl, provider: maybeProvider, model: maybeModel, ...otherArgs } = args;
  const provider = maybeProvider ?? "hf-inference";
  const { forceTask, includeCredentials, taskHint, wait_for_model, use_cache, dont_load_model, chatCompletion: chatCompletion2 } = options ?? {};
  if (endpointUrl && provider !== "hf-inference") {
    throw new Error(`Cannot use endpointUrl with a third-party provider.`);
  }
  if (forceTask && provider !== "hf-inference") {
    throw new Error(`Cannot use forceTask with a third-party provider.`);
  }
  if (maybeModel && isUrl(maybeModel)) {
    throw new Error(`Model URLs are no longer supported. Use endpointUrl instead.`);
  }
  let model;
  if (!maybeModel) {
    if (taskHint) {
      model = mapModel({ model: await loadDefaultModel(taskHint), provider, taskHint, chatCompletion: chatCompletion2 });
    } else {
      throw new Error("No model provided, and no default model found for this task");
    }
  } else {
    model = mapModel({ model: maybeModel, provider, taskHint, chatCompletion: chatCompletion2 });
  }
  const authMethod = accessToken ? accessToken.startsWith("hf_") ? "hf-token" : "provider-key" : includeCredentials === "include" ? "credentials-include" : "none";
  const url = endpointUrl ? chatCompletion2 ? endpointUrl + `/v1/chat/completions` : endpointUrl : makeUrl({
    authMethod,
    chatCompletion: chatCompletion2 ?? false,
    forceTask,
    model,
    provider: provider ?? "hf-inference",
    taskHint
  });
  const headers = {};
  if (accessToken) {
    headers["Authorization"] = provider === "fal-ai" && authMethod === "provider-key" ? `Key ${accessToken}` : `Bearer ${accessToken}`;
  }
  const binary = "data" in args && !!args.data;
  if (!binary) {
    headers["Content-Type"] = "application/json";
  }
  if (provider === "hf-inference") {
    if (wait_for_model) {
      headers["X-Wait-For-Model"] = "true";
    }
    if (use_cache === false) {
      headers["X-Use-Cache"] = "false";
    }
    if (dont_load_model) {
      headers["X-Load-Model"] = "0";
    }
  }
  if (provider === "replicate") {
    headers["Prefer"] = "wait";
  }
  let credentials;
  if (typeof includeCredentials === "string") {
    credentials = includeCredentials;
  } else if (includeCredentials === true) {
    credentials = "include";
  }
  if (provider === "replicate" && model.includes(":")) {
    const version = model.split(":")[1];
    otherArgs.version = version;
  }
  const info = {
    headers,
    method: "POST",
    body: binary ? args.data : JSON.stringify({
      ...otherArgs,
      ...chatCompletion2 || provider === "together" ? { model } : void 0
    }),
    ...credentials ? { credentials } : void 0,
    signal: options?.signal
  };
  return { url, info };
}
function mapModel(params) {
  if (params.provider === "hf-inference") {
    return params.model;
  }
  if (!params.taskHint) {
    throw new Error("taskHint must be specified when using a third-party provider");
  }
  const task = params.taskHint === "text-generation" && params.chatCompletion ? "conversational" : params.taskHint;
  const model = (() => {
    switch (params.provider) {
      case "fal-ai":
        return FAL_AI_SUPPORTED_MODEL_IDS[task]?.[params.model];
      case "replicate":
        return REPLICATE_SUPPORTED_MODEL_IDS[task]?.[params.model];
      case "sambanova":
        return SAMBANOVA_SUPPORTED_MODEL_IDS[task]?.[params.model];
      case "together":
        return TOGETHER_SUPPORTED_MODEL_IDS[task]?.[params.model];
    }
  })();
  if (!model) {
    throw new Error(`Model ${params.model} is not supported for task ${task} and provider ${params.provider}`);
  }
  return model;
}
function makeUrl(params) {
  if (params.authMethod === "none" && params.provider !== "hf-inference") {
    throw new Error("Authentication is required when requesting a third-party provider. Please provide accessToken");
  }
  const shouldProxy = params.provider !== "hf-inference" && params.authMethod !== "provider-key";
  switch (params.provider) {
    case "fal-ai": {
      const baseUrl = shouldProxy ? HF_HUB_INFERENCE_PROXY_TEMPLATE.replace("{{PROVIDER}}", params.provider) : FAL_AI_API_BASE_URL;
      return `${baseUrl}/${params.model}`;
    }
    case "replicate": {
      const baseUrl = shouldProxy ? HF_HUB_INFERENCE_PROXY_TEMPLATE.replace("{{PROVIDER}}", params.provider) : REPLICATE_API_BASE_URL;
      if (params.model.includes(":")) {
        return `${baseUrl}/v1/predictions`;
      }
      return `${baseUrl}/v1/models/${params.model}/predictions`;
    }
    case "sambanova": {
      const baseUrl = shouldProxy ? HF_HUB_INFERENCE_PROXY_TEMPLATE.replace("{{PROVIDER}}", params.provider) : SAMBANOVA_API_BASE_URL;
      if (params.taskHint === "text-generation" && params.chatCompletion) {
        return `${baseUrl}/v1/chat/completions`;
      }
      return baseUrl;
    }
    case "together": {
      const baseUrl = shouldProxy ? HF_HUB_INFERENCE_PROXY_TEMPLATE.replace("{{PROVIDER}}", params.provider) : TOGETHER_API_BASE_URL;
      if (params.taskHint === "text-to-image") {
        return `${baseUrl}/v1/images/generations`;
      }
      if (params.taskHint === "text-generation") {
        if (params.chatCompletion) {
          return `${baseUrl}/v1/chat/completions`;
        }
        return `${baseUrl}/v1/completions`;
      }
      return baseUrl;
    }
    default: {
      const url = params.forceTask ? `${HF_INFERENCE_API_URL}/pipeline/${params.forceTask}/${params.model}` : `${HF_INFERENCE_API_URL}/models/${params.model}`;
      if (params.taskHint === "text-generation" && params.chatCompletion) {
        return url + `/v1/chat/completions`;
      }
      return url;
    }
  }
}
async function loadDefaultModel(task) {
  if (!tasks) {
    tasks = await loadTaskInfo();
  }
  const taskInfo = tasks[task];
  if ((taskInfo?.models.length ?? 0) <= 0) {
    throw new Error(`No default model defined for task ${task}, please define the model explicitly.`);
  }
  return taskInfo.models[0].id;
}
async function loadTaskInfo() {
  const res = await fetch(`${HF_HUB_URL}/api/tasks`);
  if (!res.ok) {
    throw new Error("Failed to load tasks definitions from Hugging Face Hub.");
  }
  return await res.json();
}

// src/tasks/custom/request.ts
async function request(args, options) {
  const { url, info } = await makeRequestOptions(args, options);
  const response = await (options?.fetch ?? fetch)(url, info);
  if (options?.retry_on_error !== false && response.status === 503 && !options?.wait_for_model) {
    return request(args, {
      ...options,
      wait_for_model: true
    });
  }
  if (!response.ok) {
    const contentType = response.headers.get("Content-Type");
    if (["application/json", "application/problem+json"].some((ct) => contentType?.startsWith(ct))) {
      const output = await response.json();
      if ([400, 422, 404, 500].includes(response.status) && options?.chatCompletion) {
        throw new Error(
          `Server ${args.model} does not seem to support chat completion. Error: ${JSON.stringify(output.error)}`
        );
      }
      if (output.error || output.detail) {
        throw new Error(JSON.stringify(output.error ?? output.detail));
      } else {
        throw new Error(output);
      }
    }
    const message = contentType?.startsWith("text/plain;") ? await response.text() : void 0;
    throw new Error(message ?? "An error occurred while fetching the blob");
  }
  if (response.headers.get("Content-Type")?.startsWith("application/json")) {
    return await response.json();
  }
  return await response.blob();
}

// src/vendor/fetch-event-source/parse.ts
function getLines(onLine) {
  let buffer;
  let position;
  let fieldLength;
  let discardTrailingNewline = false;
  return function onChunk(arr) {
    if (buffer === void 0) {
      buffer = arr;
      position = 0;
      fieldLength = -1;
    } else {
      buffer = concat(buffer, arr);
    }
    const bufLength = buffer.length;
    let lineStart = 0;
    while (position < bufLength) {
      if (discardTrailingNewline) {
        if (buffer[position] === 10 /* NewLine */) {
          lineStart = ++position;
        }
        discardTrailingNewline = false;
      }
      let lineEnd = -1;
      for (; position < bufLength && lineEnd === -1; ++position) {
        switch (buffer[position]) {
          case 58 /* Colon */:
            if (fieldLength === -1) {
              fieldLength = position - lineStart;
            }
            break;
          case 13 /* CarriageReturn */:
            discardTrailingNewline = true;
          case 10 /* NewLine */:
            lineEnd = position;
            break;
        }
      }
      if (lineEnd === -1) {
        break;
      }
      onLine(buffer.subarray(lineStart, lineEnd), fieldLength);
      lineStart = position;
      fieldLength = -1;
    }
    if (lineStart === bufLength) {
      buffer = void 0;
    } else if (lineStart !== 0) {
      buffer = buffer.subarray(lineStart);
      position -= lineStart;
    }
  };
}
function getMessages(onId, onRetry, onMessage) {
  let message = newMessage();
  const decoder = new TextDecoder();
  return function onLine(line, fieldLength) {
    if (line.length === 0) {
      onMessage?.(message);
      message = newMessage();
    } else if (fieldLength > 0) {
      const field = decoder.decode(line.subarray(0, fieldLength));
      const valueOffset = fieldLength + (line[fieldLength + 1] === 32 /* Space */ ? 2 : 1);
      const value = decoder.decode(line.subarray(valueOffset));
      switch (field) {
        case "data":
          message.data = message.data ? message.data + "\n" + value : value;
          break;
        case "event":
          message.event = value;
          break;
        case "id":
          onId(message.id = value);
          break;
        case "retry":
          const retry = parseInt(value, 10);
          if (!isNaN(retry)) {
            onRetry(message.retry = retry);
          }
          break;
      }
    }
  };
}
function concat(a, b) {
  const res = new Uint8Array(a.length + b.length);
  res.set(a);
  res.set(b, a.length);
  return res;
}
function newMessage() {
  return {
    data: "",
    event: "",
    id: "",
    retry: void 0
  };
}

// src/tasks/custom/streamingRequest.ts
async function* streamingRequest(args, options) {
  const { url, info } = await makeRequestOptions({ ...args, stream: true }, options);
  const response = await (options?.fetch ?? fetch)(url, info);
  if (options?.retry_on_error !== false && response.status === 503 && !options?.wait_for_model) {
    return yield* streamingRequest(args, {
      ...options,
      wait_for_model: true
    });
  }
  if (!response.ok) {
    if (response.headers.get("Content-Type")?.startsWith("application/json")) {
      const output = await response.json();
      if ([400, 422, 404, 500].includes(response.status) && options?.chatCompletion) {
        throw new Error(`Server ${args.model} does not seem to support chat completion. Error: ${output.error}`);
      }
      if (typeof output.error === "string") {
        throw new Error(output.error);
      }
      if (output.error && "message" in output.error && typeof output.error.message === "string") {
        throw new Error(output.error.message);
      }
    }
    throw new Error(`Server response contains error: ${response.status}`);
  }
  if (!response.headers.get("content-type")?.startsWith("text/event-stream")) {
    throw new Error(
      `Server does not support event stream content type, it returned ` + response.headers.get("content-type")
    );
  }
  if (!response.body) {
    return;
  }
  const reader = response.body.getReader();
  let events = [];
  const onEvent = (event) => {
    events.push(event);
  };
  const onChunk = getLines(
    getMessages(
      () => {
      },
      () => {
      },
      onEvent
    )
  );
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      onChunk(value);
      for (const event of events) {
        if (event.data.length > 0) {
          if (event.data === "[DONE]") {
            return;
          }
          const data = JSON.parse(event.data);
          if (typeof data === "object" && data !== null && "error" in data) {
            const errorStr = typeof data.error === "string" ? data.error : typeof data.error === "object" && data.error && "message" in data.error && typeof data.error.message === "string" ? data.error.message : JSON.stringify(data.error);
            throw new Error(`Error forwarded from backend: ` + errorStr);
          }
          yield data;
        }
      }
      events = [];
    }
  } finally {
    reader.releaseLock();
  }
}

// src/lib/InferenceOutputError.ts
var InferenceOutputError = class extends TypeError {
  constructor(message) {
    super(
      `Invalid inference output: ${message}. Use the 'request' method with the same parameters to do a custom call with no type checking.`
    );
    this.name = "InferenceOutputError";
  }
};

// src/tasks/audio/audioClassification.ts
async function audioClassification(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "audio-classification"
  });
  const isValidOutput = Array.isArray(res) && res.every((x) => typeof x.label === "string" && typeof x.score === "number");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<{label: string, score: number}>");
  }
  return res;
}

// src/utils/base64FromBytes.ts
function base64FromBytes(arr) {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(arr).toString("base64");
  } else {
    const bin = [];
    arr.forEach((byte) => {
      bin.push(String.fromCharCode(byte));
    });
    return globalThis.btoa(bin.join(""));
  }
}

// src/tasks/audio/automaticSpeechRecognition.ts
async function automaticSpeechRecognition(args, options) {
  if (args.provider === "fal-ai") {
    const contentType = args.data instanceof Blob ? args.data.type : "audio/mpeg";
    const base64audio = base64FromBytes(
      new Uint8Array(args.data instanceof ArrayBuffer ? args.data : await args.data.arrayBuffer())
    );
    args.audio_url = `data:${contentType};base64,${base64audio}`;
    delete args.data;
  }
  const res = await request(args, {
    ...options,
    taskHint: "automatic-speech-recognition"
  });
  const isValidOutput = typeof res?.text === "string";
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected {text: string}");
  }
  return res;
}

// src/tasks/audio/textToSpeech.ts
async function textToSpeech(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "text-to-speech"
  });
  const isValidOutput = res && res instanceof Blob;
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Blob");
  }
  return res;
}

// src/tasks/audio/audioToAudio.ts
async function audioToAudio(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "audio-to-audio"
  });
  const isValidOutput = Array.isArray(res) && res.every(
    (x) => typeof x.label === "string" && typeof x.blob === "string" && typeof x["content-type"] === "string"
  );
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<{label: string, blob: string, content-type: string}>");
  }
  return res;
}

// src/tasks/cv/imageClassification.ts
async function imageClassification(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "image-classification"
  });
  const isValidOutput = Array.isArray(res) && res.every((x) => typeof x.label === "string" && typeof x.score === "number");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<{label: string, score: number}>");
  }
  return res;
}

// src/tasks/cv/imageSegmentation.ts
async function imageSegmentation(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "image-segmentation"
  });
  const isValidOutput = Array.isArray(res) && res.every((x) => typeof x.label === "string" && typeof x.mask === "string" && typeof x.score === "number");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<{label: string, mask: string, score: number}>");
  }
  return res;
}

// src/tasks/cv/imageToText.ts
async function imageToText(args, options) {
  const res = (await request(args, {
    ...options,
    taskHint: "image-to-text"
  }))?.[0];
  if (typeof res?.generated_text !== "string") {
    throw new InferenceOutputError("Expected {generated_text: string}");
  }
  return res;
}

// src/tasks/cv/objectDetection.ts
async function objectDetection(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "object-detection"
  });
  const isValidOutput = Array.isArray(res) && res.every(
    (x) => typeof x.label === "string" && typeof x.score === "number" && typeof x.box.xmin === "number" && typeof x.box.ymin === "number" && typeof x.box.xmax === "number" && typeof x.box.ymax === "number"
  );
  if (!isValidOutput) {
    throw new InferenceOutputError(
      "Expected Array<{label:string; score:number; box:{xmin:number; ymin:number; xmax:number; ymax:number}}>"
    );
  }
  return res;
}

// src/tasks/cv/textToImage.ts
async function textToImage(args, options) {
  if (args.provider === "together" || args.provider === "fal-ai") {
    args.prompt = args.inputs;
    args.inputs = "";
    args.response_format = "base64";
  } else if (args.provider === "replicate") {
    args.input = { prompt: args.inputs };
    delete args.inputs;
  }
  const res = await request(args, {
    ...options,
    taskHint: "text-to-image"
  });
  if (res && typeof res === "object") {
    if (args.provider === "fal-ai" && "images" in res && Array.isArray(res.images) && res.images[0].url) {
      const image = await fetch(res.images[0].url);
      return await image.blob();
    }
    if ("data" in res && Array.isArray(res.data) && res.data[0].b64_json) {
      const base64Data = res.data[0].b64_json;
      const base64Response = await fetch(`data:image/jpeg;base64,${base64Data}`);
      const blob = await base64Response.blob();
      return blob;
    }
    if ("output" in res && Array.isArray(res.output)) {
      const urlResponse = await fetch(res.output[0]);
      const blob = await urlResponse.blob();
      return blob;
    }
  }
  const isValidOutput = res && res instanceof Blob;
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Blob");
  }
  return res;
}

// src/tasks/cv/imageToImage.ts
async function imageToImage(args, options) {
  let reqArgs;
  if (!args.parameters) {
    reqArgs = {
      accessToken: args.accessToken,
      model: args.model,
      data: args.inputs
    };
  } else {
    reqArgs = {
      ...args,
      inputs: base64FromBytes(
        new Uint8Array(args.inputs instanceof ArrayBuffer ? args.inputs : await args.inputs.arrayBuffer())
      )
    };
  }
  const res = await request(reqArgs, {
    ...options,
    taskHint: "image-to-image"
  });
  const isValidOutput = res && res instanceof Blob;
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Blob");
  }
  return res;
}

// src/tasks/cv/zeroShotImageClassification.ts
async function zeroShotImageClassification(args, options) {
  const reqArgs = {
    ...args,
    inputs: {
      image: base64FromBytes(
        new Uint8Array(
          args.inputs.image instanceof ArrayBuffer ? args.inputs.image : await args.inputs.image.arrayBuffer()
        )
      )
    }
  };
  const res = await request(reqArgs, {
    ...options,
    taskHint: "zero-shot-image-classification"
  });
  const isValidOutput = Array.isArray(res) && res.every((x) => typeof x.label === "string" && typeof x.score === "number");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<{label: string, score: number}>");
  }
  return res;
}

// src/lib/getDefaultTask.ts
var taskCache = /* @__PURE__ */ new Map();
var CACHE_DURATION = 10 * 60 * 1e3;
var MAX_CACHE_ITEMS = 1e3;
async function getDefaultTask(model, accessToken, options) {
  if (isUrl(model)) {
    return null;
  }
  const key = `${model}:${accessToken}`;
  let cachedTask = taskCache.get(key);
  if (cachedTask && cachedTask.date < new Date(Date.now() - CACHE_DURATION)) {
    taskCache.delete(key);
    cachedTask = void 0;
  }
  if (cachedTask === void 0) {
    const modelTask = await (options?.fetch ?? fetch)(`${HF_HUB_URL}/api/models/${model}?expand[]=pipeline_tag`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    }).then((resp) => resp.json()).then((json) => json.pipeline_tag).catch(() => null);
    if (!modelTask) {
      return null;
    }
    cachedTask = { task: modelTask, date: /* @__PURE__ */ new Date() };
    taskCache.set(key, { task: modelTask, date: /* @__PURE__ */ new Date() });
    if (taskCache.size > MAX_CACHE_ITEMS) {
      taskCache.delete(taskCache.keys().next().value);
    }
  }
  return cachedTask.task;
}

// src/tasks/nlp/featureExtraction.ts
async function featureExtraction(args, options) {
  const defaultTask = args.model ? await getDefaultTask(args.model, args.accessToken, options) : void 0;
  const res = await request(args, {
    ...options,
    taskHint: "feature-extraction",
    ...defaultTask === "sentence-similarity" && { forceTask: "feature-extraction" }
  });
  let isValidOutput = true;
  const isNumArrayRec = (arr, maxDepth, curDepth = 0) => {
    if (curDepth > maxDepth)
      return false;
    if (arr.every((x) => Array.isArray(x))) {
      return arr.every((x) => isNumArrayRec(x, maxDepth, curDepth + 1));
    } else {
      return arr.every((x) => typeof x === "number");
    }
  };
  isValidOutput = Array.isArray(res) && isNumArrayRec(res, 3, 0);
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<number[][][] | number[][] | number[] | number>");
  }
  return res;
}

// src/tasks/nlp/fillMask.ts
async function fillMask(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "fill-mask"
  });
  const isValidOutput = Array.isArray(res) && res.every(
    (x) => typeof x.score === "number" && typeof x.sequence === "string" && typeof x.token === "number" && typeof x.token_str === "string"
  );
  if (!isValidOutput) {
    throw new InferenceOutputError(
      "Expected Array<{score: number, sequence: string, token: number, token_str: string}>"
    );
  }
  return res;
}

// src/tasks/nlp/questionAnswering.ts
async function questionAnswering(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "question-answering"
  });
  const isValidOutput = typeof res === "object" && !!res && typeof res.answer === "string" && typeof res.end === "number" && typeof res.score === "number" && typeof res.start === "number";
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected {answer: string, end: number, score: number, start: number}");
  }
  return res;
}

// src/tasks/nlp/sentenceSimilarity.ts
async function sentenceSimilarity(args, options) {
  const defaultTask = args.model ? await getDefaultTask(args.model, args.accessToken, options) : void 0;
  const res = await request(args, {
    ...options,
    taskHint: "sentence-similarity",
    ...defaultTask === "feature-extraction" && { forceTask: "sentence-similarity" }
  });
  const isValidOutput = Array.isArray(res) && res.every((x) => typeof x === "number");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected number[]");
  }
  return res;
}

// src/tasks/nlp/summarization.ts
async function summarization(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "summarization"
  });
  const isValidOutput = Array.isArray(res) && res.every((x) => typeof x?.summary_text === "string");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<{summary_text: string}>");
  }
  return res?.[0];
}

// src/tasks/nlp/tableQuestionAnswering.ts
async function tableQuestionAnswering(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "table-question-answering"
  });
  const isValidOutput = typeof res?.aggregator === "string" && typeof res.answer === "string" && Array.isArray(res.cells) && res.cells.every((x) => typeof x === "string") && Array.isArray(res.coordinates) && res.coordinates.every((coord) => Array.isArray(coord) && coord.every((x) => typeof x === "number"));
  if (!isValidOutput) {
    throw new InferenceOutputError(
      "Expected {aggregator: string, answer: string, cells: string[], coordinates: number[][]}"
    );
  }
  return res;
}

// src/tasks/nlp/textClassification.ts
async function textClassification(args, options) {
  const res = (await request(args, {
    ...options,
    taskHint: "text-classification"
  }))?.[0];
  const isValidOutput = Array.isArray(res) && res.every((x) => typeof x?.label === "string" && typeof x.score === "number");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<{label: string, score: number}>");
  }
  return res;
}

// src/utils/toArray.ts
function toArray(obj) {
  if (Array.isArray(obj)) {
    return obj;
  }
  return [obj];
}

// src/tasks/nlp/textGeneration.ts
async function textGeneration(args, options) {
  if (args.provider === "together") {
    args.prompt = args.inputs;
    const raw = await request(args, {
      ...options,
      taskHint: "text-generation"
    });
    const isValidOutput = typeof raw === "object" && "choices" in raw && Array.isArray(raw?.choices) && typeof raw?.model === "string";
    if (!isValidOutput) {
      throw new InferenceOutputError("Expected ChatCompletionOutput");
    }
    const completion = raw.choices[0];
    return {
      generated_text: completion.text
    };
  } else {
    const res = toArray(
      await request(args, {
        ...options,
        taskHint: "text-generation"
      })
    );
    const isValidOutput = Array.isArray(res) && res.every((x) => "generated_text" in x && typeof x?.generated_text === "string");
    if (!isValidOutput) {
      throw new InferenceOutputError("Expected Array<{generated_text: string}>");
    }
    return res?.[0];
  }
}

// src/tasks/nlp/textGenerationStream.ts
async function* textGenerationStream(args, options) {
  yield* streamingRequest(args, {
    ...options,
    taskHint: "text-generation"
  });
}

// src/tasks/nlp/tokenClassification.ts
async function tokenClassification(args, options) {
  const res = toArray(
    await request(args, {
      ...options,
      taskHint: "token-classification"
    })
  );
  const isValidOutput = Array.isArray(res) && res.every(
    (x) => typeof x.end === "number" && typeof x.entity_group === "string" && typeof x.score === "number" && typeof x.start === "number" && typeof x.word === "string"
  );
  if (!isValidOutput) {
    throw new InferenceOutputError(
      "Expected Array<{end: number, entity_group: string, score: number, start: number, word: string}>"
    );
  }
  return res;
}

// src/tasks/nlp/translation.ts
async function translation(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "translation"
  });
  const isValidOutput = Array.isArray(res) && res.every((x) => typeof x?.translation_text === "string");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected type Array<{translation_text: string}>");
  }
  return res?.length === 1 ? res?.[0] : res;
}

// src/tasks/nlp/zeroShotClassification.ts
async function zeroShotClassification(args, options) {
  const res = toArray(
    await request(args, {
      ...options,
      taskHint: "zero-shot-classification"
    })
  );
  const isValidOutput = Array.isArray(res) && res.every(
    (x) => Array.isArray(x.labels) && x.labels.every((_label) => typeof _label === "string") && Array.isArray(x.scores) && x.scores.every((_score) => typeof _score === "number") && typeof x.sequence === "string"
  );
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<{labels: string[], scores: number[], sequence: string}>");
  }
  return res;
}

// src/tasks/nlp/chatCompletion.ts
async function chatCompletion(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "text-generation",
    chatCompletion: true
  });
  const isValidOutput = typeof res === "object" && Array.isArray(res?.choices) && typeof res?.created === "number" && typeof res?.id === "string" && typeof res?.model === "string" && /// Together.ai does not output a system_fingerprint
  (res.system_fingerprint === void 0 || typeof res.system_fingerprint === "string") && typeof res?.usage === "object";
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected ChatCompletionOutput");
  }
  return res;
}

// src/tasks/nlp/chatCompletionStream.ts
async function* chatCompletionStream(args, options) {
  yield* streamingRequest(args, {
    ...options,
    taskHint: "text-generation",
    chatCompletion: true
  });
}

// src/tasks/multimodal/documentQuestionAnswering.ts
async function documentQuestionAnswering(args, options) {
  const reqArgs = {
    ...args,
    inputs: {
      question: args.inputs.question,
      // convert Blob or ArrayBuffer to base64
      image: base64FromBytes(
        new Uint8Array(
          args.inputs.image instanceof ArrayBuffer ? args.inputs.image : await args.inputs.image.arrayBuffer()
        )
      )
    }
  };
  const res = toArray(
    await request(reqArgs, {
      ...options,
      taskHint: "document-question-answering"
    })
  )?.[0];
  const isValidOutput = typeof res?.answer === "string" && (typeof res.end === "number" || typeof res.end === "undefined") && (typeof res.score === "number" || typeof res.score === "undefined") && (typeof res.start === "number" || typeof res.start === "undefined");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<{answer: string, end?: number, score?: number, start?: number}>");
  }
  return res;
}

// src/tasks/multimodal/visualQuestionAnswering.ts
async function visualQuestionAnswering(args, options) {
  const reqArgs = {
    ...args,
    inputs: {
      question: args.inputs.question,
      // convert Blob or ArrayBuffer to base64
      image: base64FromBytes(
        new Uint8Array(
          args.inputs.image instanceof ArrayBuffer ? args.inputs.image : await args.inputs.image.arrayBuffer()
        )
      )
    }
  };
  const res = (await request(reqArgs, {
    ...options,
    taskHint: "visual-question-answering"
  }))?.[0];
  const isValidOutput = typeof res?.answer === "string" && typeof res.score === "number";
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected Array<{answer: string, score: number}>");
  }
  return res;
}

// src/tasks/tabular/tabularRegression.ts
async function tabularRegression(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "tabular-regression"
  });
  const isValidOutput = Array.isArray(res) && res.every((x) => typeof x === "number");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected number[]");
  }
  return res;
}

// src/tasks/tabular/tabularClassification.ts
async function tabularClassification(args, options) {
  const res = await request(args, {
    ...options,
    taskHint: "tabular-classification"
  });
  const isValidOutput = Array.isArray(res) && res.every((x) => typeof x === "number");
  if (!isValidOutput) {
    throw new InferenceOutputError("Expected number[]");
  }
  return res;
}

// src/HfInference.ts
var HfInference = class {
  accessToken;
  defaultOptions;
  constructor(accessToken = "", defaultOptions = {}) {
    this.accessToken = accessToken;
    this.defaultOptions = defaultOptions;
    for (const [name, fn] of Object.entries(tasks_exports)) {
      Object.defineProperty(this, name, {
        enumerable: false,
        value: (params, options) => (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fn({ ...params, accessToken }, { ...defaultOptions, ...options })
        )
      });
    }
  }
  /**
   * Returns copy of HfInference tied to a specified endpoint.
   */
  endpoint(endpointUrl) {
    return new HfInferenceEndpoint(endpointUrl, this.accessToken, this.defaultOptions);
  }
};
var HfInferenceEndpoint = class {
  constructor(endpointUrl, accessToken = "", defaultOptions = {}) {
    accessToken;
    defaultOptions;
    for (const [name, fn] of Object.entries(tasks_exports)) {
      Object.defineProperty(this, name, {
        enumerable: false,
        value: (params, options) => (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fn({ ...params, accessToken, endpointUrl }, { ...defaultOptions, ...options })
        )
      });
    }
  }
};

// src/types.ts
var INFERENCE_PROVIDERS = ["fal-ai", "replicate", "sambanova", "together", "hf-inference"];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FAL_AI_SUPPORTED_MODEL_IDS,
  HfInference,
  HfInferenceEndpoint,
  INFERENCE_PROVIDERS,
  InferenceOutputError,
  REPLICATE_SUPPORTED_MODEL_IDS,
  SAMBANOVA_SUPPORTED_MODEL_IDS,
  TOGETHER_SUPPORTED_MODEL_IDS,
  audioClassification,
  audioToAudio,
  automaticSpeechRecognition,
  chatCompletion,
  chatCompletionStream,
  documentQuestionAnswering,
  featureExtraction,
  fillMask,
  imageClassification,
  imageSegmentation,
  imageToImage,
  imageToText,
  objectDetection,
  questionAnswering,
  request,
  sentenceSimilarity,
  streamingRequest,
  summarization,
  tableQuestionAnswering,
  tabularClassification,
  tabularRegression,
  textClassification,
  textGeneration,
  textGenerationStream,
  textToImage,
  textToSpeech,
  tokenClassification,
  translation,
  visualQuestionAnswering,
  zeroShotClassification,
  zeroShotImageClassification
});
