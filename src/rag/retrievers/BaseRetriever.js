class BaseRetriever {
  async search() {
    throw new Error('search must be implemented by subclass');
  }
}

module.exports = { BaseRetriever };
