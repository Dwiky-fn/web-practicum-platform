import { apiFetch } from "../api"

export const getUserById = async (userId: string) => {
  const res = await apiFetch(`/users/${userId}`)
  return res.data.user
}