import { apiFetch } from "../api"
import { mapUserResponse } from "./mapper"
import type { User } from "./types"

export const getUserById = async (userId: string): Promise<User> => {
  const res = await apiFetch(`/users/${userId}`)

  return mapUserResponse(res.data.user)
}
