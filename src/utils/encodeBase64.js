const fs = require('fs');

/**
 * Encodes a file to base64.
 */
function encodeBase64(imagePath) {
  const data = fs.readFileSync(imagePath);
  return data.toString('base64');
}

module.exports = { encodeBase64 };
// Then pass "data:image/png;base64,<base64String>" or something similar