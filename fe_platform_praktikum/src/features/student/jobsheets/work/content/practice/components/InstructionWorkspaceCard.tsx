import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { JSONContent } from "@tiptap/react"
import { ChevronDown, ChevronUp, Play, RotateCcw, Save, Square } from "lucide-react"
import CodeEditorPanel from "../../../../../../../components/code-editor/CodeEditorPanel"
import AnalysisEditor from "./workSpace/AnalysisEditor"
import { ExecutionClient } from "../../../../../../../services/execution/executionClient"

interface Props {
  title: string
  label: string
  instructions: JSONContent[]
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
}

type BottomPanelTab = "terminal" | "analysis"

function getDefaultFileName(language: string): string {
  switch (language) {
    case "java": return "Main.java"
    case "javascript": return "index.js"
    case "typescript": return "index.ts"
    case "python": return "main.py"
    default: return `main.${language || "txt"}`
  }
}

function getFileExtension(language: string): string {
  return getDefaultFileName(language).split(".").pop() || "txt"
}

function hasFiles(files?: Record<string, string>): files is Record<string, string> {
  return !!files && Object.keys(files).length > 0
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
  title,
  label,
  instructions,
  templateCode,
  language,
  onChange,
  initialSteps,
}: Props) {
  const defaultFileName = getDefaultFileName(language)
  const totalSteps = Math.max(instructions.length, initialSteps?.length || 0, 1)
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeFile, setActiveFile] = useState(defaultFileName)
  const [codeMap, setCodeMap] = useState<Record<number, Record<string, string>>>({})
  const [analysisMap, setAnalysisMap] = useState<Record<number, JSONContent>>({})
  const [outputMap, setOutputMap] = useState<Record<number, string>>({})
  const [currentInputMap, setCurrentInputMap] = useState<Record<number, string>>({})
  const [runTimeMap, setRunTimeMap] = useState<Record<number, string>>({})
  const [runningMap, setRunningMap] = useState<Record<number, boolean>>({})
  const [editorVersionMap, setEditorVersionMap] = useState<Record<number, number>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")
  const [saveError, setSaveError] = useState("")
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false)
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>("terminal")
  const [isBottomPanelExpanded, setIsBottomPanelExpanded] = useState(true)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(220)
  const codingBodyRef = useRef<HTMLDivElement | null>(null)
  const executionClientRef = useRef<ExecutionClient | null>(null)
  const terminalOutputRef = useRef<Record<number, string>>({})
  const terminalInputRef = useRef<HTMLInputElement | null>(null)
  const terminalScrollRef = useRef<HTMLDivElement | null>(null)
  const hasHydratedInitialStateRef = useRef(false)

  useEffect(() => {
    return () => executionClientRef.current?.close()
  }, [])

  useEffect(() => {
    if (hasHydratedInitialStateRef.current) return

    const nextCodeMap = Object.fromEntries(
      Array.from({ length: totalSteps }, (_, index) => {
        const savedFiles = initialSteps?.[index]?.files

        return [
          index,
          hasFiles(savedFiles) ? savedFiles : { [defaultFileName]: templateCode || "" },
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
    setActiveIndex(0)
    setActiveFile(Object.keys(nextCodeMap[0] || {})[0] || defaultFileName)
    setIsDirty(false)
    setSaveStatus("")
    setSaveError("")
    hasHydratedInitialStateRef.current = true
  }, [initialSteps, templateCode, defaultFileName, totalSteps])

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
  }, [codeMap])

  const saveCurrentSteps = useCallback(async () => {
    if (!onChange) return

    const steps = Array.from({ length: totalSteps }, (_, index) => ({
      files: codeMap[index] || {},
      output: terminalOutputRef.current[index] ?? outputMap[index] ?? "",
      analysis: analysisMap[index] || { type: "doc", content: [] },
    }))

    setIsSaving(true)
    setSaveStatus("")
    setSaveError("")

    try {
      await onChange(steps)
      setIsDirty(false)
      setSaveStatus("Tersimpan")
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Gagal menyimpan workspace.")
    } finally {
      setIsSaving(false)
    }
  }, [analysisMap, codeMap, onChange, outputMap, totalSteps])

  const appendOutput = useCallback((index: number, chunk: string) => {
    const nextOutput = `${terminalOutputRef.current[index] || ""}${chunk}`
    terminalOutputRef.current[index] = nextOutput
    setIsDirty(true)
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
    const entryFile = currentFiles[activeFile] !== undefined
      ? activeFile
      : Object.keys(currentFiles)[0] || defaultFileName

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
    })
  }, [activeFile, activeIndex, appendOutput, codeMap, defaultFileName, language, runningMap, saveCurrentSteps])

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
    const resetFiles = { [defaultFileName]: templateCode || "" }

    setIsDirty(true)
    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: resetFiles,
    }))
    setActiveFile(defaultFileName)
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
  }, [activeIndex, defaultFileName, templateCode])

  const handleFilesChange = useCallback((files: Record<string, string>, nextActiveFile?: string) => {
    setIsDirty(true)
    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: files,
    }))
    if (nextActiveFile) setActiveFile(nextActiveFile)
  }, [activeIndex])

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
    onChangeFile: setActiveFile,
    onCodeChange: (value: string) => {
      setIsDirty(true)
      setCodeMap(prev => ({
        ...prev,
        [activeIndex]: {
          ...(prev[activeIndex] || {}),
          [activeFile]: value,
        },
      }))
    },
    onFilesChange: handleFilesChange,
    getNewFileName: (files: Record<string, string>) => (
      `File${Object.keys(files).length + 1}.${getFileExtension(language)}`
    ),
  }), [activeFile, activeIndex, codeMap, handleFilesChange, language])

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {!isWorkspaceExpanded ? (
        <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{label}</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">{title}</h2>
            {isDirty && <p className="mt-1 text-xs font-medium text-amber-600">Perubahan belum disimpan</p>}
          </div>
          <button
            type="button"
            onClick={() => setIsWorkspaceExpanded(true)}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <ChevronDown size={16} />
            Expand Workspace
          </button>
        </div>
      ) : (
        <div className="h-[720px] min-h-[650px] overflow-hidden bg-[#1e1e1e]">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 flex-col gap-2 border-b border-[#2b2b2b] bg-[#252526] px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
                <div className="mr-2 shrink-0">
                  <p className="text-sm font-semibold text-white">Workspace Praktikum</p>
                  <p className="text-xs text-[#858585]">{language}</p>
                </div>
                {Array.from({ length: totalSteps }, (_, index) => (
                  <InstructionTabButton
                    key={index}
                    active={activeIndex === index}
                    onClick={() => handleInstructionChange(index)}
                  >
                    Instruksi {index + 1}
                  </InstructionTabButton>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                {(saveStatus || saveError) && (
                  <span className={`shrink-0 text-xs font-medium ${saveError ? "text-red-300" : "text-emerald-300"}`}>
                    {saveError || saveStatus}
                  </span>
                )}
                <ToolbarButton onClick={handleRun} disabled={Object.values(runningMap).some(Boolean)} primary>
                  <Play size={16} fill="currentColor" aria-hidden="true" />
                  Run
                </ToolbarButton>
                {runningMap[activeIndex] && (
                  <ToolbarButton onClick={() => executionClientRef.current?.stop()} danger>
                    <Square size={16} fill="currentColor" aria-hidden="true" />
                    Stop
                  </ToolbarButton>
                )}
                <ToolbarButton onClick={() => saveCurrentSteps()} disabled={isSaving}>
                  <Save size={16} aria-hidden="true" />
                  {isSaving ? "Saving" : "Save"}
                </ToolbarButton>
                <ToolbarButton onClick={handleReset} disabled={!!runningMap[activeIndex]}>
                  <RotateCcw size={16} aria-hidden="true" />
                  Reset
                </ToolbarButton>
                <ToolbarButton onClick={() => setIsWorkspaceExpanded(false)}>
                  <ChevronUp size={16} aria-hidden="true" />
                  Collapse
                </ToolbarButton>
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
                <div className="flex h-10 items-center justify-between border-b border-[#2b2b2b] bg-[#252526] px-2">
                  <div className="flex h-full items-center gap-1">
                    <BottomTabButton active={bottomPanelTab === "terminal"} onClick={() => {
                      setBottomPanelTab("terminal")
                      setIsBottomPanelExpanded(true)
                    }}>
                      Terminal
                    </BottomTabButton>
                    <BottomTabButton active={bottomPanelTab === "analysis"} onClick={() => {
                      setBottomPanelTab("analysis")
                      setIsBottomPanelExpanded(true)
                    }}>
                      Analisis
                    </BottomTabButton>
                  </div>
                  <div className="flex items-center gap-2">
                    {runTimeMap[activeIndex] && !runningMap[activeIndex] && (
                      <span className="text-xs text-[#858585]">{runTimeMap[activeIndex]}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsBottomPanelExpanded(prev => !prev)}
                      className="h-8 rounded px-3 text-sm font-semibold text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
                    >
                      {isBottomPanelExpanded ? "Collapse Panel" : "Expand Panel"}
                    </button>
                  </div>
                </div>
                {isBottomPanelExpanded && (
                  <div className="h-[calc(100%-44px)] min-h-0 overflow-hidden">
                    {bottomPanelTab === "terminal" ? (
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
                    ) : (
                      <div className="h-full overflow-y-auto bg-white p-4">
                        <AnalysisEditor
                          value={analysisMap[activeIndex] || { type: "doc", content: [] }}
                          onChange={(value) => {
                            setIsDirty(true)
                            setAnalysisMap(prev => ({
                              ...prev,
                              [activeIndex]: value,
                            }))
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
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

function BottomTabButton({ active, children, onClick }: { active: boolean, children: React.ReactNode, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 border-t-2 px-3 text-sm font-semibold ${
        active ? "border-t-[#007acc] bg-[#1e1e1e] text-white" : "border-t-transparent text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
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
}: {
  children: React.ReactNode
  danger?: boolean
  disabled?: boolean
  onClick: () => void
  primary?: boolean
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
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-[#3c3c3c] disabled:text-[#858585] ${color}`}
    >
      {children}
    </button>
  )
}
