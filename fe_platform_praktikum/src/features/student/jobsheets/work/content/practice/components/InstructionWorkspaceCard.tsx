import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import type { JSONContent } from "@tiptap/react"
import { Play, RotateCcw, Save, Square, AlertTriangle, FileText } from "lucide-react"
import CodeEditorPanel from "../../../../../../../components/code-editor/CodeEditorPanel"
import AnalysisEditor from "./workSpace/AnalysisEditor"
import { ExecutionClient } from "../../../../../../../services/execution/executionClient"
import { connectLiveWorkspaceSocket } from "../../../../../../../services/liveWorkspaceSocket"
import { parseFilesOrTemplate } from "../../../../../../../shared/utils/codeTemplateUtils"
import type { InstructionStep } from "../../../../../../../shared/utils/splitInstructionContent"

const LIVE_WORKSPACE_DEBUG = import.meta.env.DEV && import.meta.env.VITE_LIVE_WORKSPACE_DEBUG === "true"

interface Props {
  instructions: InstructionStep[]
  templateCode: string
  language: string
  onChange?: (steps: {
    files: Record<string, string>
    output: string
    analysis: JSONContent
  }[]) => void | Promise<void>
  initialSteps?: {
    files: Record<string, string>
    output: string
    analysis: JSONContent
  }[]
  onRun?: () => void
  onSave?: () => void
  readOnly?: boolean
  runContext?: {
    jobsheetId: string
    kelasPraktikumId: string
    attemptType?: "normal" | "remedial"
    remedialId?: string | null
    moduleType: "experiment" | "exercise"
    experimentId?: string | null
    exerciseId?: string | null
    instructionIds?: Array<string | null>
  }
  runStats?: {
    totalRunCount?: number | null
    instructionRunCounts?: Record<number, number | null>
    hasRunEventData?: boolean
  }
  liveWorkspace?: ReturnType<typeof connectLiveWorkspaceSocket> | null
  liveSection?: {
    type: "experiment" | "exercise"
    id: string
    name: string
  }
  hideInstructionTabs?: boolean
}

type BottomPanelTab = "terminal" | "analysis"

function getDefaultFileName(language: string, index: number, isExperiment: boolean): string {
  const ext = getFileExtension(language)
  return isExperiment ? `percobaan-${index + 1}.${ext}` : `latihan-${index + 1}.${ext}`
}

function getFileExtension(language: string): string {
  switch (language) {
    case "java": return "java"
    case "javascript": return "js"
    case "typescript": return "ts"
    case "python": return "py"
    default: return language || "txt"
  }
}


function parseTemplateFiles(codeStr: string, language: string, index: number, isExperiment: boolean): Record<string, string> {
  const defaultFileName = getDefaultFileName(language, index, isExperiment)
  if (!codeStr) {
    return { [defaultFileName]: "" }
  }
  try {
    if (codeStr.trim().startsWith("{")) {
      const parsed = JSON.parse(codeStr)
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, string>
      }
    }
  } catch {
    // Not JSON
  }
  return { [defaultFileName]: codeStr }
}

