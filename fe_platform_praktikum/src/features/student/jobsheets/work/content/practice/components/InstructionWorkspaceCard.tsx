import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import type { JSONContent } from "@tiptap/react"
import CodeEditorPanel from "../../../../../../../components/code-editor/CodeEditorPanel"
import OutputPanel from "../../../../../../../components/code-editor/OutputPanel"
import AnalysisEditor from "./workSpace/AnalysisEditor"
import { ExecutionClient } from "../../../../../../../services/execution/executionClient"

interface Props {
  instructions: JSONContent[]
  templateCode: string
  language: string
  onChange?: (steps: {
    files: Record<string, string>
    output: string
    analysis: JSONContent
  }[]) => void
  initialSteps?: {
    files: Record<string, string>
    output: string
    analysis: JSONContent
  }[]
}

function getDefaultFileName(language: string): string {
  switch (language) {
    case "java": return "Main.java"
    case "javascript": return "index.js"
    case "typescript": return "index.ts"
    case "python": return "main.py"
    default: return `main.${language || 'txt'}`
  }
}

function getFileExtension(language: string): string {
  const fileName = getDefaultFileName(language)
  const extension = fileName.split(".").pop()

  return extension || "txt"
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
  return Object.entries(files).map(([path, content]) => ({
    path,
    content,
  }))
}

function getMainClass(fileName: string): string {
  return fileName.replace(/\.java$/i, "").split(/[\\/]/).pop() || "Main"
}

