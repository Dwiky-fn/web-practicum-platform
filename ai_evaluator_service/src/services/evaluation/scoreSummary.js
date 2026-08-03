function calculateScoreSummary(rubricScores = []) {
  const totalScoreRecommendation = rubricScores.reduce((total, item) => total + Number(item.score || 0), 0);
  const totalMaxScore = rubricScores.reduce((total, item) => total + Number(item.maxScore || 0), 0);
  const finalGradeRecommendation = totalMaxScore > 0 ? Math.round((totalScoreRecommendation / totalMaxScore) * 100) : 0;
  return {
    totalScoreRecommendation,
    totalMaxScore,
    finalGradeRecommendation: Math.min(100, Math.max(0, finalGradeRecommendation)),
  };
}
module.exports = { calculateScoreSummary };
