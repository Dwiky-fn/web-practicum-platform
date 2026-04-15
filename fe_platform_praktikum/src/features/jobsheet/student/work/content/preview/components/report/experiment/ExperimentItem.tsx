import type { SubmissionStep } from "../../../../../../../../../entities/jobsheetSubmission/types"
import OutputPanel from "../../../../practice/components/workSpace/OutputPanel"
import RichTextViewer from "../../../../../../../../../shared/editor/RichTextViewer"

interface Props {
  title: string
  index: number
  instructionSteps: string[]
  steps: SubmissionStep[]
}

export default function ExperimentItem({
  title,
  index,
  instructionSteps,
  steps,
}: Props) {
  return (
    <div className="space-y-8">

      {/* ===== Judul Percobaan ===== */}
      <p className="font-semibold text-gray-800">
        {String.fromCharCode(65 + index)}. {title}
      </p>

      {/* ===== Steps ===== */}
      {instructionSteps.length > 0 ? (
        instructionSteps.map((instruction, i) => {

          const stepData = steps.find((s) => s.step === i + 1)

          return (
            <div
              key={i}
              className="pl-4 border-l-2 border-gray-200 space-y-5"
            >

              {/* 🔥 INSTRUKSI */}
              <p className="text-sm font-medium text-gray-700">
                {i + 1}. {instruction}
              </p>

              {/* CODE */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Kode Program</p>
                <div className="bg-gray-100 border rounded-md p-4">
                  {stepData?.code ? (
                    <RichTextViewer content={stepData.code} />
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