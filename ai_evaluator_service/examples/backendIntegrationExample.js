/**
 * Contoh orkestrasi backend utama.
 * File ini bukan mapper final karena struktur database backend belum tersedia.
 */

async function startEvaluationInBackground(submission) {
  setImmediate(async () => {
    try {
      const experimentResults = [];

      for (const experiment of submission.experiments) {
        try {
          const result = await requestAiEvaluation({
            scope: 'experiment',
            submissionId: submission.id,
            jobsheet: submission.jobsheet,
            experiment,
            rubric: submission.rubric,
          });

          experimentResults.push({
            experimentId: experiment.id,
            title: experiment.title,
            summary: result.experimentFeedback.summary,
            strengths: result.experimentFeedback.strengths,
            issues: result.experimentFeedback.issues,
            suggestions: result.experimentFeedback.suggestions,
            rubricScores: result.rubricScores,
          });

          // TODO: simpan result sebagai draft AI pada database backend utama.
        } catch (error) {
          // TODO: tandai percobaan gagal tanpa menghapus hasil lain.
          console.error(`Evaluasi ${experiment.id} gagal:`, error.message);
        }
      }

      if (experimentResults.length > 0) {
        const jobsheetResult = await requestAiEvaluation({
          scope: 'jobsheet',
          submissionId: submission.id,
          jobsheet: submission.jobsheet,
          experimentResults,
          studentConclusion: submission.studentConclusion || '',
          rubric: submission.rubric,
        });

        // TODO: simpan jobsheetResult sebagai draft AI.
        void jobsheetResult;
      }
    } catch (error) {
      // TODO: ubah status job menjadi failed atau partially_failed.
      console.error('Background evaluation failed:', error.message);
    }
  });
}

async function requestAiEvaluation(payload) {
  const baseUrl = process.env.AI_EVALUATOR_BASE_URL || 'http://localhost:5000';
  const response = await fetch(`${baseUrl}/api/evaluations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.message || 'AI evaluator gagal');
  }

  return body.data;
}

module.exports = {
  startEvaluationInBackground,
  requestAiEvaluation,
};
