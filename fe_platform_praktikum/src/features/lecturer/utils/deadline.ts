const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
]

export function dbValueToDatetimeLocal(value?: string | null) {
  if (!value || value === "-") return ""

  return value.trim().replace(" ", "T").slice(0, 16)
}

export function datetimeLocalToDbValue(value?: string | null) {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed

  return normalized.replace("T", " ")
}

export function formatDeadlineLocal(value?: string | null) {
  if (!value || value === "-") return "Belum diatur"

  const normalized = value.trim().replace("T", " ")
  const [datePart, timePart = ""] = normalized.split(" ")
  const [year, month, day] = datePart.split("-")
  const [hour = "00", minute = "00"] = timePart.split(":")
  const monthIndex = Number(month) - 1

  if (!year || !month || !day || monthIndex < 0 || monthIndex >= MONTHS_ID.length) {
    return value
  }

  return `${day} ${MONTHS_ID[monthIndex]} ${year} ${hour}.${minute}`
}
