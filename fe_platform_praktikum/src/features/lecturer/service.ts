import type { JSONContent } from "@tiptap/react"
import { apiFetch } from "../../services/api"
import { getAdminClassById, getAdminClasses } from "../../services/admin/service"
import type {
  AdminClassDetail,
  AdminStudent,
  AcademicClass,
  ClassJobsheet,
} from "../../services/admin/types"
import { getJobsheetById } from "../../services/jobsheet/service"
import type { Jobsheet } from "../../services/jobsheet/types"
import { getSubmissionByJobsheetId } from "../../services/submission/service"
import type { JobsheetSubmission } from "../../services/submission/types"

export type LecturerClassSummary = AcademicClass & {
  studentCount: number
  jobsheetCount: number
}

export type LecturerCourseGroup = {
  id: string
  name: string
  code: string
  semester: number
  period: string
  classes: LecturerClassSummary[]
}

export type LecturerJobsheetStatus =
  | "Published"
  | "Draft"
  | "Nonaktif"
  | "Arsip"
  | "Selesai"

export type LecturerJobsheetSummary = {
  id: string
  classJobsheetId: string
  courseId: string
  number: number
  title: string
  status: LecturerJobsheetStatus
  deadline: string
  usedIn: string[]
  submitted: number
  total: number
}

export type LecturerSubmissionMatrixItem = {
  student: AdminStudent
  jobsheet: ClassJobsheet
  submission: JobsheetSubmission | null
}

export type LecturerCourseDataset = {
  course: LecturerCourseGroup
  classDetails: AdminClassDetail[]
  jobsheets: LecturerJobsheetSummary[]
}

export type LecturerPracticeInput = {
  id?: string
  title: string
  instructionContent: JSONContent
  templateCode: string
}

export type LecturerTheoryInput = {
  id?: string
  title: string
  content: JSONContent
}

export type LecturerJobsheetPayload = {
  lecturerId: string
  title: string
  description: string
  goal: string
  summary?: JSONContent
  theory: LecturerTheoryInput[]
  experiments: LecturerPracticeInput[]
  exercises: LecturerPracticeInput[]
  task: {
    instructionContent: JSONContent
    additionalNoteContent?: JSONContent
    requireSelfDeclaration: boolean
    conclusionConfig?: {
      enabled: boolean
      required: boolean
      minWord?: number
    }
    experimentItems?: Array<{ id: string; isReported: boolean }>
    exerciseItems?: Array<{ id: string; isReported: boolean }>
  }
}

export type LecturerJobsheetPublishPayload = {
  lecturerId: string
  classes: Array<{
    classId: string
    deadline: string
    isActive: boolean
  }>
}

function buildCourseCode(courseName: string) {
  return courseName
    .split(/\s+/)
    .map((segment) => segment[0] ?? "")
    .join("")
    .slice(0, 4)
    .toUpperCase()
}

function toLecturerJobsheetStatus(status: ClassJobsheet["status"]): LecturerJobsheetStatus {
  if (status === "Aktif") return "Published"
  if (status === "Draft") return "Draft"
  if (status === "Arsip") return "Arsip"
  if (status === "Selesai") return "Selesai"
  return "Nonaktif"
}

export function getSubmissionReviewStatus(submission: JobsheetSubmission | null) {
  if (!submission || submission.status === "DRAFT") return "Belum"
  if (submission.status === "REVISION") return "Revisi"
  if (submission.status === "ACCEPTED") return "Dinilai"
  if (submission.status === "OVERDUE") return "Terlambat"
  return "Terkumpul"
}

export function getSubmissionWorkStatus(submission: JobsheetSubmission | null) {
  if (!submission || submission.status === "DRAFT" || submission.status === "OVERDUE") return "Belum"
  if (submission.status === "ACCEPTED") return "Selesai"
  return "Sedang"
}

export function isSubmittedSubmission(submission: JobsheetSubmission | null) {
  return Boolean(submission && submission.status !== "DRAFT")
}

export async function getLecturerCourseGroups(lecturerId: string): Promise<LecturerCourseGroup[]> {
  const classes = await getAdminClasses()
  const lecturerClasses = classes.filter((item) => item.lecturerId === lecturerId)

  const detailedClasses = await Promise.all(
    lecturerClasses.map(async (classItem) => {
      const detail = await getAdminClassById(classItem.id)

      return {
        ...classItem,
        studentCount: detail.students.length,
        jobsheetCount: detail.jobsheets.length,
      }
    }),
  )

  const grouped = new Map<string, LecturerCourseGroup>()

  for (const classItem of detailedClasses) {
    const current = grouped.get(classItem.courseId)

    if (current) {
      current.classes.push(classItem)
      continue
    }

    grouped.set(classItem.courseId, {
      id: classItem.courseId,
      name: classItem.courseName,
      code: buildCourseCode(classItem.courseName),
      semester: classItem.studentSemester,
      period: classItem.semesterYear,
      classes: [classItem],
    })
  }

  return Array.from(grouped.values())
}

export async function getLecturerCourseGroup(
  lecturerId: string,
  courseId: string,
): Promise<LecturerCourseGroup | null> {
  const groups = await getLecturerCourseGroups(lecturerId)
  return groups.find((group) => group.id === courseId) ?? null
}

