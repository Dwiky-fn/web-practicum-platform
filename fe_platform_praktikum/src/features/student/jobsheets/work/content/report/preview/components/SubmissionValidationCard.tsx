import { useState } from "react"
import { CheckCircle, XCircle } from "lucide-react"
import { splitInstructionContent } from "../../../../../../../../shared/utils/splitInstructionContent"
import type { Jobsheet } from "../../../../../../../../services/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../../services/submission/types"

interface Props {
  jobsheet: Jobsheet
  submission: JobsheetSubmission
  onSubmit?: () => void
  submitting?: boolean
  onSaveDraft?: () => void
  savingDraft?: boolean
  readOnly?: boolean
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
  submitting = false,
  onSaveDraft,
  savingDraft = false,
  readOnly = false,
}: Props) {

  const [isDeclared, setIsDeclared] = useState(false)

  /* VALIDATION */

  // Percobaan
  const experimentValidList = jobsheet.task.experimentIds.map((id) => {
    const exp = submission.experiments.find((e) => e.experimentId === id)
    if (!exp) return false

    const jobsheetExp = jobsheet.experiments.find((e) => e.id === id)
    const expectedSteps = splitInstructionContent(jobsheetExp?.instructionContent).length || 1

    return (
      exp.steps.length >= expectedSteps &&
      exp.steps.every(
        (step) =>
          step.output.trim() !== "" &&
          (step.analysis?.content?.length ?? 0) > 0
      )
    )
  })

  const experimentValid = experimentValidList.every(Boolean)

  // Latihan
  const exerciseValidList = jobsheet.task.exerciseIds.map((id) => {
    const ex = submission.exercises.find((e) => e.exerciseId === id)
    if (!ex) return false

    return (
      ex.output.trim() !== "" &&
      (ex.analysis?.content?.length ?? 0) > 0
    )
  })

  const exerciseValid = exerciseValidList.every(Boolean)

  // Kesimpulan
  const conclusionConfig = jobsheet.task.conclusionConfig

  const conclusionValid = conclusionConfig?.enabled
    ? conclusionConfig.required
      ? (submission.conclusion?.wordCount ?? 0) >= (conclusionConfig.minWord ?? 1)
      : true
    : true

  // FINAL VALIDATION
  const isAllValid =
    experimentValid &&
    exerciseValid &&
    conclusionValid &&
    isDeclared

  /* UI */

  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 space-y-5">

      <h3 className="font-semibold text-gray-800">
        Validasi Laporan
      </h3>

      {/* AUTO CHECKLIST */}
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

      {/* DECLARATION */}
      <div className="border-t pt-4 space-y-3">

        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isDeclared}
            disabled={readOnly}
            onChange={(e) => setIsDeclared(e.target.checked)}
            className="mt-1"
          />
          <span>
            Saya menyatakan bahwa laporan ini merupakan hasil pekerjaan saya sendiri
          </span>
        </label>

      </div>

      {/* STATUS TEXT */}
      <div>
        {readOnly ? (
          <p className="text-sm text-gray-500">
            Pengerjaan normal telah dikunci.
          </p>
        ) : isAllValid ? (
          <p className="text-sm text-green-600 font-medium">
            Laporan siap dikirim
          </p>
        ) : (
          <p className="text-sm text-red-500">
            Lengkapi semua bagian sebelum submit
          </p>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={readOnly || savingDraft || submitting}
          onClick={onSaveDraft}
          className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50 text-center cursor-pointer"
        >
          {savingDraft ? "Menyimpan..." : "Simpan Draft"}
        </button>

        <button
          disabled={readOnly || !isAllValid || submitting || savingDraft}
          onClick={onSubmit}
          className={`
            flex-1 py-2 rounded-lg font-medium transition
            ${!readOnly && isAllValid && !submitting && !savingDraft
              ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          {submitting ? "Mengirim..." : "Submit Laporan"}
        </button>
      </div>

    </div>
  )
}
