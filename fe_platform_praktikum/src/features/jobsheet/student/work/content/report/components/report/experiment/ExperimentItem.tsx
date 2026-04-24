import type { JobsheetSubmission, StepData } from "../../../../../../../../../services/submission/types" 

import OutputPanel from "../../../../../../../../../shared/code-editor/OutputPanel"
import RichTextViewer from "../../../../../../../../../shared/editor/RichTextViewer"

interface Props {
  title: string
  index: number
  experimentId: string
  instructionSteps: string[]
  steps: StepData[]
  submission: JobsheetSubmission
}

export default function ExperimentItem({
  title,
  index,
  experimentId,
  instructionSteps,
  steps,
  submission
}: Props) {

  const comments = submission.review?.comments ?? []

  return (
    <div className="space-y-8">

      {/* ===== Judul Percobaan ===== */}
      <p className="font-semibold text-gray-800">
        {String.fromCharCode(65 + index)}. {title}
      </p>

      {/* ===== Steps ===== */}
      {instructionSteps.length > 0 ? (
        instructionSteps.map((instruction, i) => {

          const stepNumber = i + 1

          const stepData = steps.find((s) => s.step === stepNumber)

          const stepComments = comments.filter(
            (c) =>
              c.experimentId === experimentId &&
              c.step === stepNumber
          )

          const hasComment = stepComments.length > 0

          return (
            <div
              key={i}
              className={`pl-4 border-l-4 space-y-5 transition-all duration-200 ${
                hasComment
                  ? "border-yellow-400 bg-yellow-50/40 rounded-md p-3"
                  : "border-gray-200"
              }`}
            >

              {/* 🔥 HEADER STEP */}
              <div className="flex items-center justify-between">

                <p className="text-sm font-medium text-gray-700">
                  {stepNumber}. {instruction}
                </p>

                {/* 🔥 BADGE KOMENTAR */}
                {hasComment && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                    Ada komentar
                  </span>
                )}
              </div>

              {/* 🔥 KOMENTAR DOSEN (INLINE, LANGSUNG KELIHATAN) */}
              {hasComment && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-md p-3 text-sm text-yellow-900">
                  {stepComments.map((c, idx) => (
                    <p key={idx}>💬 {c.comment}</p>
                  ))}
                </div>
              )}

              {/* CODE */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Kode Program</p>
                <div className="bg-gray-100 border rounded-md p-4">
                  {stepData?.code ? (
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {stepData.code}
                    </pre>
                  ) : (
                    <p className="text-sm text-gray-400">Belum ada kode</p>
                  )}
                </div>
              </div>

              {/* OUTPUT */}
              <OutputPanel output={stepData?.output ?? ""} />

              {/* ANALISIS */}
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Hasil Analisis
                </p>
                <div className="bg-white border border-gray-200 rounded-md p-3">
                  {stepData?.analysis ? (
                    <RichTextViewer content={stepData.analysis} />
                  ) : (
                    <p className="text-sm text-gray-400">
                      Belum ada analisis
                    </p>
                  )}
                </div>
              </div>

            </div>
          )
        })
      ) : (
        <p className="text-sm text-gray-400 italic">
          Tidak ada instruksi
        </p>
      )}

    </div>
  )
}