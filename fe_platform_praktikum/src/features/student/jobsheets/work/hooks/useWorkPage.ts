import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import type { JSONContent } from "@tiptap/core"
import type { Jobsheet } from "../../../../../services/jobsheet/types" 
import type { Course } from "../../../../../services/course/types" 
import type { JobsheetSubmission } from "../../../../../services/submission/types"
import { getJobsheetById } from "../../../../../services/jobsheet/service"
import { getOrCreateSubmissionByJobsheetId, getSubmissionByJobsheetId } from "../../../../../services/submission/service" 
import { getCourseById } from "../../../../../services/course/service"
import { updateSubmission } from "../../../../../services/submission/service"
import { getStudentProgress, upsertStudentProgress, updateStudentProgressApi } from "../../../../../services/progress/service"
import type { StudentProgressItem } from "../../../../../services/progress/types"
import { useCurrentUser } from "../../../../../services/user/useCurrentUser"
import { buildWorkNavigation } from "../utils/buildNavigation"
import { toast } from "../../../../../components/toast/toastStore"

type StepData = {
  files: Record<string, string>
  output: string
  analysis: JSONContent
}

function hasCode(files?: Record<string, string>) {
  return Object.values(files ?? {}).some((code) => code.trim().length > 0)
}

function hasOutput(output?: string) {
  return (output ?? "").trim().length > 0
}

function hasMeaningfulAnalysis(analysis?: JSONContent) {
  if (!analysis || !Array.isArray(analysis.content)) return false

  return JSON.stringify(analysis.content).replace(/\s/g, "").length > 20
}

function isFinishedSubmission(submission?: JobsheetSubmission | null) {
  return (
    submission?.status === "SUBMITTED" ||
    submission?.status === "REVIEWING" ||
    submission?.status === "ACCEPTED"
  )
}

