import { useCallback, useEffect, useRef, useState } from "react"
import { Outlet, useLocation, useParams } from "react-router-dom"
import { useWorkPage } from "./hooks/useWorkPage"
import WorkHeader from "./components/WorkHeader"
import WorkFooterNav from "./components/WorkFooterNav"
import WorkSidebar from "./components/sidebar/WorkSidebar"
import TopProgressBar from "../../../../components/loading/TopProgressBar"
import NotFoundPage from "../../../not-found/NotFoundPage"
import { academicCourseBasePath, academicJobsheetPath } from "../../../../services/academicScope"
import { formatAcademicDateTime } from "../../../../shared/utils/formatAcademicDateTime"
import { connectLiveWorkspaceSocket } from "../../../../services/liveWorkspaceSocket"

const LIVE_WORKSPACE_DEBUG = import.meta.env.DEV && import.meta.env.VITE_LIVE_WORKSPACE_DEBUG === "true"

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
  const liveWorkspaceRef = useRef<ReturnType<typeof connectLiveWorkspaceSocket> | null>(null)
  const [liveWorkspaceConnection, setLiveWorkspaceConnection] = useState<ReturnType<typeof connectLiveWorkspaceSocket> | null>(null)
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
    isBrowsingHistory,
  } = useWorkPage(effectiveCourseId, jobsheetId, routeMataKuliahId)

  const access = jobsheet?.access || { accessMode: "editable_normal", canEdit: true, canSubmit: true }
  const accessMode = access.accessMode
  const readOnly = !access.canEdit || accessMode === "locked_deadline" || accessMode === "readonly_submitted" || accessMode === "readonly_reviewed" || isBrowsingHistory
  const formattedEndAt = access.remedialEndAt
    ? formatAcademicDateTime(access.remedialEndAt)
    : ""

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

  useEffect(() => {
    liveWorkspaceRef.current?.close()
    liveWorkspaceRef.current = null

    if (!jobsheet || !jobsheetId || !scope.kelasPraktikumId || readOnly) return undefined

    const connection = connectLiveWorkspaceSocket({
      role: "student",
      kelasPraktikumId: scope.kelasPraktikumId,
      jobsheetId,
      onEvent: (event) => {
        if (LIVE_WORKSPACE_DEBUG) {
          console.debug("[LIVE-WS][STUDENT] event", { type: event.type, workspaceVersion: event.workspaceVersion })
        }
      },
    })
    liveWorkspaceRef.current = connection
    setLiveWorkspaceConnection(connection)

    return () => {
      connection.close()
      if (liveWorkspaceRef.current === connection) liveWorkspaceRef.current = null
      setLiveWorkspaceConnection((current) => current === connection ? null : current)
    }
  }, [jobsheet, jobsheetId, readOnly, scope.kelasPraktikumId])

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

  useEffect(() => {
    if (!jobsheet || !jobsheetId || !scope.kelasPraktikumId || readOnly) return
    const relative = location.pathname.split("/works/")[1] || ""
    const [section, id] = relative.split("/")
    if (!id) return
    const sectionType = section === "experiments" ? "experiment" : section === "exercises" ? "exercise" : "instruction"
    const sectionName =
      sectionType === "experiment"
        ? jobsheet.experiments.find((item) => item.id === id)?.title
        : sectionType === "exercise"
          ? jobsheet.exercises.find((item) => item.id === id)?.title
          : jobsheet.theory.find((item) => item.id === id)?.title
    liveWorkspaceRef.current?.send({
      type: "active-section-changed",
      sectionType,
      sectionId: id,
      sectionName: sectionName || id,
    })
  }, [jobsheet, jobsheetId, location.pathname, readOnly, scope.kelasPraktikumId])

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
  if (!effectiveCourseId || !jobsheet || (!submission && accessMode !== "locked_deadline")) return <NotFoundPage />

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
            {accessMode === 'locked_deadline' && !submission ? (
              <div className="flex flex-col items-center justify-center py-24 px-4">
                <div className="relative p-8 max-w-md w-full bg-white/80 backdrop-blur-md rounded-2xl border border-red-100 shadow-xl text-center overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="relative mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-500 mb-6 border border-red-100">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Deadline Berakhir</h3>
                  <p className="text-gray-500 text-sm mb-6">Deadline pengerjaan telah berakhir. Jobsheet tidak dapat dikerjakan lagi.</p>
                  <div className="text-xs text-gray-400 border-t border-gray-100 pt-4">
                    Hubungi dosen pengampu jika Anda memerlukan sesi remedial.
                  </div>
                </div>
              </div>
            ) : (
              <>
                {accessMode === 'locked_deadline' && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <h3 className="font-semibold text-red-800">Deadline Berakhir</h3>
                    <p className="mt-1">
                      Pengerjaan normal telah dikunci. Anda masih dapat melihat riwayat pengerjaan dan hasil review.
                    </p>
                  </div>
                )}

                {accessMode === 'editable_remedial' && !isBrowsingHistory && (
                  <div className="mb-6 relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-4 shadow-md flex items-start gap-3">
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm mt-0.5 flex shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">Remedial Aktif</h4>
                      <p className="text-xs text-blue-100 mt-1">
                        Remedial aktif sampai <span className="font-semibold">{formattedEndAt}</span>. Kerjakan ulang jobsheet sesuai instruksi dosen.
                      </p>
                    </div>
                  </div>
                )}

                <Outlet
                  context={{
                    course,
                    jobsheet,
                    submission,
                    programmingLanguage: jobsheet.programmingLanguage || course?.programmingLanguage || "java",
                    updateExperiment,
                    updateExercise,
                    trackActivity,
                    liveWorkspace: liveWorkspaceConnection,
                    readOnly,
                  }}
                />
              </>
            )}
          </div>
        </main>

        {submission && (
          <WorkSidebar
            courseId={effectiveCourseId}
            jobsheet={jobsheet}
            submission={submission}
            savedProgress={savedProgress}
            completedItems={completedItems}
            scope={scope}
          />
        )}
      </div>

      {submission && (
        <WorkFooterNav
          courseId={effectiveCourseId}
          jobsheet={jobsheet}
          submission={submission}
          savedProgress={savedProgress}
          completedItems={completedItems}
          scope={scope}
        />
      )}
    </div>
  )
}
