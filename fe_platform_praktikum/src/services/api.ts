const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

let activeFetches = 0
const listeners = new Set<(count: number) => void>()

export const subscribeToFetch = (listener: (count: number) => void) => {
  listeners.add(listener)
  listener(activeFetches)
  return () => {
    listeners.delete(listener)
  }
}

const startFetch = () => {
  activeFetches++
  listeners.forEach((l) => l(activeFetches))
}

const endFetch = () => {
  activeFetches = Math.max(0, activeFetches - 1)
  listeners.forEach((l) => l(activeFetches))
}

function buildApiUrl(endpoint: string) {
  return `${BASE_URL.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`
}

export const apiFetch = async (endpoint: string, options?: RequestInit) => {
  startFetch()
  try {
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

      const err = new Error(data?.message || "API Error")
      if (data?.code) {
        ;(err as any).code = data.code
      }
      throw err
    }

    if (res.status === 204) {
      return null
    }

    return res.json().catch(() => null)
  } finally {
    endFetch()
  }
}
