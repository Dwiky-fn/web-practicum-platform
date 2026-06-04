import type { AcademicSemester } from "../../../services/admin/types"

export const getStudentSemesterOptions = (term?: string | null) => {
  if (term?.includes("Genap")) return [2, 4, 6]
  if (term?.includes("Ganjil")) return [1, 3, 5]

  return [1, 2, 3, 4, 5, 6]
}

export const getActiveSemester = (semesters: AcademicSemester[]) =>
  semesters.find((semester) => semester.status === "Aktif")

export const getAcademicYearOptions = (semesters: AcademicSemester[]) => {
  const years = semesters
    .map((semester) => Number(semester.year.split("/")[0]))
    .filter((year) => Number.isFinite(year))

  return Array.from(new Set(years)).sort((a, b) => b - a)
}
