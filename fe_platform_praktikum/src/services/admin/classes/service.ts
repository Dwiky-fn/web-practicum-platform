import { apiFetch } from "../../api"
import { queryString } from "../query"
import type {
  AcademicClass,
  AdminClassDetail,
  AdminStudent,
  CreateClassPayload,
  UpdateClassPayload,
} from "../types"

export const getAdminClasses = async (
  filters: { keyword?: string; status?: string; courseId?: string } = {},
): Promise<AcademicClass[]> => {
  const res = await apiFetch(`/admin/academic/classes${queryString(filters)}`)
  return res.data.classes
}

export const createAdminClass = async (
  payload: CreateClassPayload,
): Promise<AcademicClass> => {
  const res = await apiFetch("/admin/academic/classes", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return res.data.class
}

export const getAdminClassById = async (
  id: string,
): Promise<AdminClassDetail> => {
  const res = await apiFetch(`/admin/classes/${id}`)
  return res.data.class
}

export const updateAdminClass = async (
  id: string,
  payload: UpdateClassPayload,
): Promise<AdminClassDetail> => {
  const res = await apiFetch(`/admin/classes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return res.data.class
}

export const getAdminStudentCandidates = async (
  classId: string,
  filters: { keyword?: string; semester?: string } = {},
): Promise<AdminStudent[]> => {
  const res = await apiFetch(`/admin/classes/${classId}/student-candidates${queryString(filters)}`)
  return res.data.students
}

export const assignAdminStudentsToClass = async (
  classId: string,
  studentIds: string[],
): Promise<AdminStudent[]> => {
  const res = await apiFetch(`/admin/classes/${classId}/students`, {
    method: "POST",
    body: JSON.stringify({ studentIds }),
  })
  return res.data.students
}

export const deleteAdminClass = async (id: string): Promise<void> => {
  await apiFetch(`/admin/classes/${id}`, {
    method: "DELETE",
  })
}
