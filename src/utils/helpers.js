const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryAsync = async (fn, maxRetries = 3, delayMs = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(delayMs * Math.pow(2, i)); // Exponential backoff
    }
  }
};

const sanitizeText = (text) => {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const extractDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

module.exports = {
  delay,
  retryAsync,
  sanitizeText,
  isValidUrl,
  extractDomain
};