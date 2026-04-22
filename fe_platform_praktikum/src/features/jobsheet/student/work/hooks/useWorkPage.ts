import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import type { JSONContent } from "@tiptap/core"
import type { Jobsheet } from "../../../../../entities/jobsheet/types"
import type { Course } from "../../../../../entities/course/types" 
import type { JobsheetSubmission } from "../../../../../entities/jobsheetSubmission/types"
import { getJobsheetById } from "../../../../../services/jobsheet/service"
import { getSubmissionByJobsheetId } from "../../../../../services/submission/service" 
import { mockCourseList } from "../../../../../entities/course/mocks"
import { updateSubmission } from "../../../../../services/submission/service"

type StepData = {
  files: Record<string, string>
  output: string
  analysis: JSONContent
}

export function useWorkPage(courseId?: string, jobsheetId?: string) {
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()
  const location = useLocation()

  const jobsheetIdRef = useRef(jobsheetId)
  const isMountedRef = useRef(true)

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

      try {
        // 1. Jobsheet
        const jobsheetData = await getJobsheetById(jobsheetId)
        if (!isMountedRef.current) return
        setJobsheet(jobsheetData)

        // 2. Course
        const courseData =
          mockCourseList.data.find(c => c.id === courseId) || null
        setCourse(courseData)

        // 3. Submission
        const submissionData = await getSubmissionByJobsheetId(jobsheetId)
        if (!isMountedRef.current) return
        setSubmission(submissionData)

      } catch (err) {
        console.error("Error loading data:", err)
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
      console.log("SAVE TO DB 🔥", updatedSubmission.report)

      await updateSubmission(
        jobsheetIdRef.current!,
        updatedSubmission.report,
        "DRAFT"
      )
      console.log("FINAL REPORT:", JSON.stringify(updatedSubmission.report, null, 2))

      console.log("SAVED ✅")
    } catch (err) {
      console.error("SAVE ERROR ❌", err)
    }
  }

  // UPDATE STATE (NO AUTOSAVE)
  const updateExperiment = useCallback((experimentId: string, steps: StepData[]) => {
    setSubmission(prev => {
      if (!prev) return prev

      if (!steps || steps.length === 0) {
        console.warn("⚠️ SKIP SAVE - EMPTY STEPS")
        return prev
      }

      console.log("🔥 STEPS:", steps)

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

  // SAVE SAAT PINDAH HALAMAN
  // useEffect(() => {
  //   return () => {
  //     if (!submissionRef.current) return

  //     console.log("🚪 SAVE BEFORE LEAVE")
  //     updateSubmission(
  //       jobsheetIdRef.current!,
  //       submissionRef.current.report,
  //       "DRAFT"
  //     )
  //   }
  // }, [])

  // AUTO NAVIGATE THEORY
  useEffect(() => {
    if (!jobsheet) return
    const isAtRoot = location.pathname.endsWith("/works")
    if (isAtRoot && jobsheet.theory?.length > 0) {
      navigate(`theory/${jobsheet.theory[0].id}`, { replace: true })
    }
  }, [jobsheet, location.pathname, navigate])

  return {
    jobsheet,
    course,
    submission,
    loading,
    updateExperiment,
    updateExercise,
    saveSubmission // 🔥 expose ke UI
  }
}