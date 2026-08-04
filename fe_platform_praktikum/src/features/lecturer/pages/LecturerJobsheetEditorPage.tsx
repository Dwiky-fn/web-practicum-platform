import type { JSONContent } from "@tiptap/react"
import { Plus, Trash2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
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
import { academicCourseBasePath } from "../../../services/academicScope"
import { datetimeLocalToDbValue, dbValueToDatetimeLocal } from "../utils/deadline"

import { toast } from "../../../components/toast/toastStore"
import { uploadJobsheetImage } from "../../../services/jobsheet/service"
import { IndonesianDateTimePicker } from "../components/IndonesianDateTimePicker"

const emptyDoc: JSONContent = { type: "doc", content: [] }

type PracticeEditorItem = LecturerPracticeInput & {
  isReported: boolean
}

type PublishClassSetting = {
  classId: string
  kelasPraktikumId?: string
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

function normalizeRubric(value: unknown) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(100, Math.max(0, Number(number.toFixed(2))))
}

function toHundredths(value: unknown): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100)
}

function isRubricTotalValid(total: number) {
  return Math.round(total * 100) === 10000
}

const totalRubricMessage = "Total bobot seluruh Dasar Teori, Percobaan, dan Latihan harus tepat 100%."

function createTheoryItem(index: number): LecturerTheoryInput {
  return {
    id: createLocalId("theory"),
    title: `Subtopik ${index}`,
    content: emptyDoc,
    rubric: 0,
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
  const [searchParams] = useSearchParams()
  const { user } = useCurrentUser()
  const { courseId = "", mataKuliahId: routeMataKuliahId = "", jobsheetId } = useParams()
  const effectiveCourseId = routeMataKuliahId || courseId
  const queryKelasPraktikumId = searchParams.get("kelasPraktikumId") || undefined

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [publishOpen, setPublishOpen] = useState(false)
  const [courseName, setCourseName] = useState("")
  const [dataset, setDataset] = useState<LecturerCourseDataset | null>(null)
  const [savedJobsheetId, setSavedJobsheetId] = useState(jobsheetId ?? "")

  const [title, setTitle] = useState("")
  const [jobsheetSequence, setJobsheetSequence] = useState("1")
  const [description, setDescription] = useState("")
  const [goalContent, setGoalContent] = useState<JSONContent>(emptyDoc)
  const [programmingLanguage, setProgrammingLanguage] = useState<"java" | "python" | "">("")
  const [theoryItems, setTheoryItems] = useState<LecturerTheoryInput[]>([])
  const [experiments, setExperiments] = useState<PracticeEditorItem[]>([])
  const [exercises, setExercises] = useState<PracticeEditorItem[]>([])
  const [publishSettings, setPublishSettings] = useState<PublishClassSetting[]>([])
  const [collapsedTheoryItems, setCollapsedTheoryItems] = useState<Record<string, boolean>>({})
  const [collapsedExperiments, setCollapsedExperiments] = useState<Record<string, boolean>>({})
  const [collapsedExercises, setCollapsedExercises] = useState<Record<string, boolean>>({})
  // ── Confirm change language state ──
  const [confirmChangeLang, setConfirmChangeLang] = useState(false)
  const [pendingLang, setPendingLang] = useState<"java" | "python" | null>(null)

  const isCreate = !savedJobsheetId
  const activeJobsheetId = savedJobsheetId || jobsheetId || ""
  const mataKuliahId = dataset?.course.mataKuliahId || dataset?.course.id
  const primaryKelasPraktikumId = queryKelasPraktikumId || dataset?.course.classes[0]?.kelasPraktikumId || dataset?.course.classes[0]?.id_kelas_praktikum
  const jobsheetBasePath = `${academicCourseBasePath(effectiveCourseId, { mataKuliahId: mataKuliahId || routeMataKuliahId || undefined })}/jobsheets`

  useEffect(() => {
    async function loadData() {
      if (!user || user.role !== "DOSEN" || !effectiveCourseId) return

      setLoading(true)
      setError("")

      try {
        const [course, nextDataset] = await Promise.all([
          getLecturerCourseGroup(user.id, effectiveCourseId),
          getLecturerCourseDataset(user.id, effectiveCourseId),
        ])

        setCourseName(course?.name ?? "")
        setDataset(nextDataset)

        const sourceJobsheetId = searchParams.get("sourceJobsheetId")
        if (savedJobsheetId) {
          const selectedJobsheet = await getLecturerJobsheetById(effectiveCourseId, savedJobsheetId, {
            mataKuliahId: nextDataset?.course.mataKuliahId || nextDataset?.course.id,
            kelasPraktikumId: queryKelasPraktikumId,
          })
          setTitle(selectedJobsheet.title)
          setJobsheetSequence(String(selectedJobsheet.urutan ?? selectedJobsheet.sequence ?? 1))
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
            selectedJobsheet.theory.map((item) => ({
              id: item.id,
              title: item.title,
              content: item.content,
              rubric: item.rubric,
            })),
          )
          setExperiments(
            selectedJobsheet.experiments.map((item) => ({
              id: item.id,
              title: item.title,
              instructionContent: item.instructionContent ?? emptyDoc,
              templateCode: item.defaultTemplateCode,
              isReported: item.isReported,
              rubric: item.rubric ?? 0,
              inactiveDurationMinutes: item.inactiveDurationMinutes ?? null,
            })),
          )
          setExercises(
            selectedJobsheet.exercises.map((item) => ({
              id: item.id,
              title: item.title,
              instructionContent: item.instructionContent ?? emptyDoc,
              templateCode: item.defaultTemplateCode ?? "",
              isReported: item.isReported,
              rubric: item.rubric ?? 0,
              inactiveDurationMinutes: item.inactiveDurationMinutes ?? null,
            })),
          )

          const fallbackDeadline = dbValueToDatetimeLocal(selectedJobsheet.deadline)
          const classSettings = (nextDataset?.course.classes ?? []).map((classItem) => {
            const classDetail = nextDataset?.classDetails.find((item) => item.id === classItem.id)
            const assignedJobsheet = classDetail?.jobsheets.find((item) => item.id === savedJobsheetId)

            return {
              classId: classItem.id,
              kelasPraktikumId: classItem.kelasPraktikumId || classItem.id_kelas_praktikum,
              className: classItem.name,
              isActive: assignedJobsheet?.status === "Aktif",
              deadline: fallbackDeadline,
            }
          })

          setPublishSettings(classSettings)
        } else if (sourceJobsheetId) {
          const sourceJobsheet = await getLecturerJobsheetById(effectiveCourseId, sourceJobsheetId, {
            mataKuliahId: nextDataset?.course.mataKuliahId || nextDataset?.course.id,
          })
          setTitle(`${sourceJobsheet.title} (Salinan)`)
          const currentClass = nextDataset?.course.classes.find((item) => (item.kelasPraktikumId || item.id_kelas_praktikum) === queryKelasPraktikumId) ?? nextDataset?.course.classes?.[0]
          setJobsheetSequence(String((currentClass?.jumlahJobsheetDibuat ?? currentClass?.jumlah_jobsheet_dibuat ?? 0) + 1))
          setDescription(sourceJobsheet.description)
          setGoalContent(
            sourceJobsheet.goal
              ? {
                  type: "doc",
                  content: [{ type: "paragraph", content: [{ type: "text", text: sourceJobsheet.goal }] }],
                }
              : emptyDoc,
          )
          const lang = (sourceJobsheet.programmingLanguage || "java") as "java" | "python"
          setProgrammingLanguage(lang)
          setTheoryItems(
            sourceJobsheet.theory.map((item) => ({
              id: createLocalId("theory"),
              title: item.title,
              content: item.content,
              rubric: item.rubric,
            })),
          )
          setExperiments(
            sourceJobsheet.experiments.map((item) => ({
              id: createLocalId("exp"),
              title: item.title,
              instructionContent: item.instructionContent ?? emptyDoc,
              templateCode: item.defaultTemplateCode,
              isReported: item.isReported,
              rubric: item.rubric ?? 0,
              inactiveDurationMinutes: item.inactiveDurationMinutes ?? null,
            })),
          )
          setExercises(
            sourceJobsheet.exercises.map((item) => ({
              id: createLocalId("exe"),
              title: item.title,
              instructionContent: item.instructionContent ?? emptyDoc,
              templateCode: item.defaultTemplateCode ?? "",
              isReported: item.isReported,
              rubric: item.rubric ?? 0,
              inactiveDurationMinutes: item.inactiveDurationMinutes ?? null,
            })),
          )
          setPublishSettings(
            (nextDataset?.course.classes ?? []).map((classItem) => ({
              classId: classItem.id,
              kelasPraktikumId: classItem.kelasPraktikumId || classItem.id_kelas_praktikum,
              className: classItem.name,
              isActive: false,
              deadline: "",
            })),
          )
          toast.success(`Berhasil menyalin konten dari Jobsheet ${sourceJobsheet.title}`)
        } else {
          const firstClass = nextDataset?.course.classes?.[0]
          const defaultLang = firstClass?.programmingLanguage || "java"
          setProgrammingLanguage(defaultLang)
          const currentClass = nextDataset?.course.classes.find((item) => (item.kelasPraktikumId || item.id_kelas_praktikum) === queryKelasPraktikumId) ?? nextDataset?.course.classes?.[0]
          setJobsheetSequence(String((currentClass?.jumlahJobsheetDibuat ?? currentClass?.jumlah_jobsheet_dibuat ?? 0) + 1))
          setTheoryItems([])
          setExperiments([])
          setExercises([])
          setPublishSettings(
            (nextDataset?.course.classes ?? []).map((classItem) => ({
              classId: classItem.id,
              kelasPraktikumId: classItem.kelasPraktikumId || classItem.id_kelas_praktikum,
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
  }, [effectiveCourseId, queryKelasPraktikumId, savedJobsheetId, user])

  const totalRubric = useMemo(() => {
    const theoryTotal = theoryItems.reduce((acc, item) => acc + toHundredths(item.rubric), 0)
    const expTotal = experiments.reduce((acc, item) => acc + toHundredths(item.rubric), 0)
    const exeTotal = exercises.reduce((acc, item) => acc + toHundredths(item.rubric), 0)
    return (theoryTotal + expTotal + exeTotal) / 100
  }, [theoryItems, experiments, exercises])
  const rubricTotalValid = isRubricTotalValid(totalRubric)
  const hasUnconfiguredTheoryRubrics = useMemo(() => {
    return theoryItems.some((item) => item.rubric === undefined || item.rubric === null)
  }, [theoryItems])

  const totalContentItems = theoryItems.length + experiments.length + exercises.length

  function buildPayload() {
    return {
      lecturerId: user?.id ?? "",
      title,
      urutan: Number(jobsheetSequence || 1),
      description,
      goal: extractTextContent(goalContent).trim(),
      programmingLanguage: programmingLanguage || "java",
      editorMode: "mini_ide",
      theory: theoryItems.map((item, index) => ({
        id: item.id,
        title: item.title || `Subtopik ${index + 1}`,
        content: item.content || emptyDoc,
        rubric: normalizeRubric(item.rubric),
      })),
      experiments: experiments.map((item, index) => ({
        id: item.id,
        title: item.title || `Percobaan ${index + 1}`,
        instructionContent: item.instructionContent || emptyDoc,
        templateCode: item.templateCode,
        rubric: normalizeRubric(item.rubric),
        inactiveDurationMinutes: item.inactiveDurationMinutes ? Number(item.inactiveDurationMinutes) : null,
      })),
      exercises: exercises.map((item, index) => ({
        id: item.id,
        title: item.title || `Latihan ${index + 1}`,
        instructionContent: item.instructionContent || emptyDoc,
        templateCode: item.templateCode,
        rubric: normalizeRubric(item.rubric),
        inactiveDurationMinutes: item.inactiveDurationMinutes ? Number(item.inactiveDurationMinutes) : null,
      })),
      task: {
        instructionContent: emptyDoc,
        additionalNoteContent: emptyDoc,
        requireSelfDeclaration: false,
        conclusionConfig: {
          enabled: false,
          required: false,
          minWord: 150,
        },
        experimentItems: [],
        exerciseItems: [],
      },
    }
  }

  async function ensureSaved(isDraft = false) {
    if (!user || !effectiveCourseId) return ""
    const payload = {
      ...buildPayload(),
      status: isDraft ? "draft" : "published",
    }

    if (activeJobsheetId) {
      await updateLecturerJobsheet(effectiveCourseId, activeJobsheetId, payload, {
        mataKuliahId,
        kelasPraktikumId: primaryKelasPraktikumId,
      })
      return activeJobsheetId
    }

    const created = await createLecturerJobsheet(effectiveCourseId, payload, {
      mataKuliahId,
      kelasPraktikumId: primaryKelasPraktikumId,
    })
    setSavedJobsheetId(created.id)
    return created.id
  }

  async function handleSaveDraft() {
    if (!user) return

    try {
      setSaving(true)
      setError("")

      const nextId = await ensureSaved(true)
      toast.success("Draft jobsheet berhasil disimpan.")

      if (isCreate && nextId) {
        const query = searchParams.toString() ? `?${searchParams.toString()}` : ""
        navigate(`${jobsheetBasePath}/${nextId}/edit${query}`, { replace: true })
      }
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Gagal menyimpan draft jobsheet.")
    } finally {
      setSaving(false)
    }
  }

  const handleUploadImage = async (file: File) => {
    const jobsheetId = await ensureSaved(true);
    if (!jobsheetId) {
      throw new Error("Gagal menginisialisasi draft jobsheet untuk upload gambar.");
    }
    
    const uploaded = await uploadJobsheetImage(jobsheetId, file);
    
    if (isCreate) {
      const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
      navigate(`${jobsheetBasePath}/${jobsheetId}/edit${query}`, { replace: true });
    }
    
    return uploaded;
  };

  async function handlePublish() {
    if (!user) return

    if (totalContentItems === 0) {
      toast.error("Tambahkan minimal satu dasar teori, percobaan, atau latihan sebelum publish.")
      setPublishOpen(false)
      return
    }

    if (!rubricTotalValid) {
      toast.error(totalRubricMessage)
      setPublishOpen(false)
      return
    }

    try {
      setSaving(true)
      setError("")

      const nextId = await ensureSaved(false)
      await publishLecturerJobsheet(effectiveCourseId, nextId, {
        lecturerId: user.id,
        classes: publishSettings.map((item) => ({
          kelasPraktikumId: item.kelasPraktikumId,
          urutan: Number(jobsheetSequence || 1),
          deadline: datetimeLocalToDbValue(item.deadline),
          isActive: item.isActive,
        })),
      }, { mataKuliahId })

      setPublishOpen(false)
      toast.success("Jobsheet berhasil dipublikasikan.")
      const query = searchParams.toString() ? `?${searchParams.toString()}` : ""
      navigate(`${jobsheetBasePath}${query}`)
    } catch (publishError) {
      toast.error(publishError instanceof Error ? publishError.message : "Gagal mempublikasikan jobsheet.")
    } finally {
      setSaving(false)
    }
  }

  const handleLanguageChange = (newLang: "java" | "python") => {
    if (programmingLanguage && programmingLanguage !== newLang) {
      setPendingLang(newLang)
      setConfirmChangeLang(true)
      return
    }
    setProgrammingLanguage(newLang)
  }

  function applyLanguageChange(lang: "java" | "python") {
    // Auto-update templates to default code of the new language
    setExperiments((current) =>
      current.map((item) => ({
        ...item,
        templateCode: lang === "python" ? 'print("Hello, Python!")' : `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}`,
      }))
    )
    setExercises((current) =>
      current.map((item) => ({
        ...item,
        templateCode: lang === "python" ? 'print("Hello, Python!")' : `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}`,
      }))
    )
    setProgrammingLanguage(lang)
  }

  if (loading) {
    return <TopProgressBar />
  }

  return (
    <LecturerLayout
      onBack={() => {
        const query = searchParams.toString() ? `?${searchParams.toString()}` : ""
        navigate(`${jobsheetBasePath}${query}`)
      }}
    >
      {/* ── Confirm Change Language Modal ── */}
      {confirmChangeLang && pendingLang && (
        <LecturerModal
          title="Ubah Bahasa Pemrograman?"
          onClose={() => {
            setConfirmChangeLang(false)
            setPendingLang(null)
          }}
          footer={
            <>
              <LecturerButton
                variant="secondary"
                onClick={() => {
                  setConfirmChangeLang(false)
                  setPendingLang(null)
                }}
              >
                Batal
              </LecturerButton>
              <LecturerButton
                onClick={() => {
                  applyLanguageChange(pendingLang)
                  setConfirmChangeLang(false)
                  setPendingLang(null)
                }}
              >
                Ya, Ubah ke {pendingLang === "python" ? "Python" : "Java"}
              </LecturerButton>
            </>
          }
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">
                Mengubah bahasa pemrograman akan me-reset semua <strong>kode template percobaan dan latihan</strong> ke kode default{" "}
                {pendingLang === "python" ? "Python" : "Java"}.
              </p>
              <p className="mt-2 text-xs text-gray-500">Pastikan Anda sudah menyimpan kode template yang ingin dipertahankan.</p>
            </div>
          </div>
        </LecturerModal>
      )}

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
            onUploadImage={handleUploadImage}
            placeholder="Tulis tujuan praktikum dengan format lengkap..."
          />
        </LecturerPanel>

        <LecturerPanel className="p-5">
          <div className="mb-4 border-b border-gray-200 pb-3">
            <h2 className="text-lg font-semibold">Dasar Teori</h2>
          </div>
          {!theoryItems.length && (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
              <p className="text-sm font-medium text-gray-700">Belum ada dasar teori.</p>
            </div>
          )}
          <div className="space-y-4">
            {theoryItems.map((item, index) => {
              const itemKey = item.id ?? `theory-${index}`
              const isCollapsed = Boolean(collapsedTheoryItems[itemKey])

              return (
                <div key={itemKey} className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm transition-all">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedTheoryItems((prev) => ({
                            ...prev,
                            [itemKey]: !prev[itemKey],
                          }))
                        }
                        className="flex items-center justify-center p-1 text-gray-500 hover:text-gray-900 rounded hover:bg-gray-100 transition"
                        title={isCollapsed ? "Buka (Expand) Dasar Teori" : "Tutup (Collapse) Dasar Teori"}
                      >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        <span>Dasar Teori {index + 1}</span>
                        {item.title ? (
                          <span className="font-normal text-gray-500 truncate max-w-[200px] sm:max-w-[300px]">
                            — {item.title}
                          </span>
                        ) : null}
                      </p>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 p-1"
                        onClick={() =>
                          setTheoryItems((current) => current.filter((_, currentIndex) => currentIndex !== index))
                        }
                        title="Hapus dasar teori ini"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      Bobot
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="h-9 w-20 rounded-md border border-gray-300 px-2 text-right text-sm"
                        value={item.rubric ?? 0}
                        onChange={(event) => {
                          const val = normalizeRubric(event.target.value)
                          setTheoryItems((current) =>
                            current.map((entry, currentIndex) =>
                              currentIndex === index ? { ...entry, rubric: val } : entry,
                            ),
                          )
                        }}
                      />
                      %
                    </label>
                  </div>

                  {!isCollapsed && (
                    <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                      <FieldRow label="Judul Dasar Teori">
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
                          onUploadImage={handleUploadImage}
                          placeholder="Tulis materi teori, tabel, code block, kutipan, dan format lainnya..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex justify-start">
            <LecturerButton
              variant="secondary"
              onClick={() => setTheoryItems((current) => [...current, createTheoryItem(current.length + 1)])}
            >
              <Plus size={16} />
              Tambah Dasar Teori
            </LecturerButton>
          </div>
        </LecturerPanel>

        <LecturerPanel className="p-5">
          <div className="mb-4 border-b border-gray-200 pb-3">
            <h2 className="text-lg font-semibold">Percobaan Praktikum</h2>
          </div>
          {!experiments.length && (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
              <p className="text-sm font-medium text-gray-700">Belum ada percobaan.</p>
            </div>
          )}
          <div className="space-y-4">
            {experiments.map((item, index) => {
              const itemKey = item.id ?? `experiment-${index}`
              const isCollapsed = Boolean(collapsedExperiments[itemKey])

              return (
                <div key={itemKey} className="rounded-lg border border-blue-100 bg-blue-50 p-4 shadow-sm transition-all">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedExperiments((prev) => ({
                            ...prev,
                            [itemKey]: !prev[itemKey],
                          }))
                        }
                        className="flex items-center justify-center p-1 text-gray-600 hover:text-gray-900 rounded hover:bg-blue-100 transition"
                        title={isCollapsed ? "Buka (Expand) Percobaan" : "Tutup (Collapse) Percobaan"}
                      >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <span>Percobaan {index + 1}</span>
                        {item.title ? (
                          <span className="font-normal text-gray-600 truncate max-w-[200px] sm:max-w-[300px]">
                            — {item.title}
                          </span>
                        ) : null}
                      </h3>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 p-1"
                        onClick={() =>
                          setExperiments((current) => current.filter((_, currentIndex) => currentIndex !== index))
                        }
                        title="Hapus percobaan ini"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        Bobot
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="h-9 w-20 rounded-md border border-gray-300 px-2 text-right text-sm"
                          value={item.rubric === 0 || item.rubric === null || item.rubric === undefined ? "" : item.rubric}
                          placeholder="0"
                          onFocus={(event) => event.target.select()}
                          onChange={(event) => {
                            const raw = event.target.value
                            const val = raw === "" ? 0 : normalizeRubric(raw)
                            setExperiments((current) =>
                              current.map((entry, currentIndex) =>
                                currentIndex === index ? { ...entry, rubric: val } : entry,
                              ),
                            )
                          }}
                        />
                        %
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        Batas Tidak Aktif
                        <input
                          type="number"
                          min="1"
                          className="h-9 w-20 rounded-md border border-gray-300 px-2 text-right text-sm"
                          value={item.inactiveDurationMinutes ?? ""}
                          onChange={(event) =>
                            setExperiments((current) =>
                              current.map((entry, currentIndex) =>
                                currentIndex === index
                                  ? {
                                      ...entry,
                                      inactiveDurationMinutes: event.target.value ? Number(event.target.value) : null,
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                        menit
                      </label>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-3 border-t border-blue-100 pt-3 mt-2">
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
                          onUploadImage={handleUploadImage}
                          placeholder="Tulis instruksi percobaan dengan format lengkap..."
                        />
                      </div>
                      <LecturerTemplateWorkspace
                        language={(programmingLanguage as "java" | "python") || "java"}
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
                  )}
                </div>
              )
            })}
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
          {!exercises.length && (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
              <p className="text-sm font-medium text-gray-700">Belum ada latihan.</p>
            </div>
          )}
          <div className="space-y-4">
            {exercises.map((item, index) => {
              const itemKey = item.id ?? `exercise-${index}`
              const isCollapsed = Boolean(collapsedExercises[itemKey])

              return (
                <div key={itemKey} className="rounded-lg border border-blue-100 bg-blue-50 p-4 shadow-sm transition-all">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedExercises((prev) => ({
                            ...prev,
                            [itemKey]: !prev[itemKey],
                          }))
                        }
                        className="flex items-center justify-center p-1 text-gray-600 hover:text-gray-900 rounded hover:bg-blue-100 transition"
                        title={isCollapsed ? "Buka (Expand) Latihan" : "Tutup (Collapse) Latihan"}
                      >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <span>Latihan {index + 1}</span>
                        {item.title ? (
                          <span className="font-normal text-gray-600 truncate max-w-[200px] sm:max-w-[300px]">
                            — {item.title}
                          </span>
                        ) : null}
                      </h3>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 p-1"
                        onClick={() =>
                          setExercises((current) => current.filter((_, currentIndex) => currentIndex !== index))
                        }
                        title="Hapus latihan ini"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        Bobot
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="h-9 w-20 rounded-md border border-gray-300 px-2 text-right text-sm"
                          value={item.rubric === 0 || item.rubric === null || item.rubric === undefined ? "" : item.rubric}
                          placeholder="0"
                          onFocus={(event) => event.target.select()}
                          onChange={(event) => {
                            const raw = event.target.value
                            const val = raw === "" ? 0 : normalizeRubric(raw)
                            setExercises((current) =>
                              current.map((entry, currentIndex) =>
                                currentIndex === index ? { ...entry, rubric: val } : entry,
                              ),
                            )
                          }}
                        />
                        %
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        Batas Tidak Aktif
                        <input
                          type="number"
                          min="1"
                          className="h-9 w-20 rounded-md border border-gray-300 px-2 text-right text-sm"
                          value={item.inactiveDurationMinutes ?? ""}
                          onChange={(event) =>
                            setExercises((current) =>
                              current.map((entry, currentIndex) =>
                                currentIndex === index
                                  ? {
                                      ...entry,
                                      inactiveDurationMinutes: event.target.value ? Number(event.target.value) : null,
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                        menit
                      </label>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-3 border-t border-blue-100 pt-3 mt-2">
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
                          onUploadImage={handleUploadImage}
                          placeholder="Tulis instruksi latihan dengan format lengkap..."
                        />
                      </div>
                      <LecturerTemplateWorkspace
                        language={(programmingLanguage as "java" | "python") || "java"}
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
                  )}
                </div>
              )
            })}
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



        </div>

        <LecturerPanel className="p-5 lg:sticky lg:top-5 space-y-4 shadow-md border-slate-200">
          <h2 className="text-md font-semibold text-gray-800 border-b border-gray-100 pb-2">Simpan Jobsheet</h2>
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Bobot Penilaian</span>
            <div className="flex flex-col gap-1">
              <span
                className={`rounded px-2.5 py-1 text-center text-sm font-bold ${
                  rubricTotalValid
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {totalRubric}% / 100%
              </span>
              {!rubricTotalValid && (
                <span className="text-[11px] text-red-600 font-medium text-center">
                  {totalRubricMessage} Draft tetap bisa disimpan.
                </span>
              )}
              {hasUnconfiguredTheoryRubrics && (
                <span className="text-[11px] text-amber-600 font-medium text-center bg-amber-50 border border-amber-200 rounded p-2 mt-1">
                  Bobot Dasar Teori belum diatur. Lengkapi bobot seluruh item sebelum jobsheet dipublish.
                </span>
              )}
              {totalContentItems === 0 && (
                <span className="text-[11px] text-amber-700 font-medium text-center">
                  Tambahkan minimal satu item konten sebelum publish.
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
                if (totalContentItems === 0) {
                  toast.error("Tambahkan minimal satu dasar teori, percobaan, atau latihan sebelum publish.")
                  return
                }
                if (hasUnconfiguredTheoryRubrics) {
                  toast.error("Bobot Dasar Teori belum diatur. Lengkapi bobot seluruh item sebelum jobsheet dipublish.")
                  return
                }
                if (!rubricTotalValid) {
                  toast.error(totalRubricMessage)
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
          title="Pengaturan Alokasi & Publikasi Jobsheet"
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
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
              Pilih kelas praktikum mana saja yang dapat mengakses jobsheet ini dan tetapkan batas waktu (deadline) pengumpulannya.
            </div>

            {!publishSettings.length ? (
              <p className="text-sm text-gray-500">Belum ada kelas praktikum yang diampu untuk mata kuliah ini.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <p className="font-bold text-xs uppercase tracking-wide text-gray-700">Aktifkan untuk Kelas</p>
                  {publishSettings.map((item, index) => (
                    <label key={item.classId} className="flex items-center gap-2 text-sm text-gray-900 font-medium">
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
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Kelas Praktikum {item.className}
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="font-bold text-xs uppercase tracking-wide text-gray-700">Batas Waktu (Deadline - 24 Jam)</p>
                  {publishSettings.map((item, index) => (
                    <IndonesianDateTimePicker
                      key={item.classId}
                      value={item.deadline}
                      disabled={!item.isActive}
                      onChange={(newVal) =>
                        setPublishSettings((current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index ? { ...entry, deadline: newVal } : entry,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </LecturerModal>
      )}
    </LecturerLayout>
  )
}
