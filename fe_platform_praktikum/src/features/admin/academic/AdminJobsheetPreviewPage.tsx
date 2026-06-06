import { ArrowLeft, BookOpen, CheckSquare, Code2, FileText, Target } from "lucide-react"
import type { JSONContent } from "@tiptap/react"
import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import RichTextViewer from "../../../components/editor/RichTextViewer"
import { getJobsheetById } from "../../../services/jobsheet/service"
import type { Exercise, Experiment, Jobsheet } from "../../../services/jobsheet/types"
import AdminLayout from "../components/AdminLayout"
import { AdminPanel, EmptyState } from "../components/AdminUI"

const emptyDoc: JSONContent = { type: "doc", content: [] }

function hasContent(content?: JSONContent) {
  return Boolean(content?.content?.length)
}

function PreviewSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <AdminPanel className="p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
        <span className="text-blue-700">{icon}</span>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </AdminPanel>
  )
}

function ReadOnlyInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
        {value || "-"}
      </div>
    </div>
  )
}

function RichContentBlock({ content }: { content?: JSONContent }) {
  if (!hasContent(content)) {
    return <p className="text-sm text-gray-500">Belum ada konten.</p>
  }

  return <RichTextViewer content={content ?? emptyDoc} role="MAHASISWA" mode="viewer-default" />
}

function CodeBlock({ code, language }: { code?: string; language?: string }) {
  if (!code) return null

  return (
    <pre className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-gray-950 p-4 text-xs text-gray-100">
      <code>{code}</code>
      {language && <span className="sr-only">{language}</span>}
    </pre>
  )
}

function PracticeItem({
  item,
  language,
  type,
}: {
  item: Experiment | Exercise
  language?: string
  type: "Percobaan" | "Latihan"
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">{type} {item.order}</p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">{item.title}</h3>
        </div>
      </div>

      <div className="mt-4">
        <RichContentBlock content={item.instructionContent} />
        <CodeBlock code={item.defaultTemplateCode} language={language} />
      </div>
    </div>
  )
}

export default function AdminJobsheetPreviewPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get("courseId")
  const [jobsheet, setJobsheet] = useState<Jobsheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id || !courseId) {
      setError("Data jobsheet tidak lengkap.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")
    getJobsheetById(courseId, id)
      .then(setJobsheet)
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat jobsheet."))
      .finally(() => setLoading(false))
  }, [courseId, id])

  const taskExperimentTitles = jobsheet?.experiments
    .filter((experiment) => jobsheet.task.experimentIds.includes(experiment.id))
    .map((experiment) => experiment.title) ?? []

  const taskExerciseTitles = jobsheet?.exercises
    .filter((exercise) => jobsheet.task.exerciseIds.includes(exercise.id))
    .map((exercise) => exercise.title) ?? []

  return (
    <AdminLayout>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      {loading ? (
        <EmptyState title="Memuat preview jobsheet..." />
      ) : error || !jobsheet ? (
        <EmptyState title={error || "Jobsheet tidak ditemukan"} />
      ) : (
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Preview Jobsheet Praktikum</h1>
              <p className="mt-2 text-sm text-gray-600">
                Admin hanya dapat melihat isi jobsheet. Pengubahan konten dilakukan oleh dosen.
              </p>
            </div>
            <span className="inline-flex h-9 items-center rounded-full bg-blue-50 px-3 text-xs font-semibold text-blue-700">
              Status: {jobsheet.status}
            </span>
          </div>

          <div className="space-y-6">
            <PreviewSection title="Informasi Umum" icon={<FileText size={18} />}>
              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnlyInfo label="Judul Jobsheet" value={jobsheet.title} />
                <ReadOnlyInfo label="Bahasa Pemrograman" value={jobsheet.programmingLanguageDisplayName} />
                <ReadOnlyInfo label="Deadline" value={jobsheet.deadline} />
                <ReadOnlyInfo label="Deskripsi" value={jobsheet.description} />
              </div>
              {hasContent(jobsheet.summary) && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Ringkasan</p>
                  <RichContentBlock content={jobsheet.summary} />
                </div>
              )}
            </PreviewSection>

            <PreviewSection title="Tujuan Praktikum" icon={<Target size={18} />}>
              <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
                {jobsheet.goal || "Belum ada tujuan praktikum."}
              </p>
            </PreviewSection>

            <PreviewSection title="Dasar Teori" icon={<BookOpen size={18} />}>
              <div className="space-y-5">
                {jobsheet.theory.length ? jobsheet.theory.map((theory) => (
                  <div key={theory.id} className="rounded-md border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase text-blue-700">Subtopik {theory.order}</p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">{theory.title}</h3>
                    <div className="mt-4">
                      <RichContentBlock content={theory.content} />
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">Belum ada dasar teori.</p>
                )}
              </div>
            </PreviewSection>

            <PreviewSection title="Percobaan Praktikum" icon={<Code2 size={18} />}>
              <div className="space-y-4">
                {jobsheet.experiments.length ? jobsheet.experiments.map((experiment) => (
                  <PracticeItem
                    key={experiment.id}
                    item={experiment}
                    language={jobsheet.programmingLanguage}
                    type="Percobaan"
                  />
                )) : (
                  <p className="text-sm text-gray-500">Belum ada percobaan praktikum.</p>
                )}
              </div>
            </PreviewSection>

            <PreviewSection title="Latihan Praktikum" icon={<CheckSquare size={18} />}>
              <div className="space-y-4">
                {jobsheet.exercises.length ? jobsheet.exercises.map((exercise) => (
                  <PracticeItem
                    key={exercise.id}
                    item={exercise}
                    language={jobsheet.programmingLanguage}
                    type="Latihan"
                  />
                )) : (
                  <p className="text-sm text-gray-500">Belum ada latihan praktikum.</p>
                )}
              </div>
            </PreviewSection>

            <PreviewSection title="Tugas Praktikum" icon={<FileText size={18} />}>
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <ReadOnlyInfo
                    label="Percobaan untuk laporan"
                    value={taskExperimentTitles.length ? taskExperimentTitles.join(", ") : "Tidak ada"}
                  />
                  <ReadOnlyInfo
                    label="Latihan untuk laporan"
                    value={taskExerciseTitles.length ? taskExerciseTitles.join(", ") : "Tidak ada"}
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Instruksi Laporan</p>
                  <RichContentBlock content={jobsheet.task.instructionContent} />
                </div>

                {hasContent(jobsheet.task.additionalNoteContent) && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Catatan Tambahan</p>
                    <RichContentBlock content={jobsheet.task.additionalNoteContent} />
                  </div>
                )}
              </div>
            </PreviewSection>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
