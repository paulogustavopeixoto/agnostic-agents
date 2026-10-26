const { FileVectorStore } = require('../..');
const fs = require('fs/promises');
const stage = process.argv[3] || 'after';
if (stage === 'temporary') fs.rename = async () => {
  process.send({ stage: 'temporary' });
  await new Promise(() => {});
};
class CrashWorkerStore extends FileVectorStore {
  async _save(store) {
    if (stage === 'before') {
      process.send({ stage: 'before' });
      await new Promise(() => {});
    }
    await super._save(store);
    process.send({ stage: 'committed' });
    await new Promise(() => {});
  }
}
new CrashWorkerStore({ filePath: process.argv[2] }).upsert({ namespace: 'tenant',
  vectors: [{ id: 'one', values: [1, 0], metadata: { text: 'committed' } }] })
  .catch(() => process.exit(1));
