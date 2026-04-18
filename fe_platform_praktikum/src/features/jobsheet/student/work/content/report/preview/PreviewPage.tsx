import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { getJobsheets } from "../../../../../../../entities/jobsheet/service"
import { getSubmissionByJobsheetId } from "../../../../../../../entities/jobsheetSubmission/service"

import type { Jobsheet } from "../../../../../../../entities/jobsheet/types" 
import type { JobsheetSubmission } from "../../../../../../../entities/jobsheetSubmission/types"

import StudentIdentityCard from "../components/StudentIdentityCard"
import ReportSection from "../components/report/ReportSection"
import ConclusionEditor from "../components/ConclusionEditor"
import SubmissionValidationCard from "./components/SubmissionValidationCard"
import ReportHeader from "../components/ReportHeader"
import TopProgressBar from "../../../../../../../components/loading/TopProgressBar"

export default function PreviewPage() {

  const { courseId, jobsheetId } = useParams()

  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [submission, setSubmission] = useState<JobsheetSubmission | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!courseId || !jobsheetId) return

      setLoading(true)

      try {
        const jobsheets = await getJobsheets(courseId)
        const selected = jobsheets.find(j => j.id === jobsheetId)

        const sub = await getSubmissionByJobsheetId(jobsheetId)

        setJobsheet(selected || null)
        setSubmission(sub)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [courseId, jobsheetId])

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

    {/* CONTENT WRAPPER */}
    <div className="px-6 py-8 lg:px-16">

      {/* CENTERED CONTAINER */}
      <div className="max-w-6xl mx-auto">

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">

            <StudentIdentityCard jobsheet={jobsheet} />

            <ReportSection
              jobsheet={jobsheet}
              submission={submission}
            />

            <ConclusionEditor
              jobsheet={jobsheet}
              submission={submission}
              onChange={(data) => {
                console.log("autosave conclusion:", data)
              }}
            />

          </div>

          {/* RIGHT */}
          <div className="lg:col-span-1 space-y-6">

            <div className="sticky top-6">
              <SubmissionValidationCard
                jobsheet={jobsheet}
                submission={submission}
              />
            </div>

          </div>

        </div>

      </div>
    </div>

  </div>
)
}