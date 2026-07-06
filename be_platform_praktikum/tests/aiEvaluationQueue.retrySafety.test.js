const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const queuePath = path.join(__dirname, '..', 'src', 'services', 'execution', 'AiEvaluationQueue.js');

test('AI retry tidak mereset review dosen yang sudah ada', () => {
  const source = fs.readFileSync(queuePath, 'utf8');
  const clearPreviousMatch = source.match(/async _clearPreviousAiReview[\s\S]*?\n  }\n/);
  const clearPreviousSource = clearPreviousMatch ? clearPreviousMatch[0] : '';

  assert.match(clearPreviousSource, /ai_score = NULL/);
  assert.match(clearPreviousSource, /ai_feedback = NULL/);
  assert.doesNotMatch(clearPreviousSource, /final_score\s*=\s*NULL/);
  assert.doesNotMatch(clearPreviousSource, /(^|[^_])feedback\s*=\s*NULL/);
  assert.doesNotMatch(clearPreviousSource, /decision\s*=\s*'PENDING'/);

  assert.doesNotMatch(
    source,
    /SET lecturer_id = \$2, ai_score = \$3, final_score = NULL, ai_feedback = \$4, feedback = NULL, decision = 'PENDING'/,
  );
});
