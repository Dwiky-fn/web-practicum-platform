export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '-';
  }
  // Convert to string and replace dot with comma
  const str = String(value);
  return str.replace('.', ',');
};

export const formatScore = (score: number | null | undefined): string => {
  if (score === null || score === undefined || isNaN(Number(score))) {
    return '-';
  }
  return `${formatNumber(score)} / 100`;
};

export const formatFinalScore = formatScore;
export const displayScore = formatScore;
