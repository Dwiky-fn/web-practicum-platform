import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getJobsheets } from "../../../../entities/jobsheet/service";
import { mockCourseList } from "../../../../entities/course/mocks";
import { getSubmissionByJobsheetId } from "../../../../entities/jobsheetSubmission/service";
import type { Jobsheet } from "../../../../entities/jobsheet/types";
import type { Course } from "../../../../entities/course/types";
import type { JobsheetSubmission } from "../../../../entities/jobsheetSubmission/types";
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
        console.log("SUBMISSION:", sub)
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
                programmingLanguage: course?.programmingLanguage
              }}
            />
          </div>
        </main>

        <WorkSidebar
          courseId={courseId!}
          jobsheet={jobsheet}
        />
      </div>

      {/* Footer */}
      <WorkFooterNav
        courseId={courseId!}
        jobsheet={jobsheet}
      />
    </div>
  )
}