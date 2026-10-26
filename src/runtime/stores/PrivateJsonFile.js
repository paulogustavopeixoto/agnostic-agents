const fs = require('fs/promises');
const { constants } = require('fs');
const { randomUUID } = require('crypto');
const path = require('path');

function recordPath(directory, id) {
  if (typeof id !== 'string' || !id || /[\\/\x00]/.test(id) || id === '.' || id === '..') {
    throw new Error('Invalid record ID.');
  }
  return path.join(directory, `${id}.json`);
}

async function readJson(filePath) {
  let handle;
  try {
    handle = await fs.open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    return JSON.parse(await handle.readFile('utf8'));
  } finally {
    if (handle) await handle.close();
  }
}

async function writeJson(filePath, value) {
  const payload = JSON.stringify(value, null, 2);
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(directory, `.record-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await fs.open(temporary, 'wx', 0o600);
    await handle.writeFile(payload, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.rename(temporary, filePath);
  } finally {
    if (handle) await handle.close();
    await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

module.exports = { recordPath, readJson, writeJson };
