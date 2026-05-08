import React, { useEffect, useState } from "react"
import { CurrentUserContext } from "./CurrentUserContext"
import { getUserById } from "./service"
import type { User } from "./types"

interface Props {
  children: React.ReactNode
}

export function CurrentUserProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getUserById("mhs-1")
        setUser(userData)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return (
    <CurrentUserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </CurrentUserContext.Provider>
  )
}
