// WorkPage.tsx
import { Outlet, useParams } from "react-router-dom"
import { useWorkPage } from "./hooks/useWorkPage"
import WorkHeader from "./components/WorkHeader"
import WorkFooterNav from "./components/WorkFooterNav"
import WorkSidebar from "./components/sidebar/WorkSidebar"
import TopProgressBar from "../../../../components/loading/TopProgressBar"
import NotFoundPage from "../../../not-found/NotFoundPage"

export default function WorkPage() {
  const { courseId, jobsheetId } = useParams()
  const {
    jobsheet,
    course,
    submission,
    loading,
    updateExperiment,
    updateExercise
  } = useWorkPage(courseId, jobsheetId)

  if (loading) return <TopProgressBar />
  if (!courseId || !jobsheet || !submission) return <NotFoundPage />

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <WorkHeader
        title={jobsheet.title}
        backTo={`/courses/${courseId}/jobsheets/${jobsheet.id}`}
      />

      <div className="flex flex-1 relative overflow-hidden">
        <main className="flex-1 px-6 py-8 lg:px-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <Outlet
              context={{
                course,
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

      <WorkFooterNav
        courseId={courseId!}
        jobsheet={jobsheet}
        submission={submission}
      />
    </div>
  )
}