const { Configuration, OpenAIApi } = require('openai');

class OpenAIProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.openai = new OpenAIApi(new Configuration({ apiKey }));
  }

  async generate(prompt, options = {}) {
    // Could be text completion or chat completion depending on model
    const model = options.model || "gpt-4o-mini";

    const response = await this.openai.createChatCompletion({
      model,
      messages: [{ role: "user", content: prompt }],
      ...options, // pass additional options if needed
    });

    // Return just the text portion
    return response.data.choices[0].message.content;
  }
}

module.exports = { OpenAIProvider };