// src/utils/encodeBase64.js
const fs = require('fs');

/**
 * Encodes a file to base64.
 */
async function encodeBase64(imagePath) {
  const data = fs.readFileSync(imagePath);
  return data.toString('base64');
}

module.exports = { encodeBase64 };