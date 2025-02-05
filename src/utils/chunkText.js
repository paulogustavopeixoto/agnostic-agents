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
  const cleanText = text.trim();

  // If a target number of chunks is provided, split the text into exactly that many chunks.
  if (numChunks != null && Number.isInteger(numChunks) && numChunks > 0) {
    const chunks = [];
    const L = cleanText.length;

    // Calculate the ideal chunk length "x" using the formula:
    // For N chunks with an overlap O between consecutive chunks,
    // the chunks are defined such that: last chunk end = N*x - (N-1)*O = L.
    // Solve for x: x = (L + (N-1)*O) / N.
    const x = (L + (numChunks - 1) * overlap) / numChunks;

    for (let i = 0; i < numChunks; i++) {
      // Determine the starting index:
      // For chunk 0, start is 0.
      // For subsequent chunks, we subtract the overlap to maintain the desired overlap.
      const start = Math.floor(i * (x - overlap));
      // For the last chunk, ensure it ends at the end of the text.
      let end;
      if (i === numChunks - 1) {
        end = L;
      } else {
        end = Math.floor(start + x);
      }
      chunks.push(cleanText.slice(start, end));
    }
    return chunks;
  } else {
    // Original behavior: create chunks of chunkSize with overlap.
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
}

module.exports = { chunkText };