export function useWorkPage(courseId?: string, jobsheetId?: string, routeMataKuliahId?: string) {
  const { user } = useCurrentUser()
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [savedProgress, setSavedProgress] = useState(0)
  const [completedItems, setCompletedItems] = useState<StudentProgressItem[]>([])
  const [lastSavedPage, setLastSavedPage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const classId = searchParams.get("classId") || undefined
  const mataKuliahId = routeMataKuliahId || searchParams.get("mataKuliahId") || undefined
  const kelasPraktikumId = searchParams.get("kelasPraktikumId") || undefined
  const submissionIdParam = searchParams.get("submissionId") || undefined
  const attemptNoParam = searchParams.get("attemptNo") ? Number(searchParams.get("attemptNo")) : undefined
  const academicScope = useMemo(
    () => ({ classId, mataKuliahId, kelasPraktikumId, submissionId: submissionIdParam, attemptNo: attemptNoParam }),
    [classId, mataKuliahId, kelasPraktikumId, submissionIdParam, attemptNoParam],
  )

  const access = jobsheet?.access || { accessMode: "editable_normal", canEdit: true, canSubmit: true }
  const accessMode = access.accessMode
  const isBrowsingHistory = !!submissionIdParam || !!attemptNoParam
  const readOnly = !access.canEdit ||
                   accessMode === "locked_deadline" ||
                   accessMode === "readonly_submitted" ||
                   accessMode === "readonly_reviewed" ||
                   isBrowsingHistory
  const canSaveProgress = access.canSaveProgress ?? access.canEdit

  const jobsheetIdRef = useRef(jobsheetId)
  const isMountedRef = useRef(true)

  const markProgressItemCompleted = useCallback((
    item: Pick<StudentProgressItem, "type" | "id">,
  ) => {
    if (!canSaveProgress || readOnly) return
    setCompletedItems((prev) => {
      if (prev.some((completed) => completed.type === item.type && completed.id === item.id)) {
        return prev
      }

      // Track completion
      const activityType = item.type === "experiment" ? "complete_experiment" : "complete_instruction"
      updateStudentProgressApi(jobsheetIdRef.current || "", {
        studentId: user?.id || "",
        experimentId: item.type === "experiment" ? item.id : null,
        instructionId: item.type !== "experiment" ? item.id : null,
        activityType,
        kelasPraktikumId,
      }).catch(console.error)

      return [
        ...prev,
        {
          ...item,
          completedAt: new Date().toISOString(),
        },
      ]
    })
  }, [canSaveProgress, kelasPraktikumId, readOnly, user])

  useEffect(() => {
    jobsheetIdRef.current = jobsheetId
  }, [jobsheetId])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const trackActivity = useCallback(async (
    activityType: string,
    opts?: { experimentId?: string | null; instructionId?: string | null; metadata?: Record<string, unknown> }
  ) => {
    if (!jobsheetId || !user || !canSaveProgress || readOnly) return

    let experimentId = opts?.experimentId
    let instructionId = opts?.instructionId

    if (experimentId === undefined && instructionId === undefined && jobsheet) {
      const navItems = buildWorkNavigation(courseId || "", jobsheet, location.search, academicScope)
      const currentItem = navItems.find((item) => location.pathname.startsWith(item.path.split("?")[0]))
      if (currentItem) {
        if (currentItem.type === "experiment") {
          experimentId = currentItem.id
          instructionId = null
        } else {
          experimentId = null
          instructionId = currentItem.id
        }
      }
    }

    try {
      await updateStudentProgressApi(jobsheetId, {
        studentId: user.id,
        experimentId: experimentId || null,
        instructionId: instructionId || null,
        activityType,
        kelasPraktikumId,
        metadata: opts?.metadata || {},
      })
    } catch (err) {
      // Gagal melacak aktivitas (silent fallback)
    }
  }, [academicScope, jobsheetId, user, jobsheet, courseId, location.pathname, location.search, kelasPraktikumId, canSaveProgress, readOnly])

  // Track tab transitions
  const lastPathRef = useRef("")
  useEffect(() => {
    if (!courseId || !jobsheetId || !jobsheet || !user || loading || readOnly) return
    if (location.pathname === lastPathRef.current) return
    lastPathRef.current = location.pathname

    const navItems = buildWorkNavigation(courseId, jobsheet, location.search, academicScope)
    const currentItem = navItems.find((item) =>
      location.pathname.startsWith(item.path.split("?")[0])
    )

    if (!currentItem) return

    if (currentItem.type === "experiment") {
      updateStudentProgressApi(jobsheetId, {
        studentId: user.id,
        experimentId: currentItem.id,
        instructionId: null,
        activityType: "open_experiment",
        kelasPraktikumId,
      }).catch(console.error)
    } else {
      updateStudentProgressApi(jobsheetId, {
        studentId: user.id,
        experimentId: null,
        instructionId: currentItem.id,
        activityType: "open_instruction",
        kelasPraktikumId,
      }).catch(console.error)
    }
  }, [academicScope, courseId, jobsheetId, jobsheet, user, location.pathname, location.search, loading, kelasPraktikumId, readOnly])

  // LOAD DATA
  useEffect(() => {
    async function loadData() {
      if (!courseId || !jobsheetId || !user) {
        setLoading(false)
        return
      }

      setLoading(true)
      setSavedProgress(0)
      setCompletedItems([])
      setLastSavedPage(null)
      setError("")

      try {
        // 1. Jobsheet
        const jobsheetData = await getJobsheetById(courseId, jobsheetId, academicScope)
        if (!isMountedRef.current) return
        setJobsheet(jobsheetData)

        // 2. Course
        const courseData = await getCourseById(courseId)
        setCourse(courseData)

        // 3. Submission
        const isLockedByDeadline = jobsheetData.access?.accessMode === "locked_deadline"
        const submissionData = isLockedByDeadline && !submissionIdParam && !attemptNoParam
          ? await getSubmissionByJobsheetId(
              courseId!,
              jobsheetId,
              user.id,
              academicScope,
            )
          : await getOrCreateSubmissionByJobsheetId(
              courseId!,
              jobsheetId,
              user.id,
              academicScope,
            )
        if (!isMountedRef.current) return
        setSubmission(submissionData)

        const progressData = await getStudentProgress(jobsheetId, user.id, kelasPraktikumId)
        if (!isMountedRef.current) return
        setSavedProgress(Math.max(0, Math.round(progressData?.progress ?? 0)))
        setCompletedItems(progressData?.completed_items ?? [])
        setLastSavedPage(progressData?.last_page ?? "")

      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat data.")
        setError(err instanceof Error ? err.message : "Gagal memuat jobsheet.")
        setLastSavedPage("")
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    loadData()
  }, [academicScope, courseId, jobsheetId, kelasPraktikumId, user])

  // MANUAL SAVE
  const saveSubmission = useCallback(async (updatedSubmission: JobsheetSubmission) => {
    if (!courseId || !jobsheetIdRef.current || !user) {
      throw new Error("Data sesi belum siap untuk menyimpan.")
    }
    if (readOnly || !canSaveProgress) {
      throw new Error(access.message || "Pengerjaan tidak dapat disimpan.")
    }

    await updateSubmission(
      courseId,
      jobsheetIdRef.current,
      user.id,
      updatedSubmission.report,
      undefined,
      academicScope,
    )
  }, [academicScope, access.message, canSaveProgress, courseId, readOnly, user])

  // UPDATE STATE
  const updateExperiment = useCallback(async (experimentId: string, steps: StepData[]) => {
    return new Promise<void>((resolve, reject) => {
    setSubmission(prev => {
      if (!prev) {
        resolve()
        return prev
      }

      if (!steps || steps.length === 0) {
        reject(new Error("Tidak ada langkah eksperimen untuk disimpan."))
        console.warn("⚠️ SKIP SAVE - EMPTY STEPS")
        return prev
      }

      const currentExperiments = prev.report?.experiments || {}

      const updated = {
        ...prev,
        report: {
          ...prev.report,
          experiments: {
            ...currentExperiments,
            [experimentId]: {
              ...(currentExperiments[experimentId] || {}),
              steps
            }
          }
        }
      }

      saveSubmission(updated).then(resolve).catch(reject)

      return updated
    })
    })
  }, [saveSubmission])

  const updateExercise = useCallback(async (exerciseId: string, data: StepData) => {
    return new Promise<void>((resolve, reject) => {
    setSubmission(prev => {
      if (!prev) {
        resolve()
        return prev
      }
      
      const updated = {
        ...prev,
        report: {
          ...prev.report,
          exercises: {
            ...(prev.report?.exercises || {}),
            [exerciseId]: data
          }
        }
      }

      saveSubmission(updated).then(resolve).catch(reject)

      return updated
    })
    })
  }, [saveSubmission])

  // AUTO NAVIGATE TO LAST VISITED ITEM
  useEffect(() => {
    if (!courseId || !jobsheet || lastSavedPage === null) return

    const isAtRoot = location.pathname.endsWith("/works")
    if (isAtRoot) {
      const navItems = buildWorkNavigation(courseId, jobsheet, location.search, academicScope)
      const lastItem = navItems.find((item) =>
        lastSavedPage ? lastSavedPage.startsWith(item.path) : false
      )
      const firstItem = navItems[0]
      const targetPath = lastItem?.path ?? firstItem?.path

      if (targetPath) {
        navigate(targetPath, { replace: true })
      }
    }
  }, [academicScope, courseId, jobsheet, lastSavedPage, location.pathname, location.search, navigate])

  useEffect(() => {
    if (!courseId || !jobsheetId || !jobsheet || !user || readOnly || !canSaveProgress) return
    if (!submission || lastSavedPage === null) return

    const navItems = buildWorkNavigation(courseId, jobsheet, location.search, academicScope)
    const currentIndex = navItems.findIndex((item) =>
      location.pathname.startsWith(item.path.split("?")[0])
    )

    if (currentIndex < 0 || navItems.length === 0) return

    const currentItem = navItems[currentIndex]
    const latestCompletedProgress = isFinishedSubmission(submission)
      ? 100
      : Math.round((completedItems.length / navItems.length) * 100)
    const progress = Math.max(savedProgress, latestCompletedProgress)

    if (latestCompletedProgress > savedProgress) {
      setSavedProgress(progress)
    }
    upsertStudentProgress(jobsheetId, {
      studentId: user.id,
      progress,
      lastPage: currentItem.path,
      status: progress >= 100 ? "SELESAI" : "SEDANG",
      completedItems,
      classId,
      kelasPraktikumId,
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan progres.")
    })
  }, [
    courseId,
    jobsheetId,
    jobsheet,
    location.pathname,
    savedProgress,
    completedItems,
    submission,
    lastSavedPage,
    user,
    classId,
    kelasPraktikumId,
    canSaveProgress,
    readOnly,
    location.search,
    academicScope,
  ])

  useEffect(() => {
    if (!courseId || !jobsheet || readOnly) return
    if (!submission || lastSavedPage === null) return
    if (isFinishedSubmission(submission) || savedProgress >= 100) return

    const navItems = buildWorkNavigation(courseId, jobsheet, location.search, academicScope)
    const currentIndex = navItems.findIndex((item) =>
      location.pathname.startsWith(item.path.split("?")[0])
    )

    if (currentIndex <= 0) return

    const firstIncompleteIndex = navItems.findIndex((item) =>
      !completedItems.some((completed) => completed.type === item.type && completed.id === item.id)
    )

    if (firstIncompleteIndex >= 0 && currentIndex > firstIncompleteIndex) {
      navigate(navItems[firstIncompleteIndex].path, { replace: true })
    }
  }, [academicScope, courseId, jobsheet, completedItems, location.pathname, location.search, navigate, readOnly, savedProgress, submission, lastSavedPage])

  const completeCurrentProgressItem = useCallback(() => {
    if (!courseId || !jobsheet || !submission || readOnly) return

    const currentItem = buildWorkNavigation(courseId, jobsheet, location.search, academicScope).find((item) =>
      location.pathname.startsWith(item.path.split("?")[0])
    )

    if (!currentItem) return

    if (currentItem.type === "experiment") {
      const steps = submission.report.experiments?.[currentItem.id]?.steps ?? []
      const isExperimentComplete = steps.length > 0 && steps.every((step) =>
        hasCode(step.files) &&
        hasOutput(step.output) &&
        hasMeaningfulAnalysis(step.analysis)
      )

      if (!isExperimentComplete) return
    }

    if (currentItem.type === "exercise") {
      const exercise = submission.report.exercises?.[currentItem.id]
      const isExerciseComplete =
        hasCode(exercise?.files) &&
        hasOutput(exercise?.output) &&
        hasMeaningfulAnalysis(exercise?.analysis)

      if (!isExerciseComplete) return
    }

    markProgressItemCompleted({
      type: currentItem.type,
      id: currentItem.id,
    })
  }, [academicScope, courseId, jobsheet, location.pathname, location.search, markProgressItemCompleted, readOnly, submission])

  return {
    jobsheet,
    course,
    submission,
    savedProgress,
    completedItems,
    completeCurrentProgressItem,
    loading,
    error,
    updateExperiment,
    updateExercise,
    saveSubmission, // 🔥 expose ke UI
    trackActivity,
    isBrowsingHistory: !!submissionIdParam || !!attemptNoParam,
  }
}
