import { useCallback, useEffect, useRef, useState } from "react"
import { Outlet, useLocation, useParams } from "react-router-dom"
import { useWorkPage } from "./hooks/useWorkPage"
import WorkHeader from "./components/WorkHeader"
import WorkFooterNav from "./components/WorkFooterNav"
import WorkSidebar from "./components/sidebar/WorkSidebar"
import WorkspaceChatPanel from "./components/WorkspaceChatPanel"
import { getChatUnreadCount } from "../../../../services/chat/chatService"
import TopProgressBar from "../../../../components/loading/TopProgressBar"
import NotFoundPage from "../../../not-found/NotFoundPage"
import { academicCourseBasePath, academicJobsheetPath } from "../../../../services/academicScope"
import { formatAcademicDateTime } from "../../../../shared/utils/formatAcademicDateTime"
import { useCurrentUser } from "../../../../services/user/useCurrentUser"
import { EyeOff, Clock } from "lucide-react"

import { useSearchParams } from "react-router-dom"

export default function WorkPage() {
  const { user } = useCurrentUser()
  const isStudent = !user || user.role === "MAHASISWA"

  const [searchParams, setSearchParams] = useSearchParams()

  const { courseId, mataKuliahId: routeMataKuliahId, jobsheetId } = useParams<{
    courseId?: string
    mataKuliahId?: string
    jobsheetId?: string
  }>()
  const location = useLocation()
  const query = location.search
  const effectiveCourseId = routeMataKuliahId || courseId
  const scope = {
    classId: searchParams.get("classId") || undefined,
    mataKuliahId: routeMataKuliahId || searchParams.get("mataKuliahId") || undefined,
    kelasPraktikumId: searchParams.get("kelasPraktikumId") || undefined,
  }
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [isScreenCaptureDetected, setIsScreenCaptureDetected] = useState(false)

  useEffect(() => {
    if (searchParams.get("openChat") === "true") {
      setIsChatOpen(true)
      searchParams.delete("openChat")
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const activateInstantProtection = useCallback(() => {
    if (!isStudent) return
    const wrapper = document.getElementById("workpage-content-wrapper")
    const overlay = document.getElementById("workpage-protection-overlay")
    if (wrapper) {
      wrapper.style.filter = "blur(32px)"
      wrapper.style.pointerEvents = "none"
      wrapper.style.userSelect = "none"
      wrapper.style.webkitUserSelect = "none"
    }
    if (overlay) {
      overlay.style.display = "flex"
    }
    setIsScreenCaptureDetected(true)
  }, [isStudent])

  const deactivateInstantProtection = useCallback(() => {
    const wrapper = document.getElementById("workpage-content-wrapper")
    const overlay = document.getElementById("workpage-protection-overlay")
    if (wrapper) {
      wrapper.style.filter = ""
      wrapper.style.pointerEvents = ""
      wrapper.style.userSelect = ""
      wrapper.style.webkitUserSelect = ""
    }
    if (overlay) {
      overlay.style.display = "none"
    }
    setIsScreenCaptureDetected(false)
  }, [])

  useEffect(() => {
    // Protection applies strictly to STUDENT accounts ONLY!
    if (!isStudent) return

    const handleBlur = (e: FocusEvent) => {
      // Ignore internal element blur events (e.g. clicking Run button, focusing editor/terminal, active element changes)
      if (document.hasFocus()) return
      if (e.target && e.target !== window && e.target !== document) return
      activateInstantProtection()
    }

    const handleFocus = () => deactivateInstantProtection()

    const handleVisibilityChange = () => {
      if (document.hidden) {
        activateInstantProtection()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code
      const key = e.key
      const keyLower = key.toLowerCase()

      // 1. PrintScreen key (Windows / Linux / Web fallback)
      const isPrintScreenKey =
        code === "PrintScreen" ||
        keyLower === "printscreen" ||
        key === "Snapshot"

      // 2. Windows Snipping Tool (Win + Shift + S or Ctrl + Shift + S)
      const isWinShiftS = (e.metaKey || e.ctrlKey) && e.shiftKey && (code === "KeyS" || keyLower === "s")

      // 3. macOS Screen Capture (Cmd + Shift + 3 / 4 / 5)
      const isMacCmdShiftNumber =
        e.metaKey &&
        e.shiftKey &&
        (code === "Digit3" || code === "Digit4" || code === "Digit5" || key === "3" || key === "4" || key === "5")

      // 4. ChromeOS Show Windows (Ctrl + Shift + F5)
      const isChromeOSShowWindows = (e.ctrlKey || e.metaKey) && e.shiftKey && (code === "F5" || key === "F5")

      // 5. DevTools (F12, Ctrl+Shift+I/C/J)
      const isDevTools =
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (code === "KeyI" || code === "KeyC" || code === "KeyJ" || keyLower === "i" || keyLower === "c" || keyLower === "j")) ||
        code === "F12" ||
        key === "F12"

      if (
        isPrintScreenKey ||
        isWinShiftS ||
        isMacCmdShiftNumber ||
        isChromeOSShowWindows ||
        isDevTools
      ) {
        // Synchronously activate protection with zero delay (Direct DOM mutation)
        activateInstantProtection()
      }
    }

    window.addEventListener("blur", handleBlur)
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("keydown", handleKeyDown, true)

    return () => {
      window.removeEventListener("blur", handleBlur)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [isStudent, activateInstantProtection, deactivateInstantProtection])

  useEffect(() => {
    if (!scope.kelasPraktikumId || !jobsheetId) return
    async function checkUnread() {
      try {
        const res = await getChatUnreadCount({
          kelasPraktikumId: scope.kelasPraktikumId,
          jobsheetId,
        })
        setUnreadChatCount(res.totalUnread || 0)
      } catch {
        // Ignore unread count error
      }
    }
    checkUnread()
  }, [scope.kelasPraktikumId, jobsheetId])

  const {
    jobsheet,
    course,
    submission,
    savedProgress,
    completedItems,
    completeCurrentProgressItem,
    markProgressItemCompleted,
    loading,
    error,
    updateExperiment,
    updateExercise,
    trackActivity,
    isBrowsingHistory,
  } = useWorkPage(effectiveCourseId, jobsheetId, routeMataKuliahId)

  const [scrollPercent, setScrollPercent] = useState(0)

  useEffect(() => {
    const pathnameWithoutQuery = location.pathname.split("?")[0]
    const parts = pathnameWithoutQuery.split("/")
    const theoryIndex = parts.indexOf("theory")
    if (theoryIndex !== -1 && parts[theoryIndex + 1]) {
      const id = parts[theoryIndex + 1]
      const completed = completedItems.some(item => item.type === "theory" && item.id === id)
      if (completed) {
        setScrollPercent(100)
      } else {
        setScrollPercent(0)
      }
    }
  }, [location.pathname, completedItems])

  const access = jobsheet?.access || { accessMode: "editable_normal", canEdit: true, canSubmit: true }
  const accessMode = access.accessMode
  const readOnly = !access.canEdit || accessMode === "locked_deadline" || accessMode === "locked_remedial_not_started" || accessMode === "locked_remedial_ended" || accessMode === "readonly_submitted" || accessMode === "readonly_reviewed" || isBrowsingHistory
  const formattedStartAt = access.remedialStartAt
    ? formatAcademicDateTime(access.remedialStartAt)
    : ""
  const formattedEndAt = access.remedialEndAt
    ? formatAcademicDateTime(access.remedialEndAt)
    : ""

  const handleWorkScroll = useCallback(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const isScrollable = scrollContainer.scrollHeight > scrollContainer.clientHeight
    if (!isScrollable) {
      setScrollPercent(100)
      completeCurrentProgressItem()
      return
    }

    const scrolled = scrollContainer.scrollTop
    const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight
    const percent = Math.min(100, Math.max(0, Math.round((scrolled / maxScroll) * 100)))

    setScrollPercent(percent)
    if (percent >= 90) {
      completeCurrentProgressItem()
    }
  }, [completeCurrentProgressItem])

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
    <div className="relative h-dvh flex flex-col bg-gray-50 overflow-hidden">
      <div
        id="workpage-protection-overlay"
        onClick={deactivateInstantProtection}
        style={{ display: isScreenCaptureDetected ? "flex" : "none" }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-950/95 p-6 text-center text-white backdrop-blur-xl cursor-pointer select-none"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mb-4 border border-amber-500/30">
          <EyeOff size={32} className="animate-pulse" />
        </div>
        <h2 className="text-xl font-bold">Layar Tidak Aktif / Proteksi Screenshot</h2>
        <p className="mt-2 max-w-md text-sm text-gray-300">
          Seluruh antarmuka pengerjaan praktikum dikaburkan secara otomatis untuk melindungi materi, kode, dan instruksi dari penangkapan layar.
        </p>
        <p className="mt-4 text-xs font-semibold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
          Klik di mana saja atau kembali ke halaman ini untuk melanjutkan.
        </p>
      </div>

      <div
        id="workpage-content-wrapper"
        className={`flex flex-col h-full w-full ${isScreenCaptureDetected ? "filter blur-2xl pointer-events-none select-none" : ""}`}
      >
        <WorkHeader
          title={jobsheet.title}
          backTo={academicJobsheetPath(effectiveCourseId, jobsheet.id, scope)}
          course={course}
          jobsheet={jobsheet}
          scope={scope}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          isChatOpen={isChatOpen}
          unreadChatCount={unreadChatCount}
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
                        Pengerjaan reguler telah dikunci. Anda masih dapat melihat riwayat pengerjaan dan hasil review.
                      </p>
                    </div>
                  )}

                  {accessMode === 'readonly_submitted' && (
                    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                      <h3 className="font-semibold text-blue-800">Sudah Dikumpulkan</h3>
                      <p className="mt-1">
                        Jobsheet ini sudah Anda kumpulkan dan sedang menunggu review dosen. Workspace berada dalam mode baca saja (read-only).
                      </p>
                    </div>
                  )}

                  {accessMode === 'readonly_reviewed' && (
                    <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <h3 className="font-semibold text-emerald-800">Review Selesai</h3>
                      <p className="mt-1">
                        Jobsheet ini telah selesai direview oleh dosen. Anda dapat melihat hasil penilaian dan umpan balik.
                      </p>
                    </div>
                  )}

                  {accessMode === 'locked_remedial_not_started' && (
                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-200/60 text-amber-800">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-amber-900">Remedial Belum Dimulai</h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          Sesi remedial belum dibuka. Sesi ini akan dibuka pada <span className="font-semibold">{formattedStartAt}</span> sampai <span className="font-semibold">{formattedEndAt}</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  {accessMode === 'locked_remedial_ended' && (
                    <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-200/60 text-rose-800">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-rose-900">Remedial Telah Berakhir</h4>
                        <p className="text-xs text-rose-800 mt-0.5">
                          Waktu pengerjaan sesi remedial telah berakhir pada <span className="font-semibold">{formattedEndAt}</span>. Workspace kini berada dalam mode baca saja.
                        </p>
                      </div>
                    </div>
                  )}

                  {accessMode === 'editable_remedial' && (
                    <div className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-md flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">Remedial Aktif (Sedang Berlangsung)</h4>
                        <p className="text-xs text-blue-100 mt-1">
                          Remedial aktif dari <span className="font-semibold">{formattedStartAt || "sekarang"}</span> sampai <span className="font-semibold">{formattedEndAt}</span>. Kerjakan ulang jobsheet sesuai instruksi dosen.
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
                      liveWorkspace: null,
                      readOnly,
                      markProgressItemCompleted,
                      scrollPercent,
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

        <WorkspaceChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          kelasPraktikumId={scope.kelasPraktikumId || ""}
          jobsheetId={jobsheetId || ""}
          onRead={() => setUnreadChatCount(0)}
          onOpenChat={() => setIsChatOpen(true)}
        />
      </div>
    </div>
  )
}
