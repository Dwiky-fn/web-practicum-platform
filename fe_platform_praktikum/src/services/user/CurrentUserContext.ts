import { createContext } from "react"
import type { User } from "./types"

interface CurrentUserContextType {
  user: User | null
  setUser: React.Dispatch<React.SetStateAction<User | null>>
  loading: boolean
}

export const CurrentUserContext =
  createContext<CurrentUserContextType | undefined>(undefined)
