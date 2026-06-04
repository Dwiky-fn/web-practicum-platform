import { apiFetch } from "../../api"
import { queryString } from "../query"
import type {
  AdminLecturer,
  AdminStudent,
  CreateLecturerPayload,
  CreateStudentPayload,
  UserRoleTab,
} from "../types"

export const getAdminUsers = async (
  role: UserRoleTab,
  filters: { keyword?: string; semester?: string } = {},
): Promise<Array<AdminStudent | AdminLecturer>> => {
  const res = await apiFetch(`/admin/users${queryString({ role, ...filters })}`)
  return res.data.users
}

export const getAdminUserById = async (
  id: string,
): Promise<AdminStudent | AdminLecturer> => {
  const res = await apiFetch(`/admin/users/${id}`)
  return res.data.user
}

export const createAdminStudent = async (
  payload: CreateStudentPayload,
): Promise<AdminStudent> => {
  const res = await apiFetch("/admin/users/students", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return res.data.user
}

export const createAdminLecturer = async (
  payload: CreateLecturerPayload,
): Promise<AdminLecturer> => {
  const res = await apiFetch("/admin/users/lecturers", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return res.data.user
}