function formatRunTime(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(3)} detik`
}

function normalizeStdin(value: string): string {
  if (!value) return ""

  return value.endsWith("\n") ? value : `${value}\n`
}

function toRunnerFiles(files: Record<string, string>) {
  return Object.entries(files).map(([path, content]) => ({ path, content }))
}

function getMainClass(fileName: string): string {
  return fileName.replace(/\.java$/i, "").split(/[\\/]/).pop() || "Main"
}

export default function InstructionWorkspaceCard({
  instructions,
  templateCode,
  language,
  onChange,
  initialSteps,
  onRun,
  onSave,
  readOnly = false,
  runContext,
  runStats,
  liveWorkspace,
  liveSection,
  hideInstructionTabs = false,
}: Props) {
  const location = useLocation()
  const isExperiment = runContext?.moduleType === "experiment" || location.pathname.includes("/experiments/")
  const isExercise = runContext?.moduleType === "exercise" || location.pathname.includes("/exercises/")
  const totalSteps = Math.max(instructions.length, initialSteps?.length || 0, 1)
  const [activeIndex, setActiveIndex] = useState(0)
  
  const defaultFileName = getDefaultFileName(language, activeIndex, isExperiment)
  const [activeFile, setActiveFile] = useState(defaultFileName)
  const [codeMap, setCodeMap] = useState<Record<number, Record<string, string>>>({})
  const [analysisMap, setAnalysisMap] = useState<Record<number, JSONContent>>({})
  const [outputMap, setOutputMap] = useState<Record<number, string>>({})
  const [currentInputMap, setCurrentInputMap] = useState<Record<number, string>>({})
  const [runTimeMap, setRunTimeMap] = useState<Record<number, string>>({})
  const [runningMap, setRunningMap] = useState<Record<number, boolean>>({})
  const [editorVersionMap, setEditorVersionMap] = useState<Record<number, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")
  const [saveError, setSaveError] = useState("")
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>("terminal")
  const [isBottomPanelExpanded, setIsBottomPanelExpanded] = useState(true)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(220)
  // ── Confirm delete file state ──
  const [confirmDeleteFile, setConfirmDeleteFile] = useState(false)
  const codingBodyRef = useRef<HTMLDivElement | null>(null)
  const executionClientRef = useRef<ExecutionClient | null>(null)
  const terminalOutputRef = useRef<Record<number, string>>({})
  const terminalInputRef = useRef<HTMLInputElement | null>(null)
  const terminalScrollRef = useRef<HTMLDivElement | null>(null)
  const hasHydratedInitialStateRef = useRef(false)
  const liveDebounceRef = useRef<number | null>(null)
  const latestLiveFileRef = useRef<{ filePath: string; content: string } | null>(null)
  const liveAnalysisDebounceRef = useRef<number | null>(null)
  const latestLiveAnalysisRef = useRef<JSONContent | null>(null)

  useEffect(() => {
    return () => {
      executionClientRef.current?.close()
      if (liveDebounceRef.current) window.clearTimeout(liveDebounceRef.current)
      if (liveAnalysisDebounceRef.current) window.clearTimeout(liveAnalysisDebounceRef.current)
    }
  }, [])

  const flushLiveFile = useCallback(() => {
    if (!liveWorkspace || !latestLiveFileRef.current || !liveSection || readOnly) return
    const latest = latestLiveFileRef.current
    if (LIVE_WORKSPACE_DEBUG) {
      console.debug("[LIVE-WS][STUDENT] sending workspace update", {
        filePath: latest.filePath,
        contentLength: latest.content.length,
        sectionType: liveSection.type,
        sectionId: liveSection.id,
      })
    }
    liveWorkspace.send({
      type: "workspace-file-content",
      filePath: latest.filePath,
      content: latest.content,
      activeFilePath: latest.filePath,
      sectionType: liveSection.type,
      sectionId: liveSection.id,
      sectionName: liveSection.name,
    })
  }, [liveSection, liveWorkspace, readOnly])

  const scheduleLiveFile = useCallback((filePath: string, content: string) => {
    if (!liveWorkspace || !liveSection || readOnly) return
    if (LIVE_WORKSPACE_DEBUG) {
      console.debug("[LIVE-WS][STUDENT] debounce file update", {
        filePath,
        contentLength: content.length,
        sectionType: liveSection.type,
        sectionId: liveSection.id,
      })
    }
    latestLiveFileRef.current = { filePath, content }
    if (liveDebounceRef.current) window.clearTimeout(liveDebounceRef.current)
    liveDebounceRef.current = window.setTimeout(flushLiveFile, 180)
  }, [flushLiveFile, liveSection, liveWorkspace, readOnly])

  const flushLiveAnalysis = useCallback(() => {
    if (!liveWorkspace || !latestLiveAnalysisRef.current || !liveSection || readOnly) return
    if (LIVE_WORKSPACE_DEBUG) {
      console.debug("[LIVE-WS][STUDENT] sending analysis update", {
        sectionType: liveSection.type,
        sectionId: liveSection.id,
      })
    }
    liveWorkspace.send({
      type: "analysis-patch",
      sectionType: liveSection.type,
      sectionId: liveSection.id,
      sectionName: liveSection.name,
      content: latestLiveAnalysisRef.current,
    })
  }, [liveSection, liveWorkspace, readOnly])

  const scheduleLiveAnalysis = useCallback((content: JSONContent) => {
    if (!liveWorkspace || !liveSection || readOnly) return
    latestLiveAnalysisRef.current = content
    if (liveAnalysisDebounceRef.current) window.clearTimeout(liveAnalysisDebounceRef.current)
    liveAnalysisDebounceRef.current = window.setTimeout(flushLiveAnalysis, 220)
  }, [flushLiveAnalysis, liveSection, liveWorkspace, readOnly])

  useEffect(() => {
    if (hasHydratedInitialStateRef.current) return

    const nextCodeMap = Object.fromEntries(
      Array.from({ length: totalSteps }, (_, index) => {
        const savedFiles = initialSteps?.[index]?.files

        return [
          index,
          parseFilesOrTemplate(savedFiles, templateCode, language, index, isExperiment),
        ]
      })
    )
    const nextAnalysisMap = Object.fromEntries(
      Array.from({ length: totalSteps }, (_, index) => [
        index,
        initialSteps?.[index]?.analysis || { type: "doc", content: [] },
      ])
    )
    const nextOutputMap = Object.fromEntries(
      Array.from({ length: totalSteps }, (_, index) => [index, initialSteps?.[index]?.output || ""])
    )

    terminalOutputRef.current = nextOutputMap
    setCodeMap(nextCodeMap)
    setAnalysisMap(nextAnalysisMap)
    setOutputMap(nextOutputMap)
    setCurrentInputMap(Object.fromEntries(Array.from({ length: totalSteps }, (_, index) => [index, ""])))
    setRunTimeMap(Object.fromEntries(Array.from({ length: totalSteps }, (_, index) => [index, ""])))
    setEditorVersionMap(Object.fromEntries(Array.from({ length: totalSteps }, (_, index) => [index, 0])))
    const initialIndex = 0
    setActiveIndex(initialIndex)
    setActiveFile(Object.keys(nextCodeMap[initialIndex] || {})[0] || getDefaultFileName(language, initialIndex, isExperiment))
    setSaveStatus("")
    setSaveError("")
    hasHydratedInitialStateRef.current = true
  }, [initialSteps, templateCode, totalSteps, language, isExperiment])

  useEffect(() => {
    if (!readOnly || !hasHydratedInitialStateRef.current) return

    const nextCodeMap = Object.fromEntries(
      Array.from({ length: totalSteps }, (_, index) => {
        const savedFiles = initialSteps?.[index]?.files

        return [
          index,
          parseFilesOrTemplate(savedFiles, templateCode, language, index, isExperiment),
        ]
      })
    )
    const nextAnalysisMap = Object.fromEntries(
      Array.from({ length: totalSteps }, (_, index) => [
        index,
        initialSteps?.[index]?.analysis || { type: "doc", content: [] },
      ])
    )
    const nextOutputMap = Object.fromEntries(
      Array.from({ length: totalSteps }, (_, index) => [index, initialSteps?.[index]?.output || ""])
    )

    terminalOutputRef.current = nextOutputMap
    setCodeMap(nextCodeMap)
    setAnalysisMap(nextAnalysisMap)
    setOutputMap(nextOutputMap)

    const currentFiles = nextCodeMap[activeIndex] || {}
    const fileKeys = Object.keys(currentFiles)
    if (fileKeys.length > 0 && !Object.prototype.hasOwnProperty.call(currentFiles, activeFile)) {
      setActiveFile(fileKeys[0])
    }
  }, [activeIndex, activeFile, defaultFileName, initialSteps, isExperiment, language, readOnly, templateCode, totalSteps])



  useEffect(() => {
    const currentFiles = codeMap[activeIndex] || {}
    const fileNames = Object.keys(currentFiles)

    if (fileNames.length === 0) return
    if (Object.prototype.hasOwnProperty.call(currentFiles, activeFile)) return

    setActiveFile(fileNames[0])
  }, [activeFile, activeIndex, codeMap])

  useEffect(() => {
    if (bottomPanelTab === "terminal" && runningMap[activeIndex]) {
      terminalInputRef.current?.focus()
    }
  }, [activeIndex, bottomPanelTab, runningMap])

  useEffect(() => {
    terminalScrollRef.current?.scrollTo({ top: terminalScrollRef.current.scrollHeight })
  }, [activeIndex, outputMap])

  const handleInstructionChange = useCallback((index: number) => {
    const targetFiles = codeMap[index] || {}
    const firstFile = Object.keys(targetFiles)[0]

    setActiveIndex(index)
    if (firstFile) setActiveFile(firstFile)
    if (liveWorkspace && liveSection) {
      liveWorkspace.send({
        type: "active-section-changed",
        sectionType: liveSection.type,
        sectionId: liveSection.id,
        sectionName: liveSection.name,
      })
    }
  }, [codeMap, liveSection?.id, liveSection?.name, liveSection?.type, liveWorkspace])

  const saveCurrentSteps = useCallback(async (isManual: boolean = false) => {
    if (!onChange) return

    const steps = Array.from({ length: totalSteps }, (_, index) => ({
      files: codeMap[index] || {},
      output: terminalOutputRef.current[index] || outputMap[index] || "",
      analysis: analysisMap[index] || { type: "doc", content: [] },
    }))

    if (isManual) {
      setIsSaving(true)
    }
    setSaveStatus("")
    setSaveError("")

    try {
      await onChange(steps)
      setSaveStatus("Tersimpan")
      if (onSave) {
        onSave()
      }
      flushLiveFile()
      flushLiveAnalysis()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Gagal menyimpan workspace.")
    } finally {
      if (isManual) {
        setIsSaving(false)
      }
    }
  }, [analysisMap, codeMap, flushLiveAnalysis, flushLiveFile, liveSection?.id, liveSection?.name, liveSection?.type, liveWorkspace, onChange, onSave, outputMap, totalSteps])

  const appendOutput = useCallback((index: number, chunk: string) => {
    const nextOutput = `${terminalOutputRef.current[index] || ""}${chunk}`
    terminalOutputRef.current[index] = nextOutput
    setOutputMap(prev => ({
      ...prev,
      [index]: nextOutput,
    }))
  }, [])

  const handleRun = useCallback(() => {
    if (Object.values(runningMap).some(Boolean)) return

    const runIndex = activeIndex
    const runStartedAt = performance.now()
    const currentFiles = codeMap[runIndex] || {}

    if (onRun) {
      onRun()
    }
    const entryFile = currentFiles[activeFile] !== undefined
      ? activeFile
      : Object.keys(currentFiles)[0] || defaultFileName
    const executionId = crypto.randomUUID()
    const instructionId = runContext?.instructionIds?.[runIndex] ?? null

    setBottomPanelTab("terminal")
    setIsBottomPanelExpanded(true)
    setRunningMap(prev => ({
      ...prev,
      [runIndex]: true,
    }))
    setRunTimeMap(prev => ({
      ...prev,
      [runIndex]: "",
    }))
    terminalOutputRef.current[runIndex] = ""
    setOutputMap(prev => ({
      ...prev,
      [runIndex]: "",
    }))
    saveCurrentSteps()

    const finishRun = () => {
      setRunTimeMap(prev => ({
        ...prev,
        [runIndex]: formatRunTime(performance.now() - runStartedAt),
      }))
      setRunningMap(prev => ({
        ...prev,
        [runIndex]: false,
      }))
      saveCurrentSteps()
    }

    const client = new ExecutionClient({
      onMessage: (message) => {
        if (message.type === "started" || message.type === "start") return
        if (message.type === "output" || message.type === "stdout") {
          appendOutput(runIndex, message.data)
          return
        }
        if (message.type === "stderr") {
          appendOutput(runIndex, message.data)
          return
        }
        if (message.type === "error" || message.type === "timeout") {
          appendOutput(runIndex, message.type === "error" ? message.message || message.data || "" : message.data)
          finishRun()
          return
        }
        if (message.type === "exit") {
          finishRun()
          return
        }
        if (message.type === "stopped") {
          appendOutput(runIndex, `\n${message.data}`)
          finishRun()
          return
        }
        if (message.type === "runner_closed") finishRun()
      },
      onError: (message) => {
        appendOutput(runIndex, message)
        finishRun()
      },
      onClose: () => {
        setRunningMap(prev => ({
          ...prev,
          [runIndex]: false,
        }))
      },
    })

    executionClientRef.current = client
    client.run({
      language,
      code: Object.values(currentFiles).join("\n\n"),
      files: toRunnerFiles(currentFiles),
      entryFile,
      mainClass: language === "java" ? getMainClass(entryFile) : undefined,
      executionId,
      context: runContext ? {
        jobsheetId: runContext.jobsheetId,
        kelasPraktikumId: runContext.kelasPraktikumId,
        attemptType: runContext.attemptType ?? "normal",
        remedialId: runContext.remedialId ?? null,
        moduleType: runContext.moduleType,
        experimentId: runContext.experimentId ?? null,
        exerciseId: runContext.exerciseId ?? null,
        instructionId,
        entryFile,
      } : undefined,
    })
  }, [activeFile, activeIndex, appendOutput, codeMap, defaultFileName, language, onRun, runContext, runningMap, saveCurrentSteps])

  const handleSendInput = useCallback(() => {
    const value = normalizeStdin(currentInputMap[activeIndex] ?? "")
    if (!value) return

    executionClientRef.current?.sendInput(value)
    appendOutput(activeIndex, value)
    setCurrentInputMap(prev => ({
      ...prev,
      [activeIndex]: "",
    }))
  }, [activeIndex, appendOutput, currentInputMap])

  const handleReset = useCallback(() => {
    const resetFiles = parseTemplateFiles(templateCode || "", language, activeIndex, isExperiment)
    const firstFile = Object.keys(resetFiles)[0] || defaultFileName

    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: resetFiles,
    }))
    setActiveFile(firstFile)
    setCurrentInputMap(prev => ({
      ...prev,
      [activeIndex]: "",
    }))
    setOutputMap(prev => ({
      ...prev,
      [activeIndex]: "",
    }))
    terminalOutputRef.current[activeIndex] = ""
    setRunTimeMap(prev => ({
      ...prev,
      [activeIndex]: "",
    }))
    setEditorVersionMap(prev => ({
      ...prev,
      [activeIndex]: (prev[activeIndex] || 0) + 1,
    }))
  }, [activeIndex, defaultFileName, language, templateCode])

  const handleFilesChange = useCallback((newFiles: Record<string, string>, nextActiveFile?: string) => {
    setCodeMap((prev) => ({
      ...prev,
      [activeIndex]: newFiles,
    }))
    if (nextActiveFile) setActiveFile(nextActiveFile)
    if (nextActiveFile) {
      liveWorkspace?.send({
        type: "active-file-changed",
        filePath: nextActiveFile,
        activeFilePath: nextActiveFile,
        sectionType: liveSection?.type,
        sectionId: liveSection?.id,
        sectionName: liveSection?.name,
      })
    }
  }, [activeIndex, liveSection?.id, liveSection?.name, liveSection?.type, liveWorkspace])

  const handleBottomPanelResize = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const containerHeight = codingBodyRef.current?.clientHeight || 720
    const maxHeight = Math.max(140, Math.floor(containerHeight * 0.45))
    const startY = event.clientY
    const startHeight = bottomPanelHeight

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY
      setBottomPanelHeight(Math.min(Math.max(startHeight + delta, 140), maxHeight))
    }
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }, [bottomPanelHeight])

  const codeEditorProps = useMemo(() => ({
    language,
    files: codeMap[activeIndex] || {},
    activeFile,
    editorPath: `instruction-${activeIndex}/${activeFile}`,
    onChangeFile: (filePath: string) => {
      setActiveFile(filePath)
      liveWorkspace?.send({
        type: "active-file-changed",
        filePath,
        activeFilePath: filePath,
        sectionType: liveSection?.type,
        sectionId: liveSection?.id,
        sectionName: liveSection?.name,
      })
    },
    onCodeChange: (value: string) => {
      if (readOnly) return
      if (LIVE_WORKSPACE_DEBUG) {
        console.debug("[LIVE-WS][STUDENT] editor changed", {
          filePath: activeFile,
          contentLength: value.length,
          sectionType: liveSection?.type,
          sectionId: liveSection?.id,
        })
      }
      setCodeMap(prev => ({
        ...prev,
        [activeIndex]: {
          ...(prev[activeIndex] || {}),
          [activeFile]: value,
        },
      }))
      scheduleLiveFile(activeFile, value)
    },
    onFilesChange: handleFilesChange,
    getNewFileName: (files: Record<string, string>) => (
      `File${Object.keys(files).length + 1}.${getFileExtension(language)}`
    ),
    readOnly,
  }), [
    activeFile,
    activeIndex,
    codeMap,
    handleFilesChange,
    language,
    liveSection?.id,
    liveSection?.name,
    liveSection?.type,
    liveWorkspace,
    readOnly,
    scheduleLiveFile,
  ])

  const currentInstruction = instructions[activeIndex]
  const currentNeedsCode = currentInstruction?.needsCode !== undefined ? Boolean(currentInstruction.needsCode) : true

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* ── Delete File Confirm Modal ── */}
      {confirmDeleteFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setConfirmDeleteFile(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-80 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Hapus File "{activeFile}"</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">File ini akan dihapus dari workspace. Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setConfirmDeleteFile(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentFiles = codeMap[activeIndex] || {}
                  const nextFiles = { ...currentFiles }
                  delete nextFiles[activeFile]
                  const remaining = Object.keys(nextFiles)
                  handleFilesChange(nextFiles, remaining[0])
                  setConfirmDeleteFile(false)
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Hapus File
              </button>
            </div>
          </div>
        </div>
      )}

      {currentNeedsCode ? (
        <>
          <div className="h-[720px] min-h-[650px] overflow-hidden bg-[#1e1e1e]">
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex shrink-0 flex-col gap-2 border-b border-[#2b2b2b] bg-[#252526] px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
                  <div className="mr-2 shrink-0">
                    <p className="text-sm font-semibold text-white">
                      {isExercise ? "Workspace Kode Program Latihan" : "Workspace Kode Program"}
                    </p>
                    <p className="text-xs text-[#858585]">
                      {language}
                      {runStats?.hasRunEventData && runStats.instructionRunCounts ? (
                        <> · Eksekusi Instruksi Ini: {runStats.instructionRunCounts[activeIndex] ?? 0} kali</>
                      ) : null}
                    </p>
                  </div>
                  {!hideInstructionTabs && instructions.map((step, originalIndex) => (
                    <InstructionTabButton
                      key={originalIndex}
                      active={activeIndex === originalIndex}
                      onClick={() => handleInstructionChange(originalIndex)}
                    >
                      Instruksi {originalIndex + 1}
                      {step.needsCode === false && (
                        <span className="ml-1 rounded bg-emerald-700 px-1 py-0.2 text-[10px] text-emerald-100">
                          Text
                        </span>
                      )}
                      {runStats?.hasRunEventData && runStats.instructionRunCounts && step.needsCode ? (
                        <span className="ml-1 rounded bg-[#4b4b52] px-1.5 py-0.5 text-[11px] text-white">
                          {runStats.instructionRunCounts[originalIndex] ?? 0}x
                        </span>
                      ) : null}
                    </InstructionTabButton>
                  ))}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  {(saveStatus || saveError) && (
                    <span className={`shrink-0 text-xs font-medium ${saveError ? "text-red-300" : "text-emerald-300"}`}>
                      {saveError || saveStatus}
                    </span>
                  )}
                  {!readOnly && (
                    <>
                      <ToolbarButton
                        onClick={handleRun}
                        disabled={Object.values(runningMap).some(Boolean)}
                        primary
                      >
                        <Play size={16} fill="currentColor" aria-hidden="true" />
                        Run
                      </ToolbarButton>
                      {runningMap[activeIndex] && (
                        <ToolbarButton onClick={() => executionClientRef.current?.stop()} danger>
                          <Square size={16} fill="currentColor" aria-hidden="true" />
                          Stop
                        </ToolbarButton>
                      )}
                      <ToolbarButton
                        onClick={() => saveCurrentSteps(true)}
                        disabled={isSaving}
                      >
                        <Save size={16} aria-hidden="true" />
                        {isSaving ? "Saving" : "Save"}
                      </ToolbarButton>
                      <ToolbarButton
                        onClick={handleReset}
                        disabled={!!runningMap[activeIndex]}
                      >
                        <RotateCcw size={16} aria-hidden="true" />
                        Reset
                      </ToolbarButton>
                    </>
                  )}
                </div>
              </div>

              <div ref={codingBodyRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1">
                  <CodeEditorPanel key={`${activeIndex}-${editorVersionMap[activeIndex] || 0}`} {...codeEditorProps} />
                </div>
                <div
                  className="min-h-9 max-h-[45%] shrink-0 overflow-hidden border-t border-[#2b2b2b] bg-[#1e1e1e]"
                  style={{ height: isBottomPanelExpanded ? `${bottomPanelHeight}px` : "40px" }}
                >
                  {isBottomPanelExpanded && (
                    <div
                      onMouseDown={handleBottomPanelResize}
                      className="h-1 cursor-row-resize bg-[#2b2b2b] hover:bg-[#007acc]"
                      title="Resize bottom panel"
                    />
                  )}
                  <div className="flex h-10 items-center justify-between border-b border-[#2b2b2b] bg-[#252526] px-3">
                    <div className="flex h-full items-center gap-1">
                      <span className="text-xs font-semibold text-[#cccccc] uppercase tracking-wider">
                        Terminal Output
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {runTimeMap[activeIndex] && !runningMap[activeIndex] && (
                        <span className="text-xs text-[#858585]">{runTimeMap[activeIndex]}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsBottomPanelExpanded(prev => !prev)}
                        className="h-7 rounded px-2.5 text-xs font-semibold text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
                      >
                        {isBottomPanelExpanded ? "Collapse Terminal" : "Expand Terminal"}
                      </button>
                    </div>
                  </div>
                  {isBottomPanelExpanded && (
                    <div className="h-[calc(100%-44px)] min-h-0 overflow-hidden">
                      <TerminalPanel
                        output={outputMap[activeIndex] || ""}
                        isRunning={!!runningMap[activeIndex]}
                        currentInput={currentInputMap[activeIndex] || ""}
                        inputRef={terminalInputRef}
                        scrollRef={terminalScrollRef}
                        onCurrentInputChange={(value) => setCurrentInputMap(prev => ({
                          ...prev,
                          [activeIndex]: value,
                        }))}
                        onSendInput={handleSendInput}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Standalone Card for Analysis (Code Steps) ── */}
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3">
              <h4 className="text-sm font-bold text-gray-900">
                {isExercise ? "Analisis / Jawaban Latihan" : "Analisis Percobaan"}
              </h4>
              <p className="text-xs text-gray-500">
                {isExercise
                  ? "Tuliskan penjelasan, jawaban, atau analisis pengerjaan latihan Anda di bawah ini."
                  : "Tuliskan analisis, pengamatan, dan kesimpulan hasil eksekusi program Anda di bawah ini."}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
              <AnalysisEditor
                value={analysisMap[activeIndex] || { type: "doc", content: [] }}
                onChange={(value) => {
                  if (readOnly) return
                  setAnalysisMap(prev => ({
                    ...prev,
                    [activeIndex]: value,
                  }))
                  scheduleLiveAnalysis(value)
                }}
                readOnly={readOnly}
              />
            </div>
          </div>
        </>
      ) : (
        /* ── Non-Code Instruction Panel ── */
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Instruksi:</span>
              {!hideInstructionTabs && instructions.map((step, originalIndex) => (
                <button
                  key={originalIndex}
                  type="button"
                  onClick={() => handleInstructionChange(originalIndex)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeIndex === originalIndex
                      ? "bg-blue-700 text-white shadow-xs"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span>Instruksi {originalIndex + 1}</span>
                  {step.needsCode === false && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeIndex === originalIndex ? "bg-blue-800 text-blue-100" : "bg-emerald-100 text-emerald-800"}`}>
                      Non-Kode
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {(saveStatus || saveError) && (
                <span className={`text-xs font-semibold ${saveError ? "text-red-600" : "text-emerald-600"}`}>
                  {saveError || saveStatus}
                </span>
              )}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => saveCurrentSteps(true)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{isSaving ? "Menyimpan..." : "Simpan Jawaban"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={20} className="text-emerald-600" />
                  {isExercise
                    ? "Hasil Analisis & Jawaban Latihan"
                    : `Hasil Analisis & Jawaban Mahasiswa${instructions.length > 1 ? ` (Instruksi ${activeIndex + 1})` : ""}`}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Instruksi ini tidak memerlukan kode program. Tuliskan jawaban, penjelasan, atau hasil analisis Anda di bawah ini.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
              <AnalysisEditor
                value={analysisMap[activeIndex] || { type: "doc", content: [] }}
                onChange={(value) => {
                  if (readOnly) return
                  setAnalysisMap(prev => ({
                    ...prev,
                    [activeIndex]: value,
                  }))
                  scheduleLiveAnalysis(value)
                }}
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function InstructionTabButton({ active, children, onClick }: { active: boolean, children: React.ReactNode, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-md px-3 text-sm font-semibold ${
        active ? "bg-[#37373d] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}



function TerminalPanel({
  output,
  isRunning,
  currentInput,
  inputRef,
  scrollRef,
  onCurrentInputChange,
  onSendInput,
}: {
  output: string
  isRunning: boolean
  currentInput: string
  inputRef: React.RefObject<HTMLInputElement | null>
  scrollRef: React.RefObject<HTMLDivElement | null>
  onCurrentInputChange: (value: string) => void
  onSendInput: () => void
}) {
  return (
    <div
      ref={scrollRef}
      onClick={() => inputRef.current?.focus()}
      className="h-full cursor-text overflow-auto bg-[#0c0c0c] p-4 font-mono text-sm leading-6 text-gray-100"
    >
      {!output && !isRunning && <span className="text-gray-500">Belum ada output...</span>}
      {!output && isRunning && <span className="text-blue-300">Menunggu output realtime...</span>}
      <div className="whitespace-pre-wrap break-words">
        {output}
        {isRunning && (
          <input
            ref={inputRef}
            value={currentInput}
            onChange={(event) => onCurrentInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              onSendInput()
            }}
            spellCheck={false}
            autoComplete="off"
            className="inline-block min-w-32 max-w-full border-0 bg-transparent p-0 font-mono text-sm leading-6 text-gray-100 caret-emerald-300 outline-none"
            style={{ width: `${Math.max(currentInput.length + 1, 8)}ch` }}
          />
        )}
      </div>
    </div>
  )
}

function ToolbarButton({
  children,
  danger,
  disabled,
  onClick,
  primary,
  title,
}: {
  children: React.ReactNode
  danger?: boolean
  disabled?: boolean
  onClick: () => void
  primary?: boolean
  title?: string
}) {
  const color = danger
    ? "bg-red-600 text-white hover:bg-red-700"
    : primary
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "border border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-[#3c3c3c] disabled:text-[#858585] ${color}`}
    >
      {children}
    </button>
  )
}
