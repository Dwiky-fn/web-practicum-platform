function removeMarkdownCodeFence(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Output model harus berupa string');
  }

  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function parseJsonResponse(value) {
  const cleaned = removeMarkdownCodeFence(value);

  if (!cleaned) {
    throw new SyntaxError('Output model kosong');
  }

  return JSON.parse(cleaned);
}

module.exports = {
  removeMarkdownCodeFence,
  parseJsonResponse,
};
