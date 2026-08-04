export function formatTahunSemesterDisplay(val?: string | null): string {
  if (!val) return "Tahun Semester"
  let name = val.trim()

  // Remove common ID prefixes like "ay-", "ts-", "ay_", "ts_"
  name = name.replace(/^(ay|ts)[-_]/i, "")

  // If format is 2025-2026-ganjil or 2025-2026-genap, format to 2025/2026 Ganjil
  name = name.replace(/(\d{4})[-_](\d{4})[-_](ganjil|genap)/i, (_, y1, y2, sem) => {
    const semFormatted = sem.charAt(0).toUpperCase() + sem.slice(1).toLowerCase()
    return `${y1}/${y2} ${semFormatted}`
  })

  // Format 2025-2026 to 2025/2026
  name = name.replace(/(\d{4})[-_](\d{4})/i, "$1/$2")

  return name
}
