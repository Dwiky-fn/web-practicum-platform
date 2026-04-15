import { createContext } from "react";
import type { CurrentUser } from "./types";

interface CurrentUserContextType {
  user: CurrentUser | null
  setUser: React.Dispatch<React.SetStateAction<CurrentUser | null>>
  loading: boolean
}

export const CurrentUserContext =
  createContext<CurrentUserContextType | undefined>(undefined);
