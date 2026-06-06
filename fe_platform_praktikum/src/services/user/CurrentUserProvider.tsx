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
        const storedUser = localStorage.getItem("authUser")

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as User
          setUser(parsedUser)

          const freshUser = await getUserById(parsedUser.id)
          setUser(freshUser)
          localStorage.setItem("authUser", JSON.stringify(freshUser))
          return
        }
      } catch (error) {
        console.error(error)
        localStorage.removeItem("authToken")
        localStorage.removeItem("authUser")
        setUser(null)
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