export async function getLecturerClassDetail(classId: string): Promise<AdminClassDetail> {
  return getAdminClassById(classId)
}

export async function getLecturerJobsheetById(
  courseId: string,
  jobsheetId: string,
): Promise<Jobsheet> {
  return getJobsheetById(courseId, jobsheetId)
}

export async function getLecturerSubmission(
  courseId: string,
  jobsheetId: string,
  studentId: string,
): Promise<JobsheetSubmission | null> {
  return getSubmissionByJobsheetId(courseId, jobsheetId, studentId)
}

export async function getLecturerSubmissionMatrix(
  courseId: string,
  jobsheets: ClassJobsheet[],
  students: AdminStudent[],
): Promise<LecturerSubmissionMatrixItem[]> {
  const tasks = jobsheets.flatMap((jobsheet) =>
    students.map(async (student) => ({
      student,
      jobsheet,
      submission: await getSubmissionByJobsheetId(courseId, jobsheet.id, student.id),
    })),
  )

  return Promise.all(tasks)
}

export function buildLecturerJobsheetSummaries(
  jobsheets: ClassJobsheet[],
  students: AdminStudent[],
  matrix: LecturerSubmissionMatrixItem[],
  className?: string,
): LecturerJobsheetSummary[] {
  return jobsheets.map((jobsheet, index) => {
    const related = matrix.filter((item) => item.jobsheet.id === jobsheet.id)
    const submitted = related.filter((item) => isSubmittedSubmission(item.submission)).length

    return {
      id: jobsheet.id,
      classJobsheetId: jobsheet.classJobsheetId,
      courseId: "",
      number: index + 1,
      title: jobsheet.title,
      status: toLecturerJobsheetStatus(jobsheet.status),
      deadline: jobsheet.deadline,
      usedIn: className ? [className] : [],
      submitted,
      total: students.length,
    }
  })
}

export async function getLecturerCourseDataset(
  lecturerId: string,
  courseId: string,
): Promise<LecturerCourseDataset | null> {
  const course = await getLecturerCourseGroup(lecturerId, courseId)

  if (!course) return null

  const classDetails = await Promise.all(
    course.classes.map((classItem) => getAdminClassById(classItem.id)),
  )

  const jobsheetMap = new Map<string, LecturerJobsheetSummary>()

  for (const classDetail of classDetails) {
    const matrix = await getLecturerSubmissionMatrix(
      classDetail.courseId,
      classDetail.jobsheets,
      classDetail.students,
    )
    const summaries = buildLecturerJobsheetSummaries(
      classDetail.jobsheets,
      classDetail.students,
      matrix,
      classDetail.name,
    )

    for (const summary of summaries) {
      const current = jobsheetMap.get(summary.id)

      if (current) {
        current.usedIn = Array.from(new Set([...current.usedIn, ...summary.usedIn]))
        current.submitted += summary.submitted
        current.total += summary.total
        continue
      }

      jobsheetMap.set(summary.id, {
        ...summary,
        courseId: classDetail.courseId,
      })
    }
  }

  const jobsheets = Array.from(jobsheetMap.values()).sort((left, right) => left.number - right.number)

  return {
    course,
    classDetails,
    jobsheets,
  }
}

export async function createLecturerJobsheet(
  courseId: string,
  payload: LecturerJobsheetPayload,
) {
  const response = await apiFetch(`/lecturer/courses/${courseId}/jobsheets`, {
    method: "POST",
    body: JSON.stringify(payload),
  })

  return response.data.jobsheet as { id: string }
}

export async function updateLecturerJobsheet(
  courseId: string,
  jobsheetId: string,
  payload: LecturerJobsheetPayload,
) {
  const response = await apiFetch(`/lecturer/courses/${courseId}/jobsheets/${jobsheetId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

  return response.data.jobsheet as { id: string }
}

export async function publishLecturerJobsheet(
  courseId: string,
  jobsheetId: string,
  payload: LecturerJobsheetPublishPayload,
) {
  const response = await apiFetch(`/lecturer/courses/${courseId}/jobsheets/${jobsheetId}/publish`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

  return response.data.jobsheet as { id: string; status: string }
}

export async function saveLecturerSubmissionReview(
  submissionId: string,
  payload: {
    lecturerId: string
    aiScore?: number
    finalScore?: number
    feedback?: string
    decision: "PENDING" | "ACCEPTED" | "REVISION"
    aiFeedback?: {
      comments?: Array<{
        experimentId?: string
        exerciseId?: string
        step?: number
        comment: string
      }>
    }
  },
) {
  const response = await apiFetch(`/lecturer/submissions/${submissionId}/review`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

  return response.data.review
}

export function getStudentReportCount(
  studentId: string,
  matrix: LecturerSubmissionMatrixItem[],
) {
  return matrix.filter(
    (item) => item.student.id === studentId && isSubmittedSubmission(item.submission),
  ).length
}

export function getLatestSubmissionForStudent(
  studentId: string,
  matrix: LecturerSubmissionMatrixItem[],
) {
  return matrix
    .filter((item) => item.student.id === studentId && item.submission)
    .sort((left, right) => {
      const leftTime = new Date(left.submission?.updatedAt ?? 0).getTime()
      const rightTime = new Date(right.submission?.updatedAt ?? 0).getTime()
      return rightTime - leftTime
    })[0] ?? null
}
