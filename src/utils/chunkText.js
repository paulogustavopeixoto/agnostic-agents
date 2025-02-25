// src/utils/chunkText.js

/**
 * Splits text into chunks.
 *
 * If `numChunks` is provided (and is a positive integer), the function will divide the text into exactly that many chunks.
 * In this case, it computes an ideal chunk length (with the provided overlap) so that the final chunk ends exactly at the end of the text.
 * Otherwise, it uses the traditional iterative approach with fixed chunkSize and overlap.
 *
 * @param {string} text - The text to split.
 * @param {number} [chunkSize=1000] - The size of each chunk (used if numChunks is not provided).
 * @param {number} [overlap=100] - The number of overlapping characters between consecutive chunks (used if numChunks is not provided).
 * @param {number|null} [numChunks=null] - If provided, forces the function to return exactly this number of chunks.
 * @returns {Promise<string[]>} - An array of text chunks.
 */
async function chunkText(text, chunkSize = 1000, overlap = 100, numChunks = null) {
  if (typeof text !== 'string' || !text.trim()) return [""];
  const cleanText = text.trim();

  if (numChunks != null && Number.isInteger(numChunks) && numChunks > 0) {
    const chunks = [];
    const L = cleanText.length;
    const x = (L + (numChunks - 1) * overlap) / numChunks;
    for (let i = 0; i < numChunks; i++) {
      const start = Math.floor(i * (x - overlap));
      let end = (i === numChunks - 1) ? L : Math.floor(start + x);
      chunks.push(cleanText.slice(start, end));
    }
    return chunks;
  } else {
    const chunks = [];
    let start = 0;
    while (start < cleanText.length) {
      const end = Math.min(start + chunkSize, cleanText.length);
      const chunk = cleanText.slice(start, end);
      chunks.push(chunk);
      start += (chunkSize - overlap);
    }
    return chunks.length ? chunks : [cleanText]; // Fallback to full text if no chunks
  }
}

module.exports = { chunkText };