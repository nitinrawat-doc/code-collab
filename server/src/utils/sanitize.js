/**
 * utils/sanitize.js
 * Sanitizes user-generated content to prevent XSS.
 */
const sanitizeHtml = require('sanitize-html');

const sanitizeMessage = (content) => {
  return sanitizeHtml(content, {
    allowedTags: [], // strip ALL html — chat is plain text
    allowedAttributes: {},
  }).trim();
};

module.exports = { sanitizeMessage };
