import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getJobsheets } from "../../../../entities/jobsheet/service";
import { mockCourseList } from "../../../../entities/course/mocks";
import { getSubmissionByJobsheetId } from "../../../../entities/jobsheetSubmission/service";
import type { Jobsheet } from "../../../../entities/jobsheet/types";
import type { Course } from "../../../../entities/course/types";
import type { JobsheetSubmission } from "../../../../entities/jobsheetSubmission/types";
import type { JSONContent } from "@tiptap/core";
import NotFoundPage from "../../../not-found/NotFoundPage";
import WorkHeader from "./components/WorkHeader";
import WorkFooterNav from "./components/WorkFooterNav";
import WorkSidebar from "./components/sidebar/WorkSidebar";
import TopProgressBar from "../../../../components/loading/TopProgressBar";

export default function WorkPage() {
  const { courseId, jobsheetId } = useParams()

  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<Course | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)

  const navigate = useNavigate()
  const location = useLocation()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const autoSave = (updatedSubmission: JobsheetSubmission) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      try {
        console.log("AUTO SAVE...", updatedSubmission.report)

        // 🔥 nanti ganti dengan API beneran
        await fetch(`http://localhost:3000/submissions/${jobsheetId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            report: updatedSubmission.report,
            status: "DRAFT"
          })
        })

        console.log("SAVED ✅")
      } catch (err) {
        console.error("AUTO SAVE ERROR ❌", err)
      }
    }, 800)
  }

  useEffect(() => {
    async function loadData() {
      if (!courseId || !jobsheetId) return

      setLoading(true)

      try {
        const data = await getJobsheets(courseId)
        const selected = data.find(job => job.id === jobsheetId)
        setJobsheet(selected || null)

        const selectedCourse = mockCourseList.data.find(
          c => c.id === courseId
        )
        setCourse(selectedCourse || null)

        const sub = await getSubmissionByJobsheetId(jobsheetId)
        setSubmission(sub)

      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [courseId, jobsheetId])

  useEffect(() => {
    if (!jobsheet) return

    const isAtRoot = location.pathname.endsWith("/works")

    if (isAtRoot && jobsheet.theory.length > 0) {
      navigate(
        `theory/${jobsheet.theory[0].id}`,
        { replace: true }
      )
    }
  }, [jobsheet, location.pathname, navigate])

  type StepData = {
    files: Record<string, string>
    output: string
    analysis: JSONContent
  }

  const updateExperiment = (experimentId: string, steps: StepData[]) => {
    setSubmission(prev => {
      if (!prev) return prev

      const updated = {
        ...prev,
        report: {
          ...prev.report,
          experiments: {
            ...(prev.report?.experiments || {}),
            [experimentId]: {
              steps
            }
          }
        }
      }

      autoSave(updated) // 🔥 ini kuncinya

      return updated
})
  }

  const updateExercise = (exerciseId: string, data: StepData) => {
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

      autoSave(updated)

      return updated
    })
  }

  if (loading || !submission) {
    return (
      <TopProgressBar />
    )
  }

  if (!jobsheet) {
    return (
      <NotFoundPage />
    )
  }

  

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* Header */}
      <WorkHeader
        title={jobsheet.title}
        backTo={`/courses/${courseId}/jobsheets/${jobsheet.id}`}
      />

      {/* Main Content */}
      <div className="flex flex-1 relative overflow-hidden">
        <main className="flex-1 px-6 py-8 lg:px-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <Outlet
              context={{
                jobsheet,
                submission,
                programmingLanguage: course?.programmingLanguage,
                updateExperiment,
                updateExercise
              }}
            />
          </div>
        </main>

        <WorkSidebar
          courseId={courseId!}
          jobsheet={jobsheet}
          submission={submission}
        />
      </div>

      {/* Footer */}
      <WorkFooterNav
        courseId={courseId!}
        jobsheet={jobsheet}
        submission={submission}
      />
    </div>
  )
}