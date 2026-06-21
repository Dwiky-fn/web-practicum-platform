import { apiFetch } from "./api"

export type AttemptScope = {
  attemptType: "normal" | "remedial"
  remedialId: string | null
  label: string
}

export type MonitoringStudent = {
  studentId: string
  name: string
  nim: string
  profilePhotoUrl: string | null
  initials: string
  status: string
  lastUpdatedAt: string | null
}

export type MonitoringLocation = {
  type: string
  moduleType: string
  moduleId: string
  stepId: string | null
  stepIndex?: number | null
  title: string
  instruction?: unknown
  activeCount: number
  completedCount: number
  notStartedCount: number
  elsewhereCount: number
  avatars: MonitoringStudent[]
  remainingAvatarCount: number
  remainingAvatars?: MonitoringStudent[]
}

export type MonitoringGroup = {
  id: string
  title: string
  children: MonitoringLocation[]
}

export type MonitoringResponse = {
  context: {
    kelasPraktikumId: string
    jobsheetId: string
    className: string
    jobsheetTitle: string
    academicPeriod: string
    isDeadlinePassed: boolean
    programmingLanguage: string
  }
  attemptScope: AttemptScope
  attempts: AttemptScope[]
  summary: {
    totalStudents: number
    inProgress: number
    submittedManual: number
    submittedAutomatic: number
    waitingReview: number
    reviewed: number
    notStarted: number
  }
  sidebar: MonitoringGroup[]
  insights: {
    mostActiveLocation: { title: string; count: number } | null
    mostNotStartedLocation: { title: string; count: number } | null
  }
  lastUpdatedAt: string
}

export type LocationDetailStudent = MonitoringStudent & {
  locationStatus: "active_here" | "completed_here" | "not_started_here" | "elsewhere"
  progressScore: number | null
  submissionId: string | null
  submissionStatus: string | null
  submissionLabel: string | null
}

export type LocationDetailResponse = {
  context: MonitoringResponse["context"]
  attemptScope: AttemptScope
  location: MonitoringLocation
  statistics: {
    activeCount: number
    completedCount: number
    notStartedCount: number
    elsewhereCount: number
  }
  students: LocationDetailStudent[]
  lastUpdatedAt: string
}

export type WorkpageResponse = {
  context: MonitoringResponse["context"]
  attemptScope: AttemptScope
  attempts: AttemptScope[]
  student: MonitoringStudent
  status: string
  monitoringStats: {
    runCount: number
    lastMeaningfulActivityAt: string | null
    inactiveDurationSeconds: number | null
    inactiveLabel: string
    hasActivity: boolean
  }
  progress: {
    progressPercentage: number
    completedItems: Array<{ type: string; id: string; completedAt?: string }>
    currentLocation: MonitoringLocation | null
    firstOpenedAt: string | null
    lastUpdatedAt: string | null
    completedAt: string | null
  }
  submission: {
    id: string | null
    status: string | null
    label: string | null
    submittedAt: string | null
    isAutoSubmitted: boolean
    finalScore: number | null
    progressScore: { progressScore?: number; items?: unknown[]; calculatedAt?: string | null } | null
    report: {
      experiments?: Record<string, { steps?: Array<{ files?: Record<string, string>; output?: string; analysis?: unknown }> }>
      exercises?: Record<string, { files?: Record<string, string>; output?: string; analysis?: unknown }>
      conclusion?: unknown
      [key: string]: unknown
    }
  }
  structure: MonitoringGroup[]
  logs: Array<{
    experiment_id: string | null
    instruction_id: string | null
    activity_type: string
    metadata: unknown
    created_at: string
  }>
  readOnly: true
  lastUpdatedAt: string
}

function attemptQuery(attemptType: string, remedialId?: string | null) {
  const params = new URLSearchParams()
  params.set("attemptType", attemptType)
  if (remedialId) params.set("remedialId", remedialId)
  return params
}

function unwrap<T>(response: { data?: T }): T {
  if (!response.data) throw new Error("Response monitoring tidak valid.")
  return response.data
}

export async function getClassJobsheetMonitoring(
  kelasPraktikumId: string,
  jobsheetId: string,
  attemptType = "normal",
  remedialId?: string | null,
) {
  const params = attemptQuery(attemptType, remedialId)
  const response = await apiFetch(
    `/lecturer/kelas-praktikum/${kelasPraktikumId}/jobsheets/${jobsheetId}/monitoring?${params.toString()}`,
  )
  return unwrap<MonitoringResponse>(response)
}

export async function getMonitoringLocationDetail(
  kelasPraktikumId: string,
  jobsheetId: string,
  location: Pick<MonitoringLocation, "moduleType" | "moduleId" | "stepId">,
  attemptType = "normal",
  remedialId?: string | null,
) {
  const params = attemptQuery(attemptType, remedialId)
  params.set("moduleType", location.moduleType)
  params.set("moduleId", location.moduleId)
  if (location.stepId) params.set("stepId", location.stepId)
  const response = await apiFetch(
    `/lecturer/kelas-praktikum/${kelasPraktikumId}/jobsheets/${jobsheetId}/monitoring/location?${params.toString()}`,
  )
  return unwrap<LocationDetailResponse>(response)
}

export async function getStudentMonitoringWorkpage(
  kelasPraktikumId: string,
  jobsheetId: string,
  studentId: string,
  attemptType = "normal",
  remedialId?: string | null,
  activeType?: string,
  activeId?: string,
) {
  const params = attemptQuery(attemptType, remedialId)
  if (activeType) params.set("activeType", activeType)
  if (activeId) params.set("activeId", activeId)
  const response = await apiFetch(
    `/lecturer/kelas-praktikum/${kelasPraktikumId}/jobsheets/${jobsheetId}/students/${studentId}/monitor?${params.toString()}`,
  )
  return unwrap<WorkpageResponse>(response)
}
