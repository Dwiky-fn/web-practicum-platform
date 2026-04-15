import { useState } from "react"
import type { Jobsheet } from "../../../../../../../entities/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../entities/jobsheetSubmission/types"
import { CheckCircle, XCircle } from "lucide-react"

interface Props {
  jobsheet: Jobsheet
  submission: JobsheetSubmission
  onSubmit?: () => void
}

function ValidationItem({
  label,
  valid,
}: {
  label: string
  valid: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      {valid ? (
        <CheckCircle className="text-green-600" size={18} />
      ) : (
        <XCircle className="text-red-500" size={18} />
      )}
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  )
}

export default function SubmissionValidationCard({
  jobsheet,
  submission,
  onSubmit,
}: Props) {

  const [isDeclared, setIsDeclared] = useState(false)

  /* ================= VALIDATION ================= */

  // 🔥 Percobaan (cek per item)
  const experimentValidList = jobsheet.task.experimentIds.map((id) =>
    submission.experiments.some(
      (exp) => exp.experimentId === id && exp.steps.length > 0
    )
  )

  const experimentValid = experimentValidList.every(Boolean)

  // 🔥 Latihan
  const exerciseValidList = jobsheet.task.exerciseIds.map((id) =>
    submission.exercises.some(
      (ex) => ex.exerciseId === id && ex.code
    )
  )

  const exerciseValid = exerciseValidList.every(Boolean)

  // 🔥 Kesimpulan
  const conclusionConfig = jobsheet.task.conclusionConfig

  const conclusionValid = conclusionConfig?.enabled
    ? conclusionConfig.required
      ? !!submission.conclusion?.content
      : true
    : true

  // 🔥 FINAL VALIDATION
  const isAllValid =
    experimentValid &&
    exerciseValid &&
    conclusionValid &&
    isDeclared

  /* ================= UI ================= */

  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 space-y-5">

      <h3 className="font-semibold text-gray-800">
        Validasi Laporan
      </h3>

      {/* ===== AUTO CHECKLIST ===== */}
      <div className="space-y-3">

        <ValidationItem
          label="Semua percobaan sudah dikerjakan"
          valid={experimentValid}
        />

        <ValidationItem
          label="Semua latihan sudah dikerjakan"
          valid={exerciseValid}
        />

        <ValidationItem
          label={
            conclusionConfig?.enabled
              ? conclusionConfig.required
                ? "Kesimpulan wajib diisi"
                : "Kesimpulan (opsional)"
              : "Kesimpulan tidak digunakan"
          }
          valid={conclusionValid}
        />

      </div>

      {/* ===== DECLARATION ===== */}
      <div className="border-t pt-4 space-y-3">

        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isDeclared}
            onChange={(e) => setIsDeclared(e.target.checked)}
            className="mt-1"
          />
          <span>
            Saya menyatakan bahwa laporan ini merupakan hasil pekerjaan saya sendiri
          </span>
        </label>

      </div>

      {/* ===== STATUS TEXT ===== */}
      <div>
        {isAllValid ? (
          <p className="text-sm text-green-600 font-medium">
            Laporan siap dikirim 🎉
          </p>
        ) : (
          <p className="text-sm text-red-500">
            Lengkapi semua bagian sebelum submit
          </p>
        )}
      </div>

      {/* ===== SUBMIT BUTTON ===== */}
      <button
        disabled={!isAllValid}
        onClick={onSubmit}
        className={`
          w-full py-2 rounded-lg font-medium transition
          ${
            isAllValid
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }
        `}
      >
        Submit Laporan
      </button>

    </div>
  )
}