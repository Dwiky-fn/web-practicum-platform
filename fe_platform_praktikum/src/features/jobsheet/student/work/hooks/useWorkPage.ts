/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import type { JSONContent } from "@tiptap/core"
import type { Jobsheet } from "../../../../../services/jobsheet/types" 
import type { Course } from "../../../../../services/course/types" 
import type { JobsheetSubmission } from "../../../../../services/submission/types"
import { getJobsheetById } from "../../../../../services/jobsheet/service"
import { getOrCreateSubmissionByJobsheetId } from "../../../../../services/submission/service" 
import { getCourseById } from "../../../../../services/course/service"
import { updateSubmission } from "../../../../../services/submission/service"
import { getStudentProgress, upsertStudentProgress } from "../../../../../services/progress/service"
import type { StudentProgressItem } from "../../../../../services/progress/types"
import { buildWorkNavigation } from "../utils/buildNavigation"

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

export function useWorkPage(courseId?: string, jobsheetId?: string) {
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [savedProgress, setSavedProgress] = useState(0)
  const [completedItems, setCompletedItems] = useState<StudentProgressItem[]>([])
  const [lastSavedPage, setLastSavedPage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()

  const jobsheetIdRef = useRef(jobsheetId)
  const isMountedRef = useRef(true)

  const markProgressItemCompleted = useCallback((
    item: Pick<StudentProgressItem, "type" | "id">,
  ) => {
    setCompletedItems((prev) => {
      if (prev.some((completed) => completed.type === item.type && completed.id === item.id)) {
        return prev
      }

      return [
        ...prev,
        {
          ...item,
          completedAt: new Date().toISOString(),
        },
      ]
    })
  }, [])

  useEffect(() => {
    jobsheetIdRef.current = jobsheetId
  }, [jobsheetId])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // LOAD DATA
  useEffect(() => {
    async function loadData() {
      if (!courseId || !jobsheetId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setSavedProgress(0)
      setCompletedItems([])
      setLastSavedPage(null)

      try {
        // 1. Jobsheet
        const jobsheetData = await getJobsheetById(courseId, jobsheetId)
        if (!isMountedRef.current) return
        setJobsheet(jobsheetData)

        // 2. Course
        const courseData = await getCourseById(courseId)
        setCourse(courseData)

        // 3. Submission
        const submissionData = await getOrCreateSubmissionByJobsheetId(courseId!, jobsheetId)
        if (!isMountedRef.current) return
        setSubmission(submissionData)

        const progressData = await getStudentProgress(jobsheetId)
        if (!isMountedRef.current) return
        setSavedProgress(Math.max(0, Math.round(progressData?.progress ?? 0)))
        setCompletedItems(progressData?.completed_items ?? [])
        setLastSavedPage(progressData?.last_page ?? "")

      } catch (err) {
        console.error("Error loading data:", err)
        setLastSavedPage("")
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    loadData()
  }, [courseId, jobsheetId])

  // MANUAL SAVE
  const saveSubmission = async (updatedSubmission: JobsheetSubmission) => {
    try {
      await updateSubmission(
        courseId!,
        jobsheetIdRef.current!,
        updatedSubmission.report
      )
    } catch (err) {
      console.error("SAVE ERROR", err)
    }
  }

  // UPDATE STATE
  const updateExperiment = useCallback((experimentId: string, steps: StepData[]) => {
    setSubmission(prev => {
      if (!prev) return prev

      if (!steps || steps.length === 0) {
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

      saveSubmission(updated)

      return updated
    })
  }, [])

  const updateExercise = useCallback(async (exerciseId: string, data: StepData) => {
    setSubmission(prev => {
      if (!prev) return prev
      
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

      saveSubmission(updated)

      return updated
    })
  }, [])

  // AUTO NAVIGATE TO LAST VISITED ITEM
  useEffect(() => {
    if (!courseId || !jobsheet || lastSavedPage === null) return

    const isAtRoot = location.pathname.endsWith("/works")
    if (isAtRoot) {
      const navItems = buildWorkNavigation(courseId, jobsheet)
      const lastItem = navItems.find((item) =>
        lastSavedPage ? lastSavedPage.startsWith(item.path) : false
      )
      const firstItem = navItems[0]
      const targetPath = lastItem?.path ?? firstItem?.path

      if (targetPath) {
        navigate(targetPath, { replace: true })
      }
    }
  }, [courseId, jobsheet, lastSavedPage, location.pathname, navigate])

  useEffect(() => {
    if (!courseId || !jobsheetId || !jobsheet) return
    if (!submission || lastSavedPage === null) return

    const navItems = buildWorkNavigation(courseId, jobsheet)
    const currentIndex = navItems.findIndex((item) =>
      location.pathname.startsWith(item.path)
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
      progress,
      lastPage: currentItem.path,
      status: progress >= 100 ? "SELESAI" : "SEDANG",
      completedItems,
    }).catch((err) => {
      console.error("PROGRESS SAVE ERROR", err)
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
  ])

  useEffect(() => {
    if (!courseId || !jobsheet) return
    if (!submission || lastSavedPage === null) return
    if (isFinishedSubmission(submission) || savedProgress >= 100) return

    const navItems = buildWorkNavigation(courseId, jobsheet)
    const currentIndex = navItems.findIndex((item) =>
      location.pathname.startsWith(item.path)
    )

    if (currentIndex <= 0) return

    const firstIncompleteIndex = navItems.findIndex((item) =>
      !completedItems.some((completed) => completed.type === item.type && completed.id === item.id)
    )

    if (firstIncompleteIndex >= 0 && currentIndex > firstIncompleteIndex) {
      navigate(navItems[firstIncompleteIndex].path, { replace: true })
    }
  }, [courseId, jobsheet, completedItems, location.pathname, navigate, savedProgress, submission, lastSavedPage])

  const completeCurrentProgressItem = useCallback(() => {
    if (!courseId || !jobsheet || !submission) return

    const currentItem = buildWorkNavigation(courseId, jobsheet).find((item) =>
      location.pathname.startsWith(item.path)
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
  }, [courseId, jobsheet, location.pathname, markProgressItemCompleted, submission])

  return {
    jobsheet,
    course,
    submission,
    savedProgress,
    completedItems,
    completeCurrentProgressItem,
    loading,
    updateExperiment,
    updateExercise,
    saveSubmission // 🔥 expose ke UI
  }
}
