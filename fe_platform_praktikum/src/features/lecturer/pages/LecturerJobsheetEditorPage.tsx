import type { JSONContent } from "@tiptap/react"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import RichTextEditor from "../../../components/editor/RichTextEditor"
import TopProgressBar from "../../../components/loading/TopProgressBar"
import { useCurrentUser } from "../../../services/user/useCurrentUser"
import LecturerLayout from "../components/LecturerLayout"
import LecturerTemplateWorkspace from "../components/LecturerTemplateWorkspace"
import {
  createLecturerJobsheet,
  getLecturerCourseDataset,
  getLecturerCourseGroup,
  getLecturerJobsheetById,
  publishLecturerJobsheet,
  updateLecturerJobsheet,
  type LecturerCourseDataset,
  type LecturerPracticeInput,
  type LecturerTheoryInput,
} from "../service"
import {
  LecturerButton,
  LecturerModal,
  LecturerPanel,
  FieldRow,
  PageHeader,
  inputClass,
} from "../components/LecturerUI"

const emptyDoc: JSONContent = { type: "doc", content: [] }

type PracticeEditorItem = LecturerPracticeInput & {
  isReported: boolean
}

type PublishClassSetting = {
  classId: string
  className: string
  isActive: boolean
  deadline: string
}

function extractTextContent(node: JSONContent | JSONContent[] | string | undefined): string {
  if (!node) return ""
  if (typeof node === "string") return node
  if (Array.isArray(node)) return node.map(extractTextContent).join("")
  return [node.text ?? "", ...(node.content ?? []).map(extractTextContent)].join("")
}

