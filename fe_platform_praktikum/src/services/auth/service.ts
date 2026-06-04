import { apiFetch } from "../api"
import { mapUserResponse } from "../user/mapper"
import type { LoginPayload, LoginResponse } from "./types"

export const login = async (
  payload: LoginPayload,
): Promise<LoginResponse> => {
  const res = await apiFetch("/login", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  return {
    token: res.data.token,
    user: mapUserResponse(res.data.user),
  }
}
