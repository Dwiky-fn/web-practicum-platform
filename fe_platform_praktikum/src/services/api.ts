export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
const BASE_URL = API_BASE_URL

function buildApiUrl(endpoint: string) {
  return `${BASE_URL.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`
}

export const apiFetch = async (endpoint: string, options?: RequestInit) => {
  const token = localStorage.getItem("authToken")
  const headers = new Headers(options?.headers)

  if (!headers.has("Content-Type") && !(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const res = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)

    if (res.status === 401) {
      localStorage.removeItem("authToken")
      localStorage.removeItem("authUser")
      window.dispatchEvent(new Event("auth:logout"))
    }

    const err = new Error(data?.message || "API Error") as Error & { code?: string }
    if (data?.code) {
      err.code = data.code
    }
    throw err
  }

  if (res.status === 204) {
    return null
  }

  return res.json().catch(() => null)
}
