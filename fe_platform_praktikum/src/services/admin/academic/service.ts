import { apiFetch } from "../../api"
import { queryString } from "../query"
import type {
  AcademicCourse,
  AcademicSemester,
  CreateCoursePayload,
  CreateSemesterPayload,
} from "../types"

export const getAdminSemesters = async (): Promise<AcademicSemester[]> => {
  const res = await apiFetch("/admin/academic/semesters")
  return res.data.semesters
}

export const createAdminSemester = async (
  payload: CreateSemesterPayload,
): Promise<AcademicSemester> => {
  const res = await apiFetch("/admin/academic/semesters", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return res.data.semester
}

export const activateAdminSemester = async (id: string): Promise<void> => {
  await apiFetch(`/admin/academic/semesters/${id}/activate`, {
    method: "POST",
  })
}

export const getAdminCourses = async (
  filters: { keyword?: string; semester?: string } = {},
): Promise<AcademicCourse[]> => {
  const res = await apiFetch(`/admin/academic/courses${queryString(filters)}`)
  return res.data.courses
}

export const createAdminCourse = async (
  payload: CreateCoursePayload,
): Promise<AcademicCourse> => {
  const res = await apiFetch("/admin/academic/courses", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return res.data.course
}

export const updateAdminCourse = async (
  id: string,
  payload: CreateCoursePayload,
): Promise<AcademicCourse> => {
  const res = await apiFetch(`/admin/academic/courses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return res.data.course
}

export const activateAdminCourse = async (
  id: string,
): Promise<AcademicCourse> => {
  const res = await apiFetch(`/admin/academic/courses/${id}/activate`, {
    method: "POST",
  })
  return res.data.course
}
