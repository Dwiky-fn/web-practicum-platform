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

export default function ReviewPage() {
  const { courseId, jobsheetId } = useParams()
  const { user } = useCurrentUser()

  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!courseId || !jobsheetId || !user) return

      setLoading(true)

      try {
        const selected = await getJobsheetById(courseId, jobsheetId)
        const sub = await getSubmissionByJobsheetId(courseId, jobsheetId, user.id)

        setJobsheet(selected || null)
        setSubmission(sub)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [courseId, jobsheetId, user])

  if (loading || !jobsheet || !submission) {
    return <TopProgressBar />
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