export default function InstructionWorkspaceCard({
  instructions,
  templateCode,
  language,
  onChange,
  initialSteps
}: Props) {
  const defaultFileName = getDefaultFileName(language)

  const [activeIndex, setActiveIndex] = useState(0)
  const [activeFile, setActiveFile] = useState(defaultFileName)

  const [codeMap, setCodeMap] = useState<Record<number, Record<string, string>>>({})
  const [analysisMap, setAnalysisMap] = useState<Record<number, JSONContent>>({})
  const [outputMap, setOutputMap] = useState<Record<number, string>>({})
  const [currentInputMap, setCurrentInputMap] = useState<Record<number, string>>({})
  const [runTimeMap, setRunTimeMap] = useState<Record<number, string>>({})
  const [runningMap, setRunningMap] = useState<Record<number, boolean>>({})
  const executionClientRef = useRef<ExecutionClient | null>(null)
  const terminalOutputRef = useRef<Record<number, string>>({})

  useEffect(() => {
    return () => {
      executionClientRef.current?.close()
    }
  }, [])

  useEffect(() => {
    const currentFiles = codeMap[activeIndex] || {}
    const fileNames = Object.keys(currentFiles)

    if (fileNames.length === 0) return

    if (!Object.prototype.hasOwnProperty.call(currentFiles, activeFile)) {
      setActiveFile(fileNames[0])
    }
  }, [activeIndex, activeFile, codeMap])

  // HYDRATION (ambil dari DB dulu, kalau ada)
  useEffect(() => {
    if (initialSteps && initialSteps.length > 0) {
      const totalSteps = Math.max(instructions.length, initialSteps.length)

      const newCodeMap = Object.fromEntries(
        Array.from({ length: totalSteps }, (_, i) => {
          const savedFiles = initialSteps[i]?.files

          return [
            i,
            hasFiles(savedFiles)
              ? savedFiles
              : { [defaultFileName]: templateCode || "" }
          ]
        })
      )

      const newAnalysisMap = Object.fromEntries(
        Array.from({ length: totalSteps }, (_, i) => [
          i,
          initialSteps[i]?.analysis || { type: "doc", content: [] }
        ])
      )

      const newOutputMap = Object.fromEntries(
        Array.from({ length: totalSteps }, (_, i) => [i, initialSteps[i]?.output || ""])
      )

      terminalOutputRef.current = newOutputMap
      setCodeMap(newCodeMap)
      setAnalysisMap(newAnalysisMap)
      setOutputMap(newOutputMap)
      setCurrentInputMap(Object.fromEntries(Array.from({ length: totalSteps }, (_, i) => [i, ""])))
      setRunTimeMap(Object.fromEntries(Array.from({ length: totalSteps }, (_, i) => [i, ""])))

      return
    }

    if (instructions.length > 0) {
      const defaultCodeMap = Object.fromEntries(
        instructions.map((_, i) => [i, { [defaultFileName]: templateCode || "" }])
      )

      setCodeMap(defaultCodeMap)
      setAnalysisMap(
        Object.fromEntries(instructions.map((_, i) => [i, { type: "doc", content: [] }]))
      )
      setOutputMap(
        Object.fromEntries(instructions.map((_, i) => [i, ""]))
      )
      terminalOutputRef.current = Object.fromEntries(instructions.map((_, i) => [i, ""]))
      setCurrentInputMap(
        Object.fromEntries(instructions.map((_, i) => [i, ""]))
      )
      setRunTimeMap(
        Object.fromEntries(instructions.map((_, i) => [i, ""]))
      )
    }
  }, [initialSteps, instructions, templateCode, defaultFileName])

  // CODE CHANGE (NO AUTOSAVE)
  const handleCodeChange = useCallback((value: string) => {
    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: {
        ...(prev[activeIndex] || {}),
        [activeFile]: value
      }
    }))
  }, [activeIndex, activeFile])

  // ANALYSIS CHANGE (NO AUTOSAVE)
  const handleAnalysisChange = useCallback((value: JSONContent) => {
    setAnalysisMap(prev => ({
      ...prev,
      [activeIndex]: value,
    }))
  }, [activeIndex])

  const handleInstructionChange = useCallback((index: number) => {
    const targetFiles = codeMap[index] || {}
    const firstFile = Object.keys(targetFiles)[0]

    setActiveIndex(index)

    if (firstFile) {
      setActiveFile(firstFile)
    }
  }, [codeMap])

  const handleCurrentInputChange = useCallback((value: string) => {
    setCurrentInputMap(prev => ({
      ...prev,
      [activeIndex]: value,
    }))
  }, [activeIndex])

  const saveCurrentSteps = useCallback(() => {
    if (!onChange) return

    const steps =
      instructions.length > 0
        ? instructions.map((_, i) => ({
          files: codeMap[i] || {},
          output: terminalOutputRef.current[i] ?? outputMap[i] ?? "",
          analysis: analysisMap[i] || { type: "doc", content: [] },
        }))
        : [
          {
            files: codeMap[0] || {},
            output: terminalOutputRef.current[0] ?? outputMap[0] ?? "",
            analysis: analysisMap[0] || { type: "doc", content: [] },
          },
        ]

    onChange(steps)
  }, [analysisMap, codeMap, instructions, onChange, outputMap])

  const finishRun = useCallback((stepIndex: number, runStartedAt: number) => {
    setRunTimeMap(prev => ({
      ...prev,
      [stepIndex]: formatRunTime(performance.now() - runStartedAt),
    }))
    setRunningMap(prev => ({
      ...prev,
      [stepIndex]: false,
    }))
  }, [])

  const appendOutput = useCallback((stepIndex: number, chunk: string) => {
    const nextOutput = `${terminalOutputRef.current[stepIndex] || ""}${chunk}`
    terminalOutputRef.current[stepIndex] = nextOutput

    setOutputMap(prev => ({
      ...prev,
      [stepIndex]: nextOutput,
    }))
  }, [])

  // RUN
  const handleRun = useCallback(() => {
    if (Object.values(runningMap).some(Boolean)) return

    const runIndex = activeIndex
    const runStartedAt = performance.now()
    const currentFiles = codeMap[runIndex] || {}
    const sourceCode = Object.values(currentFiles).join("\n\n")
    const entryFile = currentFiles[activeFile] !== undefined
      ? activeFile
      : Object.keys(currentFiles)[0] || defaultFileName

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

    const appendAndBufferOutput = (chunk: string) => {
      appendOutput(runIndex, chunk)
    }

    const finishAndSaveRun = () => {
      finishRun(runIndex, runStartedAt)
      saveCurrentSteps()
    }

    const client = new ExecutionClient({
      onMessage: (message) => {
        if (message.type === "started") {
          return
        }

        if (message.type === "output") {
          appendAndBufferOutput(message.data)
          return
        }

        if (message.type === "error") {
          appendAndBufferOutput(message.data)
          finishAndSaveRun()
          return
        }

        if (message.type === "timeout") {
          appendAndBufferOutput(message.data)
          finishAndSaveRun()
          return
        }

        if (message.type === "exit") {
          finishAndSaveRun()
          return
        }

        if (message.type === "stopped") {
          appendAndBufferOutput(`\n${message.data}`)
          finishAndSaveRun()
          return
        }

        if (message.type === "runner_closed") {
          finishAndSaveRun()
        }
      },
      onError: (message) => {
        appendAndBufferOutput(message)
        finishAndSaveRun()
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
      code: sourceCode,
      files: toRunnerFiles(currentFiles),
      entryFile,
      mainClass: language === "java" ? getMainClass(entryFile) : undefined,
    })
  }, [
    activeIndex,
    activeFile,
    codeMap,
    defaultFileName,
    language,
    runningMap,
    appendOutput,
    finishRun,
    saveCurrentSteps,
  ])

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

  const handleStop = useCallback(() => {
    executionClientRef.current?.stop()
    setRunningMap(prev => ({
      ...prev,
      [activeIndex]: false,
    }))
  }, [activeIndex])

  // RESET
  const handleReset = useCallback(() => {
    const resetFiles = {
      [defaultFileName]: templateCode || ""
    }

    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: resetFiles
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
  }, [
    activeIndex,
    defaultFileName,
    templateCode
  ])

  // FILE HANDLING
  const handleAddFile = useCallback(() => {
    const current = codeMap[activeIndex] || {}
    const newFile = `File${Object.keys(current).length + 1}.${getFileExtension(language)}`

    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: {
        ...current,
        [newFile]: ""
      }
    }))

    setActiveFile(newFile)
  }, [activeIndex, codeMap, language])

  const handleRenameFile = useCallback((oldName: string, newName: string) => {
    const current = codeMap[activeIndex]
    if (!current || !Object.prototype.hasOwnProperty.call(current, oldName)) return
    if (oldName === newName) return
    if (Object.prototype.hasOwnProperty.call(current, newName)) return

    const { [oldName]: content, ...rest } = current

    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: {
        ...rest,
        [newName]: content
      }
    }))

    setActiveFile(newName)
  }, [activeIndex, codeMap])

  const handleDeleteFile = useCallback((fileName: string) => {
    const current = codeMap[activeIndex]
    if (!current) return

    if (Object.keys(current).length <= 1) return

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [fileName]: _, ...rest } = current

    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: rest
    }))

    if (fileName === activeFile) {
      setActiveFile(Object.keys(rest)[0])
    }
  }, [activeIndex, activeFile, codeMap])

  const codeEditorProps = useMemo(() => ({
    language,
    files: codeMap[activeIndex] || {},
    activeFile,
    editorPath: `instruction-${activeIndex}/${activeFile}`,
    onChangeFile: setActiveFile,
    onCodeChange: handleCodeChange,
    onAddFile: handleAddFile,
    onRenameFile: handleRenameFile,
    onDeleteFile: handleDeleteFile,
  }), [
    language,
    codeMap,
    activeIndex,
    activeFile,
    handleCodeChange,
    handleAddFile,
    handleRenameFile,
    handleDeleteFile
  ])

  return (
    <div className="mt-3 border rounded-xl bg-white">
      {instructions.length > 1 && (
        <div className="flex border-b bg-gray-100">
          {instructions.map((_, i) => (
            <button
              key={i}
              onClick={() => handleInstructionChange(i)}
              className={activeIndex === i ? "text-blue-600 px-4 py-2" : "px-4 py-2"}
            >
              Instruksi {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="p-6 border-b">
        <CodeEditorPanel {...codeEditorProps} />
      </div>

      <div className="p-6 border-b bg-gray-50">
        <OutputPanel
          output={outputMap[activeIndex] || ""}
          isRunning={!!runningMap[activeIndex]}
          runTime={runTimeMap[activeIndex] || ""}
          currentInput={currentInputMap[activeIndex] || ""}
          onCurrentInputChange={handleCurrentInputChange}
          onSendInput={handleSendInput}
          onReset={handleReset}
          onRun={handleRun}
          onSave={saveCurrentSteps}
          onStop={handleStop}
        />
      </div>

      <div className="p-6">
        <AnalysisEditor
          value={analysisMap[activeIndex] || { type: "doc", content: [] }}
          onChange={handleAnalysisChange}
        />
      </div>
    </div>
  )
}
