import type { Jobsheet } from "../../../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../services/submission/types"
import { useCurrentUser } from "../../../../../../../services/user/useCurrentUser"
import { formatAcademicDateTime } from "../../../../../../../shared/utils/formatAcademicDateTime"

interface Props {
  jobsheet: Jobsheet
  submission?: JobsheetSubmission | null
}

export default function StudentIdentityCard({ jobsheet, submission }: Props) {
  const { user, loading } = useCurrentUser()

  const getStatusLabel = () => {
    if (!submission?.review?.decision) {
      if (submission?.status === "ACCEPTED") return "Sudah Dinilai"
      if (submission?.status === "SUBMITTED") return "Sudah Dikumpulkan"
      if (submission?.status === "REVISION") return "Perlu Revisi"
      return "Pengerjaan"
    }
    if (submission.review.decision === "ACCEPTED") return "Diterima (Dinilai)"
    if (submission.review.decision === "REVISION") return "Perlu Revisi"
    return "Menunggu Review"
  }

  const finalScore = submission?.review?.finalScore ?? submission?.score

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs font-sans">
      <div className="bg-gray-50/80 px-6 py-3.5 border-b border-gray-200/80 font-bold text-gray-800 text-sm md:text-base">
        Informasi & Penilaian Praktikum
      </div>

      <div className="p-6 text-sm">
        <dl className="grid gap-3 md:grid-cols-[160px_1fr] items-center">
          <dt className="text-gray-500 font-medium">Nama</dt>
          <dd className="text-gray-900 font-semibold">{loading ? "Loading..." : user?.fullname || "-"}</dd>

          <dt className="text-gray-500 font-medium">NIM</dt>
          <dd className="text-gray-900 font-semibold">{loading ? "Loading..." : user?.studentProfile?.nim || "-"}</dd>

          <dt className="text-gray-500 font-medium">Materi</dt>
          <dd className="text-gray-900 font-medium">{jobsheet.title}</dd>

          {submission && (
            <>
              <dt className="text-gray-500 font-medium">Nilai</dt>
              <dd className="text-gray-900 font-bold text-base text-blue-700">
                {finalScore !== undefined && finalScore !== null ? finalScore : "-"}
              </dd>

              <dt className="text-gray-500 font-medium">Status</dt>
              <dd className="text-gray-900 font-medium">{getStatusLabel()}</dd>

              <dt className="text-gray-500 font-medium">Diperbarui</dt>
              <dd className="text-gray-900 font-medium">{formatAcademicDateTime(submission.updatedAt)}</dd>

              {submission.attemptLabel && (
                <>
                  <dt className="text-gray-500 font-medium">Jenis Pengerjaan</dt>
                  <dd>
                    <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded text-xs inline-block">
                      {submission.attemptLabel}
                    </span>
                  </dd>
                </>
              )}

              {submission.isAutoSubmitted && (
                <>
                  <dt className="text-gray-500 font-medium">Sumber Submission</dt>
                  <dd>
                    <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded text-xs inline-block">
                      Dikumpulkan otomatis setelah deadline
                    </span>
                  </dd>
                </>
              )}
            </>
          )}
        </dl>
      </div>
    </div>
  )
}
