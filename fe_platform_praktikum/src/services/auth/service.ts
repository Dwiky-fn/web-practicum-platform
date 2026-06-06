import { apiFetch } from "../api"
import { mapUserResponse } from "../user/mapper"
import type { GoogleLoginPayload, LoginPayload, LoginResponse } from "./types"

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

export const loginWithGoogle = async (
  payload: GoogleLoginPayload,
): Promise<LoginResponse> => {
  const res = await apiFetch("/login/google", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  return {
    token: res.data.token,
    user: mapUserResponse(res.data.user),
  }
}

export const requestPasswordResetOtp = async (
  payload: { email: string },
): Promise<void> => {
  await apiFetch("/password-reset/request-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export const resetPasswordWithOtp = async (
  payload: {
    email: string
    otp: string
    newPassword: string
    confirmPassword: string
  },
): Promise<void> => {
  await apiFetch("/password-reset/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
