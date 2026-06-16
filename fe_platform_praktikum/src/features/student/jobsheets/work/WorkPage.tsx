import { useCallback, useEffect, useRef } from "react"
import { Outlet, useLocation, useParams } from "react-router-dom"
import { useWorkPage } from "./hooks/useWorkPage"
import WorkHeader from "./components/WorkHeader"
import WorkFooterNav from "./components/WorkFooterNav"
import WorkSidebar from "./components/sidebar/WorkSidebar"
import TopProgressBar from "../../../../components/loading/TopProgressBar"
import NotFoundPage from "../../../not-found/NotFoundPage"
import { academicCourseBasePath, academicJobsheetPath } from "../../../../services/academicScope"

export default function WorkPage() {
  const { courseId, mataKuliahId: routeMataKuliahId, jobsheetId } = useParams<{
    courseId?: string
    mataKuliahId?: string
    jobsheetId?: string
  }>()
  const location = useLocation()
  const query = location.search
  const searchParams = new URLSearchParams(location.search)
  const effectiveCourseId = routeMataKuliahId || courseId
  const scope = {
    classId: searchParams.get("classId") || undefined,
    mataKuliahId: routeMataKuliahId || searchParams.get("mataKuliahId") || undefined,
    kelasPraktikumId: searchParams.get("kelasPraktikumId") || undefined,
  }
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
    updateExercise,
    trackActivity,
  } = useWorkPage(effectiveCourseId, jobsheetId, routeMataKuliahId)

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
        <WorkHeader title="Jobsheet" backTo={effectiveCourseId ? `${academicCourseBasePath(effectiveCourseId, scope)}${query}` : "/mata-kuliah"} />
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    )
  }
  if (!effectiveCourseId || !jobsheet || !submission) return <NotFoundPage />

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <WorkHeader
        title={jobsheet.title}
        backTo={academicJobsheetPath(effectiveCourseId, jobsheet.id, scope)}
        course={course}
        jobsheet={jobsheet}
        scope={scope}
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
                updateExercise,
                trackActivity,
              }}
            />
          </div>
        </main>

        <WorkSidebar
          courseId={effectiveCourseId}
          jobsheet={jobsheet}
          submission={submission}
          savedProgress={savedProgress}
          completedItems={completedItems}
          scope={scope}
        />
      </div>

      <WorkFooterNav
        courseId={effectiveCourseId}
        jobsheet={jobsheet}
        submission={submission}
        savedProgress={savedProgress}
        completedItems={completedItems}
        scope={scope}
      />
    </div>
  )
}
