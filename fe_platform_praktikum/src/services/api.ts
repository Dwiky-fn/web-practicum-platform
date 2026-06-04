const BASE_URL = "http://localhost:3000"

export const apiFetch = async (endpoint: string, options?: RequestInit) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.message || "API Error")
  }

  return res.json()
}
