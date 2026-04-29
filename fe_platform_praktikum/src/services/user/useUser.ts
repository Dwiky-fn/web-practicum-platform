import { useEffect, useState } from "react"
import { getUserById } from "./service"
import type { User } from "./types"

export const useUser = (userId?: string) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return

    let isMounted = true

    const fetchUser = async () => {
      try {
        setLoading(true)

        const data = await getUserById(userId)

        if (isMounted) {
          setUser(data)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchUser()

    return () => {
      isMounted = false
    }
  }, [userId])

  return { user, loading }
}