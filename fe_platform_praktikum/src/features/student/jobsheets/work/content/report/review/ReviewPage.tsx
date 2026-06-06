import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"

import { getJobsheetById } from "../../../../../../../services/jobsheet/service"
import { getSubmissionByJobsheetId } from "../../../../../../../services/submission/service"

import type { Jobsheet } from "../../../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../services/submission/types"

import ReportHeader from "../components/ReportHeader"
import StudentIdentityCard from "../components/StudentIdentityCard"
import ReportSection from "../components/report/ReportSection"
import ReviewSection from "./components/ReviewSection"
import ReviewCommentPanel from "./components/ReviewCommentPanel"
import TopProgressBar from "../../../../../../../components/loading/TopProgressBar"
import ConclusionEditor from "../components/ConclusionEditor"
import { useCurrentUser } from "../../../../../../../services/user/useCurrentUser"
import Navbar from "../../../../../../../components/navbar/Navbar"

export default function ReviewPage() {
  const { courseId, jobsheetId } = useParams()
  const { user } = useCurrentUser()

  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadData() {
      if (!courseId || !jobsheetId || !user) return

      setLoading(true)
      setError("")

      try {
        const selected = await getJobsheetById(courseId, jobsheetId)
        const sub = await getSubmissionByJobsheetId(courseId, jobsheetId, user.id)

        setJobsheet(selected || null)
        setSubmission(sub)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat hasil review.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [courseId, jobsheetId, user])

  if (loading) {
    return <TopProgressBar />
  }

  if (!jobsheet || !submission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error || "Hasil review belum tersedia untuk jobsheet ini."}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <ReportHeader
        title={jobsheet.title}
        backTo={`/courses/${courseId}/jobsheets/${jobsheet.id}/works/task`}
      />

      <div className="px-6 py-8 lg:px-16">
        <div className="max-w-6xl mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT */}
            <div className="lg:col-span-2 space-y-6">

              <StudentIdentityCard jobsheet={jobsheet} />

              <ReviewSection submission={submission} />

              <ReportSection
                jobsheet={jobsheet}
                submission={submission}
              />

              <ConclusionEditor
                jobsheet={jobsheet}
                submission={submission}
                readOnly={true}
              />

            </div>

            {/* RIGHT */}
            <div className="lg:col-span-1">

              <div className="sticky top-6">
                <ReviewCommentPanel submission={submission} />
              </div>

            </div>

          </div>

        </div>
      </div>

    </div>
  )
}
