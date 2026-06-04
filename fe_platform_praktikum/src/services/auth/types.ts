import type { User } from "../user/types"

export interface LoginPayload {
  identifier: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}
