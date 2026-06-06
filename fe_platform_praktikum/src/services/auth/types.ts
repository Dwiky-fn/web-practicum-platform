import type { User } from "../user/types"

export interface LoginPayload {
  identifier: string
  password: string
}

export type GoogleLoginPayload = {
  credential: string
}

export interface LoginResponse {
  token: string
  user: User
}
