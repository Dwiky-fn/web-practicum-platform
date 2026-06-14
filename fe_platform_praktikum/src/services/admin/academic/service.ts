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

export const advanceAdminSemester = async (): Promise<{
  previous_semester: { academic_year: string; semester: string; name: string }
  active_semester: AcademicSemester
}> => {
  const res = await apiFetch("/admin/academic/semesters/advance", {
    method: "POST",
  })
  return {
    previous_semester: res.data.previous_semester,
    active_semester: {
      id: res.data.active_semester.id,
      year: res.data.active_semester.academic_year,
      term: res.data.active_semester.semester as "Ganjil" | "Genap",
      status: res.data.active_semester.is_active ? "Aktif" : "Nonaktif",
    },
  }
}

export const activateAdminSemester = async (id: string): Promise<void> => {
  await apiFetch(`/admin/academic/semesters/${id}/activate`, {
    method: "POST",
  })
}

export const deleteAdminSemester = async (id: string): Promise<void> => {
  await apiFetch(`/admin/academic/semesters/${id}`, {
    method: "DELETE",
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

export const deleteAdminCourse = async (id: string): Promise<void> => {
  await apiFetch(`/admin/academic/courses/${id}`, {
    method: "DELETE",
  })
}
