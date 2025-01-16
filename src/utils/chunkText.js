/**
 * Splits text into chunks up to `chunkSize` each, but tries to avoid cutting
 * in the middle of a sentence by looking for punctuation near the boundary.
 *
 * @param {string} text
 * @param {number} chunkSize
 * @param {number} overlap - Overlap in characters
 * @param {number} margin - How many characters at the end of the chunk to search for punctuation
 * @returns {string[]}
 */
function chunkText(
    text,
    chunkSize = 1000,
    overlap = 100,
    margin = 100
  ) {
    const cleanText = text.trim();
    const chunks = [];
    let start = 0;
    const length = cleanText.length;
  
    while (start < length) {
      let end = Math.min(start + chunkSize, length);
  
      // If there's space to search for punctuation near the end:
      const windowStart = Math.max(start, end - margin);
      const windowText = cleanText.slice(windowStart, end);
  
      // Find last occurrence of punctuation in that window
      // (looking for period, question mark, exclamation)
      let cutPoint = -1;
      const punctuationRegex = /[.!?]/g;
  
      let match;
      while ((match = punctuationRegex.exec(windowText)) !== null) {
        cutPoint = match.index; // relative to windowText
      }
  
      if (cutPoint !== -1) {
        // The real cut in the entire text:
        end = windowStart + cutPoint + 1; 
        // +1 to include the punctuation
      }
  
      // Slice out our chunk
      const chunk = cleanText.slice(start, end).trim();
      chunks.push(chunk);
  
      // Move the start forward, minus overlap
      start = end - overlap;
      if (start < 0) {
        start = 0; // avoid negative
      }
      if (start >= length) {
        break;
      }
    }
  
    return chunks;
  }

module.exports = { chunkText };