const indonesianMonthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function formatDateOnlyForInput(dateValue?: string | null) {
  if (!dateValue) return "";

  return String(dateValue).match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

export function formatDateOnlyIndonesian(dateValue?: string | null) {
  const dateString = formatDateOnlyForInput(dateValue);

  if (!dateString) return "-";

  const [year, month, day] = dateString.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = indonesianMonthNames[monthIndex];
  const dayNumber = Number(day);

  if (!year || !monthName || !Number.isFinite(dayNumber) || dayNumber <= 0) {
    return "-";
  }

  return `${dayNumber} ${monthName} ${year}`;
}
