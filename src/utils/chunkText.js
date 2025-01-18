/**
 * Splits text into chunks with overlap.
 * @param {string} text
 * @param {number} chunkSize
 * @param {number} overlap
 * @returns {string[]}
 */
async function chunkText(text, chunkSize = 1000, overlap = 100) {
  const cleanText = text.trim();
  const chunks = [];
  let start = 0;

  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    const chunk = cleanText.slice(start, end);
    chunks.push(chunk);
    start += (chunkSize - overlap);
  }

  return chunks;
}

module.exports = { chunkText };