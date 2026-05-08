import { useContext } from "react"
import { CurrentUserContext } from "./CurrentUserContext"

export function useCurrentUser() {
  const context = useContext(CurrentUserContext)

  if (!context) {
    throw new Error("useCurrentUser must be used inside CurrentUserProvider")
  }

  return context
}
