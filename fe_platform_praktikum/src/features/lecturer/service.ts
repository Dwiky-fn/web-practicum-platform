import type { JSONContent } from "@tiptap/react"
import { apiFetch } from "../../services/api"
import { mapSubmission } from "../../services/submission/mapper"
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
import type { ScoreBreakdown } from "../../services/progress/types"

export type LecturerClassSummary = AcademicClass & {
  studentCount: number
  jobsheetCount: number
}

export type LecturerCourseGroup = {
  id: string
  mataKuliahId?: string
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

export type LecturerJobsheetSummaryClassSetting = {
  classId: string
  kelasPraktikumId?: string
  className: string
  isActive: boolean
  deadline: string
}

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
  classSettings: LecturerJobsheetSummaryClassSetting[]
}

type LecturerCourseJobsheetResponse = {
  id: string
  title?: string
  status?: string
  deadline?: string
}

export type LecturerSubmissionMatrixItem = {
  student: AdminStudent
  jobsheet: ClassJobsheet
  submission: JobsheetSubmission | null
}

export type LecturerEvaluationItem = {
  student: Pick<AdminStudent, "id" | "nim" | "fullname" | "email">
  submission: JobsheetSubmission | null
}

export type LecturerCourseDataset = {
  course: LecturerCourseGroup
  classDetails: AdminClassDetail[]
  jobsheets: LecturerJobsheetSummary[]
}

function compareAlphaNumeric(left: string, right: string) {
  return left.localeCompare(right, "id-ID", { numeric: true, sensitivity: "base" })
}

function sortClassSummaries<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) => compareAlphaNumeric(left.name, right.name))
}

function sortCourseGroups(items: LecturerCourseGroup[]) {
  return [...items].sort((left, right) => {
    if (left.semester !== right.semester) return left.semester - right.semester
    return compareAlphaNumeric(left.name, right.name)
  })
}

export type LecturerPracticeInput = {
  id?: string
  title: string
  instructionContent: JSONContent
  templateCode: string
  rubric?: number
}

export type LecturerTheoryInput = {
  id?: string
  title: string
  content: JSONContent
  rubric?: number
}

