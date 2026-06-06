import { apiFetch } from "../api"
import { mapUserResponse } from "./mapper"
import type {
  UpdateEmailPayload,
  UpdatePasswordPayload,
  UpdateUserPayload,
  User,
} from "./types"

export const getUserById = async (userId: string): Promise<User> => {
  const res = await apiFetch(`/users/${userId}`)

  return mapUserResponse(res.data.user)
}

export const updateUser = async (
  userId: string,
  payload: UpdateUserPayload,
): Promise<User> => {
  const res = await apiFetch(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

  return mapUserResponse(res.data.user)
}

export const updateUserEmail = async (
  userId: string,
  payload: UpdateEmailPayload,
): Promise<User> => {
  const res = await apiFetch(`/users/${userId}/email`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })

  return mapUserResponse(res.data.user)
}

export const verifyUserPassword = async (
  userId: string,
  currentPassword: string,
): Promise<void> => {
  await apiFetch(`/users/${userId}/verify-password`, {
    method: "POST",
    body: JSON.stringify({ currentPassword }),
  })
}

export const updateUserPassword = async (
  userId: string,
  payload: UpdatePasswordPayload,
): Promise<void> => {
  await apiFetch(`/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export const deactivateUser = async (userId: string): Promise<void> => {
  await apiFetch(`/users/${userId}`, {
    method: "DELETE",
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export const uploadUserAvatar = async (
  userId: string,
  file: File,
): Promise<User> => {
  const image = await readFileAsDataUrl(file)
  const res = await apiFetch(`/users/${userId}/avatar`, {
    method: "POST",
    body: JSON.stringify({ image }),
  })

  return mapUserResponse(res.data.user)
}
