export const queryString = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") {
      search.set(key, String(value))
    }
  })

  const value = search.toString()
  return value ? `?${value}` : ""
}