export type LecturerJobsheetPayload = {
  lecturerId?: string
  title: string
  description: string
  goal: string
  status?: string
  summary?: JSONContent
  theory: LecturerTheoryInput[]
  experiments: LecturerPracticeInput[]
  exercises: LecturerPracticeInput[]
  programmingLanguage: string
  editorMode: string
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
  lecturerId?: string
  classes: Array<{
    // classId is a compatibility alias for kelasPraktikumId.
    classId?: string
    kelasPraktikumId?: string
    deadline: string | null
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

function getClassMataKuliahId(classItem: Pick<AcademicClass, "courseId" | "mataKuliahId" | "id_mata_kuliah">) {
  // courseId is a compatibility alias for mataKuliahId.
  return classItem.mataKuliahId || classItem.id_mata_kuliah || classItem.courseId
}

function getClassKelasPraktikumId(classItem: Pick<AcademicClass, "kelasPraktikumId" | "id_kelas_praktikum">) {
  return classItem.kelasPraktikumId || classItem.id_kelas_praktikum
}

function buildLecturerJobsheetPath(courseId: string, scope?: { mataKuliahId?: string; kelasPraktikumId?: string }) {
  if (scope?.kelasPraktikumId) return `/lecturer/kelas-praktikum/${scope.kelasPraktikumId}/jobsheets`
  if (scope?.mataKuliahId) return `/lecturer/mata-kuliah/${scope.mataKuliahId}/jobsheets`
  return `/lecturer/mata-kuliah/${courseId}/jobsheets`
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
  if (submission.submissionSource === "auto_deadline" || submission.isAutoSubmitted) return "Otomatis"
  if (submission.status === "REVISION") return "Revisi"
  if (submission.status === "ACCEPTED") return "Dinilai"
  if (submission.status === "OVERDUE") return "Terlambat"
  return "Terkumpul"
}

export function formatAttemptLabel(submission: Pick<JobsheetSubmission, "attemptType" | "attemptNo" | "attemptLabel"> | null | undefined) {
  if (!submission || submission.attemptType === "normal") return "Pengerjaan Normal"
  const remedialNumber = Math.max(1, Number(submission.attemptNo || 2) - 1)
  return `Remedial ${remedialNumber}`
}

export function getSubmissionWorkStatus(submission: JobsheetSubmission | null) {
  if (!submission || submission.status === "DRAFT" || submission.status === "OVERDUE") return "Belum"
  if (submission.status === "ACCEPTED") return "Selesai"
  return "Sedang"
}

export function isSubmittedSubmission(submission: JobsheetSubmission | null) {
  return Boolean(submission && submission.status !== "DRAFT")
}

export async function getLecturerCourseGroups(): Promise<LecturerCourseGroup[]> {
  const response = await apiFetch("/lecturer/kelas-praktikum")
  const lecturerClasses = response.data.classes as AcademicClass[]

  const detailedClasses = await Promise.all(
    lecturerClasses.map(async (classItem) => {
      const detail = await getLecturerClassDetail(classItem.id)

      return {
        ...classItem,
        studentCount: detail.students.length,
        jobsheetCount: detail.jobsheets.length,
      }
    }),
  )

  const grouped = new Map<string, LecturerCourseGroup>()

  for (const classItem of detailedClasses) {
    const groupId = getClassMataKuliahId(classItem)
    const current = grouped.get(groupId)

    if (current) {
      current.classes.push(classItem)
      continue
    }

    grouped.set(groupId, {
      id: groupId,
      mataKuliahId: groupId !== classItem.courseId ? groupId : classItem.mataKuliahId || classItem.id_mata_kuliah,
      name: classItem.courseName,
      code: buildCourseCode(classItem.courseName),
      semester: classItem.studentSemester,
      period: classItem.semesterYear,
      classes: [classItem],
    })
  }

  return sortCourseGroups(
    Array.from(grouped.values()).map((group) => ({
      ...group,
      classes: sortClassSummaries(group.classes),
    })),
  )
}

export async function getLecturerCourseGroup(
  _lecturerId: string,
  courseId: string,
): Promise<LecturerCourseGroup | null> {
  const groups = await getLecturerCourseGroups()
  return groups.find((group) => group.id === courseId) ?? null
}

export async function getLecturerClassDetail(classId: string): Promise<AdminClassDetail> {
  const response = await apiFetch(`/lecturer/kelas-praktikum/${classId}`)
  return response.data.class
}

export async function getLecturerJobsheetById(
  courseId: string,
  jobsheetId: string,
  scope?: { mataKuliahId?: string; kelasPraktikumId?: string },
): Promise<Jobsheet> {
  return getJobsheetById(courseId, jobsheetId, scope)
}

export async function getLecturerSubmission(
  courseId: string,
  jobsheetId: string,
  studentId: string,
  scope?: { mataKuliahId?: string; kelasPraktikumId?: string; submissionId?: string; attemptNo?: number; attemptType?: "normal" | "remedial"; remedialId?: string | null },
): Promise<JobsheetSubmission | null> {
  return getSubmissionByJobsheetId(courseId, jobsheetId, studentId, scope)
}

export async function getLecturerSubmissionMatrix(
  courseId: string,
  jobsheets: ClassJobsheet[],
  students: AdminStudent[],
  scope?: { mataKuliahId?: string; kelasPraktikumId?: string },
): Promise<LecturerSubmissionMatrixItem[]> {
  const tasks = jobsheets.flatMap((jobsheet) =>
    students.map(async (student) => ({
      student,
      jobsheet,
      submission: await getSubmissionByJobsheetId(courseId, jobsheet.id, student.id, {
        mataKuliahId: scope?.mataKuliahId || jobsheet.mataKuliahId || jobsheet.id_mata_kuliah,
        kelasPraktikumId: scope?.kelasPraktikumId || jobsheet.kelasPraktikumId || jobsheet.id_kelas_praktikum,
      }),
    })),
  )

  return Promise.all(tasks)
}

export async function getLecturerEvaluationSubmissions(
  jobsheetId: string,
  kelasPraktikumId: string,
): Promise<LecturerEvaluationItem[]> {
  const params = new URLSearchParams({ kelasPraktikumId })
  const response = await apiFetch(`/lecturer/jobsheets/${jobsheetId}/evaluation-submissions?${params.toString()}`)
  const items = (response.data.items ?? []) as Array<{
    student: LecturerEvaluationItem["student"]
    submission: Parameters<typeof mapSubmission>[0] | null
  }>

  return items.map((item) => ({
    student: item.student,
    submission: item.submission ? mapSubmission(item.submission) : null,
  }))
}

export function buildLecturerJobsheetSummaries(
  jobsheets: ClassJobsheet[],
  students: AdminStudent[],
  matrix: LecturerSubmissionMatrixItem[],
  className?: string,
  classId?: string,
  kelasPraktikumId?: string,
): LecturerJobsheetSummary[] {
  return jobsheets.map((jobsheet, index) => {
    const related = matrix.filter((item) => item.jobsheet.id === jobsheet.id)
    const submitted = related.filter((item) => isSubmittedSubmission(item.submission)).length

    const isActive = jobsheet.status === "Aktif"
    const deadlineVal = jobsheet.deadline && jobsheet.deadline !== "-" ? jobsheet.deadline : ""

    const setting: LecturerJobsheetSummaryClassSetting = {
      classId: classId || "",
      kelasPraktikumId,
      className: className || "",
      isActive,
      deadline: deadlineVal,
    }

    return {
      id: jobsheet.id,
      classJobsheetId: jobsheet.classJobsheetId,
      courseId: "",
      number: index + 1,
      title: jobsheet.title,
      status: toLecturerJobsheetStatus(jobsheet.status),
      deadline: jobsheet.deadline,
      usedIn: className && isActive ? [className] : [],
      submitted,
      total: students.length,
      classSettings: [setting],
    }
  })
}

export async function getLecturerCourseDataset(
  lecturerId: string,
  courseId: string,
): Promise<LecturerCourseDataset | null> {
  const course = await getLecturerCourseGroup(lecturerId, courseId)

  if (!course) return null

  const [classDetails, courseJobsheetsRes] = await Promise.all([
    Promise.all(course.classes.map((classItem) => getLecturerClassDetail(classItem.id))),
    apiFetch(`/mata-kuliah/${course.mataKuliahId || course.id}/jobsheets`).catch(() =>
      apiFetch(`/mata-kuliah/${courseId}/jobsheets`),
    ),
  ])

  const courseJobsheets = (courseJobsheetsRes.data?.jobsheets ?? []) as LecturerCourseJobsheetResponse[]
  const jobsheetMap = new Map<string, LecturerJobsheetSummary>()

  courseJobsheets.forEach((jobsheet, index) => {
    let status: LecturerJobsheetStatus = "Draft"
    if (jobsheet.status === "PUBLISHED") {
      status = "Published"
    } else if (jobsheet.status === "UNPUBLISHED") {
      status = "Nonaktif"
    }

    jobsheetMap.set(jobsheet.id, {
      id: jobsheet.id,
      classJobsheetId: "",
      courseId: courseId,
      number: index + 1,
      title: jobsheet.title?.trim() || "Draft Tanpa Judul",
      status: status,
      deadline: jobsheet.deadline && jobsheet.deadline !== "-" ? jobsheet.deadline : "",
      usedIn: [],
      submitted: 0,
      total: 0,
      classSettings: [],
    })
  })

  for (const classDetail of classDetails) {
    const matrix = await getLecturerSubmissionMatrix(
      classDetail.courseId,
      classDetail.jobsheets,
      classDetail.students,
      {
        mataKuliahId: getClassMataKuliahId(classDetail),
        kelasPraktikumId: getClassKelasPraktikumId(classDetail),
      },
    )
    const summaries = buildLecturerJobsheetSummaries(
      classDetail.jobsheets,
      classDetail.students,
      matrix,
      classDetail.name,
      classDetail.id,
      getClassKelasPraktikumId(classDetail),
    )

    for (const summary of summaries) {
      const current = jobsheetMap.get(summary.id)

      if (current) {
        current.classSettings = [...current.classSettings, ...summary.classSettings]
        current.usedIn = Array.from(new Set([...current.usedIn, ...summary.usedIn]))
        current.submitted += summary.submitted
        current.total += summary.total
        if (!current.classJobsheetId) {
          current.classJobsheetId = summary.classJobsheetId
        }
        if (summary.status === "Published") {
          current.status = "Published"
        } else if (current.status !== "Published") {
          current.status = summary.status
        }
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
    classDetails: [...classDetails].sort((left, right) => compareAlphaNumeric(left.name, right.name)),
    jobsheets,
  }
}

export async function createLecturerJobsheet(
  courseId: string,
  payload: LecturerJobsheetPayload,
  scope?: { mataKuliahId?: string; kelasPraktikumId?: string },
) {
  const response = await apiFetch(buildLecturerJobsheetPath(courseId, scope), {
    method: "POST",
    body: JSON.stringify(payload),
  })

  return response.data.jobsheet as { id: string }
}

export async function updateLecturerJobsheet(
  courseId: string,
  jobsheetId: string,
  payload: LecturerJobsheetPayload,
  scope?: { mataKuliahId?: string; kelasPraktikumId?: string },
) {
  const response = await apiFetch(`${buildLecturerJobsheetPath(courseId, scope)}/${jobsheetId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

  return response.data.jobsheet as { id: string }
}

export async function publishLecturerJobsheet(
  courseId: string,
  jobsheetId: string,
  payload: LecturerJobsheetPublishPayload,
  scope?: { mataKuliahId?: string },
) {
  const response = await apiFetch(`${buildLecturerJobsheetPath(courseId, scope)}/${jobsheetId}/publish`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

  return response.data.jobsheet as { id: string; status: string }
}

export async function deleteLecturerJobsheet(
  courseId: string,
  jobsheetId: string,
  scope?: { mataKuliahId?: string; kelasPraktikumId?: string },
) {
  const response = await apiFetch(`${buildLecturerJobsheetPath(courseId, scope)}/${jobsheetId}`, {
    method: "DELETE",
  })

  return response.data.jobsheet as { id: string }
}

export async function saveLecturerSubmissionReview(
  submissionId: string,
  payload: {
    lecturerId: string
    aiScore?: number
    finalScore?: number
    feedback?: string
    decision: "PENDING" | "ACCEPTED" | "REVISION"
    aiFeedback?: unknown
  },
) {
  const response = await apiFetch(`/lecturer/submissions/${submissionId}/review`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

  return response.data.review
}

export async function triggerAiReview(submissionId: string): Promise<unknown> {
  const response = await apiFetch(`/lecturer/submissions/${submissionId}/trigger-ai`, {
    method: "POST",
  })
  return response.data
}

export async function retryAiReview(submissionId: string): Promise<unknown> {
  const response = await apiFetch(`/lecturer/submissions/${submissionId}/ai-review/retry`, {
    method: "POST",
  })
  return response.data
}

export async function deleteAiFeedback(submissionId: string): Promise<unknown> {
  const response = await apiFetch(`/lecturer/submissions/${submissionId}/ai-feedback`, {
    method: "DELETE",
  })
  return response.data
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

export interface LecturerClassProgressSummary {
  totalStudents: number
  notStartedCount: number
  inProgressCount: number
  overdueCount?: number
  stalledCount: number
  completedCount: number
}

export interface LecturerClassProgressStudent {
  student_id: string
  fullname: string
  nim: string
  avatar_url?: string
  current_experiment_id?: string | null
  current_instruction_id?: string | null
  completed_steps: number
  total_steps: number
  progress_percentage: number
  first_opened_at?: string | null
  last_activity_at?: string | null
  completed_at?: string | null
  status: "not_started" | "in_progress" | "overdue" | "stalled" | "completed"
  monitoring_status?: "not_started" | "in_progress" | "overdue" | "completed"
  monitoring_label?: string
  submission_label?: string | null
  current_position_title: string
  progress_score?: number
  score_breakdown?: ScoreBreakdown | null
  submission_id?: string | null
  submission_status?: string | null
  submission_source?: "manual" | "auto_deadline" | "remedial" | null
  is_auto_submitted?: boolean
  auto_submitted_at?: string | null
  submitted_at?: string | null
}

export interface LecturerClassProgressResponse {
  summary: LecturerClassProgressSummary
  students: LecturerClassProgressStudent[]
}

export interface LecturerStudentActivityLog {
  experiment_id?: string | null
  instruction_id?: string | null
  activity_type: string
  metadata?: Record<string, unknown>
  created_at: string
  description: string
}

export interface LecturerStudentDetailProgressResponse {
  student: {
    fullname: string
    email: string
    nim: string
    avatar_url?: string
  }
  progress: {
    completed_steps: number
    total_steps: number
    progress_percentage: number
    first_opened_at?: string | null
    last_activity_at?: string | null
    completed_at?: string | null
    status: "not_started" | "in_progress" | "overdue" | "stalled" | "completed"
  }
  progressScore?: ScoreBreakdown
  logs: LecturerStudentActivityLog[]
}

export async function getLecturerClassProgress(
  jobsheetId: string,
  classId: string,
  kelasPraktikumId?: string,
): Promise<LecturerClassProgressResponse> {
  // `classId` is an old route-level name; in the native flow it is the kelasPraktikumId.
  const params = new URLSearchParams({ kelasPraktikumId: kelasPraktikumId || classId })
  const response = await apiFetch(
    `/lecturer/jobsheets/${jobsheetId}/progress?${params.toString()}`,
  )
  return response.data
}

export async function getLecturerStudentDetailProgress(
  jobsheetId: string,
  studentId: string,
  classId: string,
  kelasPraktikumId?: string,
): Promise<LecturerStudentDetailProgressResponse> {
  // `classId` is an old route-level name; in the native flow it is the kelasPraktikumId.
  const params = new URLSearchParams({ kelasPraktikumId: kelasPraktikumId || classId })
  const response = await apiFetch(
    `/lecturer/jobsheets/${jobsheetId}/progress/${studentId}?${params.toString()}`,
  )
  return response.data
}

export interface LecturerRemedialSession {
  id: string
  jobsheet_id: string
  id_kelas_praktikum: string
  title: string
  description?: string
  start_at: string
  end_at: string
  startAt: string
  endAt: string
  status: "draft" | "open" | "closed" | "cancelled"
  created_by: string
  created_at: string
  updated_at: string
  createdAt?: string
  updatedAt?: string
  nama_kelas?: string
  participant_count?: number
  participantCount?: number
}

export interface LecturerRemedialStudent {
  id: string
  remedial_id: string
  student_id: string
  fullname: string
  nim?: string
  status: "assigned" | "in_progress" | "submitted" | "reviewed"
  assigned_at: string
  attempt_no?: number
  submission_id?: string
  final_score?: number | null
}

export async function createLecturerRemedial(
  jobsheetId: string,
  payload: {
    kelasPraktikumId: string
    title: string
    description?: string
    startAt: string
    endAt: string
    studentIds: string[]
  }
) {
  const response = await apiFetch(`/lecturer/jobsheets/${jobsheetId}/remedials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return response.data as { remedialId: string }
}

export async function getLecturerRemedials(
  jobsheetId: string
): Promise<LecturerRemedialSession[]> {
  const response = await apiFetch(`/lecturer/jobsheets/${jobsheetId}/remedials`)
  return response.data.remedials
}

export async function cancelLecturerRemedial(
  remedialId: string
): Promise<void> {
  await apiFetch(`/lecturer/remedials/${remedialId}`, {
    method: "DELETE",
  })
}

export async function getLecturerRemedialStudents(
  remedialId: string
): Promise<LecturerRemedialStudent[]> {
  const response = await apiFetch(`/lecturer/remedials/${remedialId}/students`)
  return response.data.students
}

export async function addStudentsToLecturerRemedial(
  remedialId: string,
  studentIds: string[]
) {
  const response = await apiFetch(`/lecturer/remedials/${remedialId}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentIds }),
  })
  return response.data
}
