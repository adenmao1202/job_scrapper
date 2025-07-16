const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sanitizeText = (text) => {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
};

module.exports = {
  delay,
  sanitizeText
};