function createLocalId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function toDatetimeLocal(value: string | undefined) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  const offset = parsed.getTimezoneOffset()
  const local = new Date(parsed.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function createTheoryItem(index: number): LecturerTheoryInput {
  return {
    id: createLocalId("theory"),
    title: `Subtopik ${index}`,
    content: emptyDoc,
  }
}

function createExperimentItem(index: number, language: "java" | "python" = "java"): PracticeEditorItem {
  return {
    id: createLocalId("exp"),
    title: `Percobaan ${index}`,
    instructionContent: emptyDoc,
    templateCode: language === "python" ? 'print("Hello, Python!")' : `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}`,
    isReported: true,
    rubric: 0,
  }
}

function createExerciseItem(index: number, language: "java" | "python" = "java"): PracticeEditorItem {
  return {
    id: createLocalId("exe"),
    title: `Latihan ${index}`,
    instructionContent: emptyDoc,
    templateCode: language === "python" ? 'print("Hello, Python!")' : `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}`,
    isReported: true,
    rubric: 0,
  }
}

export default function LecturerJobsheetEditorPage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const { courseId = "", jobsheetId } = useParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [publishOpen, setPublishOpen] = useState(false)
  const [courseName, setCourseName] = useState("")
  const [dataset, setDataset] = useState<LecturerCourseDataset | null>(null)
  const [savedJobsheetId, setSavedJobsheetId] = useState(jobsheetId ?? "")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [goalContent, setGoalContent] = useState<JSONContent>(emptyDoc)
  const [programmingLanguage, setProgrammingLanguage] = useState<"java" | "python" | "">("")
  const [theoryItems, setTheoryItems] = useState<LecturerTheoryInput[]>([createTheoryItem(1)])
  const [experiments, setExperiments] = useState<PracticeEditorItem[]>([])
  const [exercises, setExercises] = useState<PracticeEditorItem[]>([])
  const [taskInstruction, setTaskInstruction] = useState<JSONContent>(emptyDoc)
  const [taskAdditionalNote, setTaskAdditionalNote] = useState<JSONContent>(emptyDoc)
  const [requireSelfDeclaration, setRequireSelfDeclaration] = useState(false)
  const [conclusionRequired, setConclusionRequired] = useState(false)
  const [conclusionMinWord, setConclusionMinWord] = useState("150")
  const [publishSettings, setPublishSettings] = useState<PublishClassSetting[]>([])

  const isCreate = !savedJobsheetId
  const activeJobsheetId = savedJobsheetId || jobsheetId || ""

  useEffect(() => {
    async function loadData() {
      if (!user || user.role !== "DOSEN" || !courseId) return

      setLoading(true)
      setError("")
      setSuccessMessage("")

      try {
        const [course, nextDataset] = await Promise.all([
          getLecturerCourseGroup(user.id, courseId),
          getLecturerCourseDataset(user.id, courseId),
        ])

        setCourseName(course?.name ?? "")
        setDataset(nextDataset)

        if (savedJobsheetId) {
          const selectedJobsheet = await getLecturerJobsheetById(courseId, savedJobsheetId)
          setTitle(selectedJobsheet.title)
          setDescription(selectedJobsheet.description)
          setGoalContent(
            selectedJobsheet.goal
              ? {
                  type: "doc",
                  content: [{ type: "paragraph", content: [{ type: "text", text: selectedJobsheet.goal }] }],
                }
              : emptyDoc,
          )
          const lang = (selectedJobsheet.programmingLanguage || "java") as "java" | "python"
          setProgrammingLanguage(lang)
          setTheoryItems(
            selectedJobsheet.theory.length
              ? selectedJobsheet.theory.map((item) => ({
                  id: item.id,
                  title: item.title,
                  content: item.content,
                }))
              : [createTheoryItem(1)],
          )
          setExperiments(
            selectedJobsheet.experiments.length
              ? selectedJobsheet.experiments.map((item) => ({
                  id: item.id,
                  title: item.title,
                  instructionContent: item.instructionContent ?? emptyDoc,
                  templateCode: item.defaultTemplateCode,
                  isReported: item.isReported,
                  rubric: item.rubric ?? 0,
                }))
              : [createExperimentItem(1, lang)],
          )
          setExercises(
            selectedJobsheet.exercises.length
              ? selectedJobsheet.exercises.map((item) => ({
                  id: item.id,
                  title: item.title,
                  instructionContent: item.instructionContent ?? emptyDoc,
                  templateCode: item.defaultTemplateCode ?? "",
                  isReported: item.isReported,
                  rubric: item.rubric ?? 0,
                }))
              : [createExerciseItem(1, lang)],
          )
          setTaskInstruction(selectedJobsheet.task.instructionContent ?? emptyDoc)
          setTaskAdditionalNote(selectedJobsheet.task.additionalNoteContent ?? emptyDoc)
          setRequireSelfDeclaration(selectedJobsheet.task.requireSelfDeclaration)
          setConclusionRequired(Boolean(selectedJobsheet.task.conclusionConfig?.required))
          setConclusionMinWord(String(selectedJobsheet.task.conclusionConfig?.minWord ?? 150))

          const fallbackDeadline = toDatetimeLocal(selectedJobsheet.deadline)
          const classSettings = (nextDataset?.course.classes ?? []).map((classItem) => {
            const classDetail = nextDataset?.classDetails.find((item) => item.id === classItem.id)
            const assignedJobsheet = classDetail?.jobsheets.find((item) => item.id === savedJobsheetId)

            return {
              classId: classItem.id,
              className: classItem.name,
              isActive: assignedJobsheet?.status === "Aktif",
              deadline: fallbackDeadline,
            }
          })

          setPublishSettings(classSettings)
        } else {
          const firstClass = nextDataset?.course.classes?.[0]
          const defaultLang = firstClass?.programmingLanguage || "java"
          setProgrammingLanguage(defaultLang)
          setExperiments([createExperimentItem(1, defaultLang)])
          setExercises([createExerciseItem(1, defaultLang)])
          setPublishSettings(
            (nextDataset?.course.classes ?? []).map((classItem) => ({
              classId: classItem.id,
              className: classItem.name,
              isActive: false,
              deadline: "",
            })),
          )
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat editor jobsheet.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [courseId, savedJobsheetId, user])

  const totalRubric = useMemo(() => {
    const expTotal = experiments.reduce((acc, item) => acc + (item.rubric ?? 0), 0)
    const exeTotal = exercises.reduce((acc, item) => acc + (item.rubric ?? 0), 0)
    return expTotal + exeTotal
  }, [experiments, exercises])

  function buildPayload() {
    return {
      lecturerId: user?.id ?? "",
      title,
      description,
      goal: extractTextContent(goalContent).trim(),
      programmingLanguage: programmingLanguage || "java",
      theory: theoryItems.map((item, index) => ({
        id: item.id,
        title: item.title || `Subtopik ${index + 1}`,
        content: item.content || emptyDoc,
      })),
      experiments: experiments.map((item, index) => ({
        id: item.id,
        title: item.title || `Percobaan ${index + 1}`,
        instructionContent: item.instructionContent || emptyDoc,
        templateCode: item.templateCode,
        rubric: Number(item.rubric) || 0,
      })),
      exercises: exercises.map((item, index) => ({
        id: item.id,
        title: item.title || `Latihan ${index + 1}`,
        instructionContent: item.instructionContent || emptyDoc,
        templateCode: item.templateCode,
        rubric: Number(item.rubric) || 0,
      })),
      task: {
        instructionContent: taskInstruction,
        additionalNoteContent: taskAdditionalNote,
        requireSelfDeclaration,
        conclusionConfig: {
          enabled: true,
          required: conclusionRequired,
          minWord: Number(conclusionMinWord) || 150,
        },
        experimentItems: experiments
          .filter((item) => item.id)
          .map((item) => ({ id: item.id as string, isReported: item.isReported })),
        exerciseItems: exercises
          .filter((item) => item.id)
          .map((item) => ({ id: item.id as string, isReported: item.isReported })),
      },
    }
  }

  async function ensureSaved() {
    if (!user || !courseId) return ""
    const payload = buildPayload()

    if (activeJobsheetId) {
      await updateLecturerJobsheet(courseId, activeJobsheetId, payload)
      return activeJobsheetId
    }

    const created = await createLecturerJobsheet(courseId, payload)
    setSavedJobsheetId(created.id)
    return created.id
  }

  async function handleSaveDraft() {
    if (!user) return

    if (totalRubric !== 100) {
      setError(`Jumlah total bobot rubrik harus pas 100%. Saat ini: ${totalRubric}%.`)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")

      const nextId = await ensureSaved()
      setSuccessMessage("Draft jobsheet berhasil disimpan.")

      if (isCreate && nextId) {
        navigate(`/courses/${courseId}/jobsheets/${nextId}/edit`, { replace: true })
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan draft jobsheet.")
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!user) return

    if (totalRubric !== 100) {
      setError(`Jumlah total bobot rubrik harus pas 100%. Saat ini: ${totalRubric}%.`)
      setPublishOpen(false)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccessMessage("")

      const nextId = await ensureSaved()
      await publishLecturerJobsheet(courseId, nextId, {
        lecturerId: user.id,
        classes: publishSettings.map((item) => ({
          classId: item.classId,
          deadline: item.deadline,
          isActive: item.isActive,
        })),
      })

      setPublishOpen(false)
      navigate(`/courses/${courseId}/jobsheets`)
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Gagal mempublikasikan jobsheet.")
    } finally {
      setSaving(false)
    }
  }

  const handleLanguageChange = (newLang: "java" | "python") => {
    if (programmingLanguage && programmingLanguage !== newLang) {
      const confirm = window.confirm(
        "Apakah Anda yakin ingin mengubah bahasa pemrograman? Kode template percobaan/latihan yang belum disimpan akan di-reset ke default bahasa baru."
      )
      if (!confirm) return

      // Auto-update templates to default code of the new language
      setExperiments((current) =>
        current.map((item) => ({
          ...item,
          templateCode: newLang === "python" ? 'print("Hello, Python!")' : `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}`,
        }))
      )
      setExercises((current) =>
        current.map((item) => ({
          ...item,
          templateCode: newLang === "python" ? 'print("Hello, Python!")' : `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}`,
        }))
      )
    }
    setProgrammingLanguage(newLang)
  }

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} />
        Kembali
      </button>

      <PageHeader
        title={isCreate ? "Buat Jobsheet Praktikum" : `Edit Jobsheet ${title || ""}`}
        subtitle={`Mata Kuliah: ${courseName || "-"}`}
        right={
          <span className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
            Status: {activeJobsheetId ? "Draft / Tersimpan" : "Draft Baru"}
          </span>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="mx-auto max-w-7xl grid gap-5 lg:grid-cols-[1fr_300px] items-start">
        <div className="space-y-5">
        <LecturerPanel className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Informasi Umum</h2>
          <div className="space-y-4">
            <FieldRow label="Judul Jobsheet">
              <input
                className={inputClass}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Masukkan judul jobsheet"
              />
            </FieldRow>
            <FieldRow label="Deskripsi Singkat">
              <input
                className={inputClass}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Masukkan deskripsi singkat"
              />
            </FieldRow>
            <FieldRow label="Bahasa Pemrograman">
              <select
                className={inputClass}
                value={programmingLanguage}
                onChange={(event) => handleLanguageChange(event.target.value as "java" | "python")}
              >
                {programmingLanguage === "" && <option value="">Pilih Bahasa...</option>}
                <option value="java">Java</option>
                <option value="python">Python</option>
              </select>
            </FieldRow>
          </div>
        </LecturerPanel>

        <LecturerPanel className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Tujuan Praktikum</h2>
          <RichTextEditor
            value={goalContent}
            onChange={setGoalContent}
            role="DOSEN"
            placeholder="Tulis tujuan praktikum dengan format lengkap..."
          />
        </LecturerPanel>

        <LecturerPanel className="p-5">
          <div className="mb-4 border-b border-gray-200 pb-3">
            <h2 className="text-lg font-semibold">Dasar Teori</h2>
          </div>
          <div className="space-y-4">
            {theoryItems.map((item, index) => (
              <div key={item.id ?? `theory-${index}`} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-800">Subtopik {index + 1}</p>
                  {theoryItems.length > 1 && (
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setTheoryItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <FieldRow label="Judul">
                  <input
                    className={inputClass}
                    value={item.title}
                    onChange={(event) =>
                      setTheoryItems((current) =>
                        current.map((entry, currentIndex) =>
                          currentIndex === index ? { ...entry, title: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder={`Subtopik ${index + 1}`}
                  />
                </FieldRow>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Materi</p>
                  <RichTextEditor
                    value={item.content}
                    onChange={(value) =>
                      setTheoryItems((current) =>
                        current.map((entry, currentIndex) =>
                          currentIndex === index ? { ...entry, content: value } : entry,
                        ),
                      )
                    }
                    role="DOSEN"
                    placeholder="Tulis materi teori, tabel, code block, kutipan, dan format lainnya..."
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-start">
            <LecturerButton
              variant="secondary"
              onClick={() => setTheoryItems((current) => [...current, createTheoryItem(current.length + 1)])}
            >
              <Plus size={16} />
              Tambah Subtopik
            </LecturerButton>
          </div>
        </LecturerPanel>

        <LecturerPanel className="p-5">
          <div className="mb-4 border-b border-gray-200 pb-3">
            <h2 className="text-lg font-semibold">Percobaan Praktikum</h2>
          </div>
          <div className="space-y-4">
            {experiments.map((item, index) => (
              <div key={item.id ?? `experiment-${index}`} className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Percobaan {index + 1}</h3>
                  {experiments.length > 1 && (
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setExperiments((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Judul Percobaan</label>
                      <input
                        className={inputClass}
                        value={item.title}
                        onChange={(event) =>
                          setExperiments((current) =>
                            current.map((entry, currentIndex) =>
                              currentIndex === index ? { ...entry, title: event.target.value } : entry,
                            ),
                          )
                        }
                        placeholder="Judul percobaan"
                      />
                    </div>
                  <div className="space-y-2">
                     <p className="text-sm font-medium text-gray-700">Instruksi Percobaan</p>
                    <RichTextEditor
                      value={item.instructionContent}
                      onChange={(value) =>
                        setExperiments((current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index ? { ...entry, instructionContent: value } : entry,
                          ),
                        )
                      }
                      role="DOSEN"
                      toolbarPosition="top"
                      placeholder="Tulis instruksi percobaan dengan format lengkap..."
                    />
                  </div>
                  <LecturerTemplateWorkspace
                    language={programmingLanguage as "java" | "python" || "java"}
                    value={item.templateCode}
                    onChange={(val) =>
                      setExperiments((current) =>
                        current.map((entry, currentIndex) =>
                          currentIndex === index ? { ...entry, templateCode: val } : entry,
                        ),
                      )
                    }
                    label={`Percobaan ${index + 1}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-start">
            <LecturerButton
              variant="secondary"
              onClick={() => setExperiments((current) => [...current, createExperimentItem(current.length + 1, (programmingLanguage || "java") as "java" | "python")])}
            >
              <Plus size={16} />
              Tambah Percobaan
            </LecturerButton>
          </div>
        </LecturerPanel>

        <LecturerPanel className="p-5">
          <div className="mb-4 border-b border-gray-200 pb-3">
            <h2 className="text-lg font-semibold">Latihan Praktikum</h2>
          </div>
          <div className="space-y-4">
            {exercises.map((item, index) => (
              <div key={item.id ?? `exercise-${index}`} className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Latihan {index + 1}</h3>
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setExercises((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Judul Latihan</label>
                      <input
                        className={inputClass}
                        value={item.title}
                        onChange={(event) =>
                          setExercises((current) =>
                            current.map((entry, currentIndex) =>
                              currentIndex === index ? { ...entry, title: event.target.value } : entry,
                            ),
                          )
                        }
                        placeholder="Judul latihan"
                      />
                    </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Instruksi Latihan</p>
                    <RichTextEditor
                      value={item.instructionContent}
                      onChange={(value) =>
                        setExercises((current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index ? { ...entry, instructionContent: value } : entry,
                          ),
                        )
                      }
                      role="DOSEN"
                      toolbarPosition="top"
                      placeholder="Tulis instruksi latihan dengan format lengkap..."
                    />
                  </div>
                  <LecturerTemplateWorkspace
                    language={programmingLanguage as "java" | "python" || "java"}
                    value={item.templateCode}
                    onChange={(val) =>
                      setExercises((current) =>
                        current.map((entry, currentIndex) =>
                          currentIndex === index ? { ...entry, templateCode: val } : entry,
                        ),
                      )
                    }
                    label={`Latihan ${index + 1}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-start">
            <LecturerButton
              variant="secondary"
              onClick={() => setExercises((current) => [...current, createExerciseItem(current.length + 1, (programmingLanguage || "java") as "java" | "python")])}
            >
              <Plus size={16} />
              Tambah Latihan
            </LecturerButton>
          </div>
        </LecturerPanel>

        <LecturerPanel className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Tugas Praktikum</h2>
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-800">Percobaan yang dilaporkan mahasiswa</p>
                <div className="space-y-2 text-sm">
                  {experiments.map((item, index) => (
                    <label key={item.id ?? `task-exp-${index}`} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.isReported}
                        onChange={() =>
                          setExperiments((current) =>
                            current.map((entry, currentIndex) =>
                              currentIndex === index
                                ? { ...entry, isReported: !entry.isReported, rubric: entry.isReported ? 0 : entry.rubric }
                                : entry,
                            ),
                          )
                        }
                      />
                      <span>{item.title || `Percobaan ${index + 1}`}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-800">Latihan yang dilaporkan mahasiswa</p>
                <div className="space-y-2 text-sm">
                  {exercises.map((item, index) => (
                    <label key={item.id ?? `task-exe-${index}`} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.isReported}
                        onChange={() =>
                          setExercises((current) =>
                            current.map((entry, currentIndex) =>
                              currentIndex === index
                                ? { ...entry, isReported: !entry.isReported, rubric: entry.isReported ? 0 : entry.rubric }
                                : entry,
                            ),
                          )
                        }
                      />
                      <span>{item.title || `Latihan ${index + 1}`}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Rubrik bobot penilaian - hanya untuk item yang dilaporkan */}
            {(experiments.some((e) => e.isReported) || exercises.some((e) => e.isReported)) && (
              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Bobot Penilaian per Item (%)</p>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded ${
                      totalRubric === 100
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    Total: {totalRubric}% / 100%
                  </span>
                </div>
                <p className="text-xs text-gray-500">Input bobot hanya untuk item yang dipilih untuk dilaporkan. Total harus 100%.</p>
                <div className="space-y-2">
                  {experiments.map((item, realIndex) => !item.isReported ? null : (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 flex-1 truncate">
                        Percobaan {realIndex + 1}: {item.title || `Percobaan ${realIndex + 1}`}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="h-8 w-24 rounded-md border border-gray-300 px-2 text-xs text-right"
                        value={item.rubric ?? 0}
                        onChange={(event) => {
                          const val = Math.max(0, parseInt(event.target.value) || 0)
                          setExperiments((current) =>
                            current.map((entry, currentIndex) =>
                              currentIndex === realIndex ? { ...entry, rubric: val } : entry,
                            ),
                          )
                        }}
                        placeholder="0"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                  ))}
                  {exercises.map((item, realIndex) => !item.isReported ? null : (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 flex-1 truncate">
                        Latihan {realIndex + 1}: {item.title || `Latihan ${realIndex + 1}`}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="h-8 w-24 rounded-md border border-gray-300 px-2 text-xs text-right"
                        value={item.rubric ?? 0}
                        onChange={(event) => {
                          const val = Math.max(0, parseInt(event.target.value) || 0)
                          setExercises((current) =>
                            current.map((entry, currentIndex) =>
                              currentIndex === realIndex ? { ...entry, rubric: val } : entry,
                            ),
                          )
                        }}
                        placeholder="0"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Instruksi Tugas Praktikum</p>
              <RichTextEditor
                value={taskInstruction}
                onChange={setTaskInstruction}
                role="DOSEN"
                placeholder="Tulis instruksi tugas praktikum dengan format lengkap..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Catatan Tambahan</p>
              <RichTextEditor
                value={taskAdditionalNote}
                onChange={setTaskAdditionalNote}
                role="DOSEN"
                placeholder="Tulis catatan tambahan untuk mahasiswa..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={requireSelfDeclaration}
                  onChange={(event) => setRequireSelfDeclaration(event.target.checked)}
                />
                Mahasiswa wajib menyatakan laporan dikerjakan sendiri
              </label>
              <div className="rounded-lg border border-gray-200 p-4">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={conclusionRequired}
                    onChange={(event) => setConclusionRequired(event.target.checked)}
                  />
                  Kesimpulan akhir wajib diisi
                </label>
                <FieldRow label="Minimal Kata">
                  <input
                    className={inputClass}
                    value={conclusionMinWord}
                    onChange={(event) => setConclusionMinWord(event.target.value)}
                    placeholder="150"
                  />
                </FieldRow>
              </div>
            </div>
          </div>
        </LecturerPanel>

        </div>

        <LecturerPanel className="p-5 lg:sticky lg:top-5 space-y-4 shadow-md border-slate-200">
          <h2 className="text-md font-semibold text-gray-800 border-b border-gray-100 pb-2">Simpan Jobsheet</h2>
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Bobot Rubrik</span>
            <div className="flex flex-col gap-1">
              <span
                className={`rounded px-2.5 py-1 text-center text-sm font-bold ${
                  totalRubric === 100
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {totalRubric}% / 100%
              </span>
              {totalRubric !== 100 && (
                <span className="text-[11px] text-red-600 font-medium text-center">
                  Total bobot harus bernilai 100% sebelum dapat disimpan/dipublikasikan
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <LecturerButton className="w-full justify-center" variant="secondary" disabled={saving} onClick={handleSaveDraft}>
              {saving ? "Menyimpan..." : "Simpan Draft"}
            </LecturerButton>
            <LecturerButton
              className="w-full justify-center"
              disabled={saving || !dataset?.course.classes.length}
              onClick={() => {
                if (totalRubric !== 100) {
                  setError(`Jumlah total bobot rubrik harus pas 100%. Saat ini: ${totalRubric}%.`)
                  window.scrollTo({ top: 0, behavior: "smooth" })
                  return
                }
                setPublishOpen(true)
              }}
            >
              Simpan & Publikasikan
            </LecturerButton>
          </div>
        </LecturerPanel>
      </div>

      {publishOpen && (
        <LecturerModal
          title="Publikasikan Jobsheet"
          onClose={() => setPublishOpen(false)}
          footer={
            <>
              <LecturerButton variant="secondary" onClick={() => setPublishOpen(false)}>Batal</LecturerButton>
              <LecturerButton disabled={saving} onClick={handlePublish}>
                {saving ? "Mempublikasikan..." : "Publikasikan"}
              </LecturerButton>
            </>
          }
        >
          <div className="space-y-4">
            {!publishSettings.length ? (
              <p className="text-sm text-gray-500">Belum ada kelas yang diampu untuk mata kuliah ini.</p>
            ) : (
              publishSettings.map((item, index) => (
                <div key={item.classId} className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[220px_1fr]">
                  <label className="flex items-center gap-3 text-sm font-medium text-gray-800">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={() =>
                        setPublishSettings((current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index ? { ...entry, isActive: !entry.isActive } : entry,
                          ),
                        )
                      }
                    />
                    Kelas {item.className}
                  </label>
                  <input
                    type="datetime-local"
                    value={item.deadline}
                    onChange={(event) =>
                      setPublishSettings((current) =>
                        current.map((entry, currentIndex) =>
                          currentIndex === index ? { ...entry, deadline: event.target.value } : entry,
                        ),
                      )
                    }
                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                  />
                </div>
              ))
            )}
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
