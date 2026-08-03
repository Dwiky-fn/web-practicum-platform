function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const normalized = String(value || '').trim();
    const key = normalized.toLowerCase();
    if (normalized && !seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  });
  return result;
}
function deduplicateCodeFeedbacks(feedbacks) {
  const seen = new Set();
  return feedbacks.filter((item) => {
    const key = [item.fileId, item.startLine, item.endLine, item.category, item.message.trim().toLowerCase()].join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function addSectionMetadataToCodeFeedbacks(feedbacks, experimentId, step) {
  return feedbacks.map((feedback) => ({ ...feedback, experimentId, step: step || feedback.step }));
}
module.exports = { uniqueStrings, deduplicateCodeFeedbacks, addSectionMetadataToCodeFeedbacks };
