const providers = [
  ['openai', 'OpenAI', 'adapter', ['OPENAI_API_KEY', 'OPENAI_TEST_MODEL'], true],
  ['anthropic', 'Anthropic', 'adapter', ['ANTHROPIC_API_KEY', 'ANTHROPIC_TEST_MODEL'], true],
  ['gemini', 'Google Gemini', 'adapter', ['GEMINI_API_KEY', 'GEMINI_TEST_MODEL'], true],
  ['huggingface', 'Hugging Face', 'adapter', ['HUGGINGFACE_API_KEY', 'HUGGINGFACE_TEST_MODEL'], false],
  ['deepseek', 'DeepSeek', 'adapter', ['DEEPSEEK_API_KEY', 'DEEPSEEK_TEST_MODEL'], false],
  ['mistral', 'Mistral', 'adapter', ['MISTRAL_API_KEY', 'MISTRAL_TEST_MODEL'], false],
  ['xai', 'xAI', 'adapter', ['XAI_API_KEY', 'XAI_TEST_MODEL'], false],
  ['elevenlabs', 'ElevenLabs', 'producer', ['ELEVENLABS_API_KEY', 'ELEVENLABS_TEST_MODEL', 'ELEVENLABS_TEST_VOICE_ID'], false],
  ['fal', 'fal.ai', 'job-backend', ['FAL_KEY', 'FAL_TEST_MODEL_PATH', 'FAL_TEST_OPERATION', 'FAL_TEST_INPUT_JSON', 'FAL_TEST_MIME_TYPE'], false],
  ['higgsfield', 'Higgsfield', 'job-backend', ['HIGGSFIELD_API_KEY', 'HIGGSFIELD_TEST_MODEL_PATH', 'HIGGSFIELD_TEST_OPERATION', 'HIGGSFIELD_TEST_INPUT_JSON', 'HIGGSFIELD_TEST_MIME_TYPE'], false],
];

/** A coverage shortlist, not popularity rankings or runtime certification evidence. */
class ProviderCatalog {
  static list() {
    return providers.map(([id, name, integration, requiredEnv, primaryTextSmoke]) => ({
      id, name, integration, requiredEnv: [...requiredEnv], primaryTextSmoke,
      verification: 'live-revalidation-pending',
    }));
  }
  static vectorStores() {
    return [
      { id: 'pinecone', name: 'Pinecone', implementation: 'PineconeVectorStore' },
      { id: 'qdrant', name: 'Qdrant', implementation: 'QdrantVectorStore' },
      { id: 'pgvector', name: 'PostgreSQL / pgvector', implementation: 'PgVectorStore' },
    ].map(target => ({ ...target, verification: 'live-revalidation-pending' }));
  }
}
module.exports = { ProviderCatalog };
