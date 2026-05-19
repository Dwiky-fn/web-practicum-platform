const DAY_IN_MS = 1000 * 60 * 60 * 24

export function parseDeadline(deadline?: string) {
  if (!deadline) return null

  const date = new Date(deadline)

  return Number.isNaN(date.getTime()) ? null : date
}

export function getDeadlineState(deadline?: string, now = new Date()) {
  const date = parseDeadline(deadline)

  if (!date) {
    return {
      date: null,
      isOverdue: false,
      label: "Deadline belum ditentukan",
    }
  }

  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / DAY_IN_MS)

  if (diffMs < 0) {
    return {
      date,
      isOverdue: true,
      label: "Deadline telah lewat",
    }
  }

  if (diffDays <= 1) {
    return {
      date,
      isOverdue: false,
      label: "Deadline hari ini",
    }
  }

  return {
    date,
    isOverdue: false,
    label: `${diffDays} hari lagi`,
  }
}
