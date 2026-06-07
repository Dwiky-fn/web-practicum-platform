import { useCallback, useEffect, useRef } from "react"
import { Outlet, useLocation, useParams } from "react-router-dom"
import { useWorkPage } from "./hooks/useWorkPage"
import WorkHeader from "./components/WorkHeader"
import WorkFooterNav from "./components/WorkFooterNav"
import WorkSidebar from "./components/sidebar/WorkSidebar"
import TopProgressBar from "../../../../components/loading/TopProgressBar"
import NotFoundPage from "../../../not-found/NotFoundPage"

export default function WorkPage() {
  const { courseId, jobsheetId } = useParams()
  const location = useLocation()
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const {
    jobsheet,
    course,
    submission,
    savedProgress,
    completedItems,
    completeCurrentProgressItem,
    loading,
    error,
    updateExperiment,
    updateExercise
  } = useWorkPage(courseId, jobsheetId)

  const handleWorkScroll = useCallback(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const remainingScroll =
      scrollContainer.scrollHeight -
      scrollContainer.scrollTop -
      scrollContainer.clientHeight

    if (remainingScroll <= 12) {
      completeCurrentProgressItem()
    }
  }, [completeCurrentProgressItem])

  const handleWorkScrollRef = useRef(handleWorkScroll)
  useEffect(() => {
    handleWorkScrollRef.current = handleWorkScroll
  }, [handleWorkScroll])

  // Scroll ke atas hanya saat navigasi antar halaman
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    scrollContainer.scrollTo({ top: 0 })

    const timer = window.setTimeout(() => {
      handleWorkScrollRef.current()
    }, 150)

    return () => window.clearTimeout(timer)
  }, [location.pathname])

  // Cek scroll saat handleWorkScroll berubah (misal data baru dimuat)
  useEffect(() => {
    handleWorkScroll()
  }, [handleWorkScroll])

  if (loading) return <TopProgressBar />
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <WorkHeader title="Jobsheet" backTo={courseId ? `/courses/${courseId}` : "/courses"} />
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    )
  }
  if (!courseId || !jobsheet || !submission) return <NotFoundPage />

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <WorkHeader
        title={jobsheet.title}
        backTo={`/courses/${courseId}/jobsheets/${jobsheet.id}`}
        course={course}
        jobsheet={jobsheet}
      />

      <div className="flex flex-1 relative overflow-hidden">
        <main
          ref={scrollContainerRef}
          data-work-scroll
          onScroll={handleWorkScroll}
          className="flex-1 overflow-y-auto px-6 py-8 lg:px-10"
        >
          <div className="mx-auto max-w-6xl">
            <Outlet
              context={{
                course,
                jobsheet,
                submission,
                programmingLanguage: jobsheet.programmingLanguage || course?.programmingLanguage || "java",
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
          savedProgress={savedProgress}
          completedItems={completedItems}
        />
      </div>

      <WorkFooterNav
        courseId={courseId!}
        jobsheet={jobsheet}
        submission={submission}
        savedProgress={savedProgress}
        completedItems={completedItems}
      />
    </div>
  )
}
