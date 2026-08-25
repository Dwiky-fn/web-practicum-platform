function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function roundScore(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function normalizeScoreBreakdown(scoreBreakdown) {
  if (!scoreBreakdown) return { items: [] };
  if (typeof scoreBreakdown === 'string') {
    try {
      return normalizeScoreBreakdown(JSON.parse(scoreBreakdown));
    } catch {
      return { items: [] };
    }
  }
  return {
    ...scoreBreakdown,
    items: Array.isArray(scoreBreakdown.items) ? scoreBreakdown.items : [],
  };
}

function buildWeightMap({ theory = [], experiments = [], exercises = [] }) {
  const weights = new Map();

  theory.forEach((item) => {
    weights.set(`theory:${item.id}`, {
      type: 'theory',
      sectionId: item.id,
      title: item.title || 'Dasar Teori',
      weight: roundScore(item.rubric),
    });
  });

  experiments.forEach((item) => {
    weights.set(`experiment:${item.id}`, {
      type: 'experiment',
      sectionId: item.id,
      title: item.title || 'Percobaan',
      weight: roundScore(item.rubric),
    });
  });

  exercises.forEach((item) => {
    weights.set(`exercise:${item.id}`, {
      type: 'exercise',
      sectionId: item.id,
      title: item.title || 'Latihan',
      weight: roundScore(item.rubric),
    });
  });

  return weights;
}

function calculateAutomaticTheoryScore(scoreBreakdown, weightMap) {
  const breakdown = normalizeScoreBreakdown(scoreBreakdown);
  const breakdownTheoryItems = breakdown.items.filter((item) => item.type === 'theory');
  const configuredTheoryItems = Array.from(weightMap.values()).filter((item) => item.type === 'theory');
  const theoryItems = configuredTheoryItems.length
    ? configuredTheoryItems
    : breakdownTheoryItems.map((item) => ({
      type: 'theory',
      sectionId: item.itemId || item.id || 'theory',
      title: item.title || 'Dasar Teori',
      weight: roundScore(item.weight),
    }));
  const byId = new Map(breakdownTheoryItems.map((item) => [String(item.itemId || item.id || 'theory'), item]));

  return theoryItems.map((item) => {
    const source = byId.get(String(item.sectionId));
    const earnedScore = roundScore(Math.min(
      Math.max(toNumber(source?.earnedScore, 0), 0),
      item.weight,
    ));

    return {
      ...item,
      score: earnedScore,
      feedback: 'Nilai Dasar Teori dihitung otomatis dari progres kelengkapan Dasar Teori.',
      source: 'automatic_theory',
    };
  });
}

function normalizeSectionEvaluations(sectionEvaluations = [], weightMap) {
  if (!Array.isArray(sectionEvaluations)) return [];

  return sectionEvaluations
    .filter((item) => item && item.type !== 'theory')
    .map((item) => {
      const type = item.type === 'exercise' ? 'exercise' : 'experiment';
      const sectionId = item.sectionId || item.experimentId || item.exerciseId;
      const key = `${type}:${sectionId}`;
      const weight = weightMap.get(key);

      if (!weight) {
        throw new Error('Bagian yang dinilai tidak ditemukan pada jobsheet.');
      }

      const score = roundScore(item.score);
      if (score < 0 || score > weight.weight) {
        throw new Error(`Nilai ${weight.title} harus berada pada rentang 0-${weight.weight}.`);
      }

      return {
        type,
        sectionId,
        title: weight.title,
        weight: weight.weight,
        score,
        feedback: typeof item.feedback === 'string' ? item.feedback : '',
        aiScore: item.aiScore == null ? (item.score != null ? roundScore(item.score) : null) : roundScore(item.aiScore),
        aiFeedback: typeof item.aiFeedback === 'string' && item.aiFeedback.trim() !== '' ? item.aiFeedback : (typeof item.feedback === 'string' ? item.feedback : ''),
        source: item.source || 'lecturer',
      };
    });
}

function calculateFinalReviewScore({ jobsheetParts, scoreBreakdown, sectionEvaluations }) {
  const weightMap = buildWeightMap(jobsheetParts || {});
  const theoryEvaluations = calculateAutomaticTheoryScore(scoreBreakdown, weightMap);
  theoryEvaluations.forEach((item) => {
    const key = `${item.type}:${item.sectionId}`;
    if (!weightMap.has(key)) weightMap.set(key, item);
  });
  const lecturerEvaluations = normalizeSectionEvaluations(sectionEvaluations, weightMap);

  const covered = new Set([
    ...theoryEvaluations.map((item) => `${item.type}:${item.sectionId}`),
    ...lecturerEvaluations.map((item) => `${item.type}:${item.sectionId}`),
  ]);

  const missingRequired = Array.from(weightMap.values())
    .filter((item) => item.weight > 0 && item.type !== 'theory' && !covered.has(`${item.type}:${item.sectionId}`));

  const totalWeight = roundScore(Array.from(weightMap.values()).reduce((sum, item) => sum + item.weight, 0));
  const finalScore = roundScore([...theoryEvaluations, ...lecturerEvaluations].reduce((sum, item) => sum + item.score, 0));

  if (finalScore < 0 || finalScore > totalWeight) {
    throw new Error('Nilai akhir jobsheet berada di luar total bobot.');
  }

  return {
    finalScore,
    totalWeight,
    theoryScore: roundScore(theoryEvaluations.reduce((sum, item) => sum + item.score, 0)),
    sectionScore: roundScore(lecturerEvaluations.reduce((sum, item) => sum + item.score, 0)),
    evaluations: [...theoryEvaluations, ...lecturerEvaluations],
    missingRequired,
    isComplete: missingRequired.length === 0,
  };
}

module.exports = {
  buildWeightMap,
  calculateAutomaticTheoryScore,
  calculateFinalReviewScore,
  normalizeSectionEvaluations,
};
