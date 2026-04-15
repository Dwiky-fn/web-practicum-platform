import type { Jobsheet } from "../../../../../../../../../entities/jobsheet/types"
import type { JobsheetSubmission } from "../../../../../../../../../entities/jobsheetSubmission/types"
import OutputPanel from "../../../../practice/components/workSpace/OutputPanel"
import RichTextViewer from "../../../../../../../../../shared/editor/RichTextViewer"

interface Props {
  jobsheet: Jobsheet
  submission: JobsheetSubmission
}

export default function ExerciseReport({
  jobsheet,
  submission,
}: Props) {

  const exercisesSubmission = submission?.exercises ?? []

  const exerciseList = jobsheet.exercises

  return (
    <div className="bg-white border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="bg-gray-100 px-6 py-3 border-b font-semibold text-gray-800">
        Latihan
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">

        {exerciseList.map((ex, index) => {

          const submissionData = exercisesSubmission.find(
            (s) => s.exerciseId === ex.id
          )

          return (
            <div key={ex.id} className="space-y-4">

              {/* Title */}
              <p className="font-semibold text-gray-800">
                {String.fromCharCode(65 + index)}. {ex.title}
              </p>

              {submissionData ? (
                <div className="space-y-4">

                  {/* Code */}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Kode Program
                    </p>
                    <div className="bg-gray-100 rounded-md p-4">
                      <RichTextViewer content={submissionData.code} />
                    </div>
                  </div>

                  {/* Output */}
                  <OutputPanel output={submissionData?.output ?? ""} />

                  {/* Analisis */}
                  <div>
                    <p className="text-sm font-medium mb-1">
                      Hasil Analisis:
                    </p>
                    <div className="bg-gray-100 rounded-md p-3">
                      <RichTextViewer content={submissionData.analysis} />
                    </div>
                  </div>

                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Belum ada jawaban untuk latihan ini
                </p>
              )}

            </div>
          )
        })}

        {exerciseList.length === 0 && (
          <p className="text-sm text-gray-500 text-center">
            Tidak ada latihan
          </p>
        )}

      </div>
    </div>
  )
}