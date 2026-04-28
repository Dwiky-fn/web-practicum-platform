import { useEffect, useState, useCallback, useMemo } from "react"
import type { JSONContent } from "@tiptap/react"
import CodeEditorPanel from "../../../../../../../shared/code-editor/CodeEditorPanel"
import OutputPanel from "../../../../../../../shared/code-editor/OutputPanel"
import AnalysisEditor from "./workSpace/AnalysisEditor"
import { runCode } from "../../../../../../../services/judge0/service"

interface Props {
  instructions: JSONContent[]
  templateCode: string
  language: string
  judge0LanguageId?: number
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

export default function InstructionWorkspaceCard({
  instructions,
  templateCode,
  language,
  judge0LanguageId,
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

  // RUN = SAVE TRIGGER
  const handleRun = useCallback(async () => {
    if (runningMap[activeIndex]) return

    const runIndex = activeIndex
    const stdin = normalizeStdin(currentInputMap[runIndex] ?? "")
    const runStartedAt = performance.now()

    setRunningMap(prev => ({
      ...prev,
      [runIndex]: true,
    }))
    setRunTimeMap(prev => ({
      ...prev,
      [runIndex]: "",
    }))

    try {
      const currentFiles = codeMap[runIndex] || {}
      const source_code = Object.values(currentFiles).join("\n\n")

      if (!judge0LanguageId) {
        const errorMessage = "Judge0 language id belum tersedia dari database"

        setOutputMap(prev => ({
          ...prev,
          [runIndex]: errorMessage
        }))
        return
      }

      const result = await runCode(
        source_code,
        judge0LanguageId,
        stdin
      )
      const runFinishedAt = performance.now()

      const newOutput =
        result.stdout ||
        result.stderr ||
        result.compile_output ||
        result.message ||
        "No output"

      setRunTimeMap(prev => ({
        ...prev,
        [runIndex]: formatRunTime(runFinishedAt - runStartedAt),
      }))

      setOutputMap(prev => {
        const updatedOutputMap = {
          ...prev,
          [runIndex]: newOutput
        }

        if (onChange) {
          const steps =
            instructions.length > 0
              ? instructions.map((_, i) => ({
                  files: codeMap[i] || {},
                  output: updatedOutputMap[i] || "",
                  analysis: analysisMap[i] || { type: "doc", content: [] },
                }))
              : [
                  {
                    files: codeMap[0] || {},
                    output: updatedOutputMap[0] || "",
                    analysis: analysisMap[0] || { type: "doc", content: [] },
                  },
                ]

          onChange(steps)
        }

        return updatedOutputMap
      })
    } catch (err) {
      console.error(err)

      const errorMessage = "Error saat menjalankan kode"

      setOutputMap(prev => ({
        ...prev,
        [runIndex]: errorMessage
      }))
    } finally {
      setRunningMap(prev => ({
        ...prev,
        [runIndex]: false,
      }))
    }
  }, [
    activeIndex,
    instructions,
    codeMap,
    analysisMap,
    onChange,
    judge0LanguageId,
    runningMap,
    currentInputMap
  ])

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
    setRunTimeMap(prev => ({
      ...prev,
      [activeIndex]: "",
    }))

    if (onChange) {
      const steps =
        instructions.length > 0
          ? instructions.map((_, i) => ({
              files: i === activeIndex ? resetFiles : codeMap[i] || {},
              output: i === activeIndex ? "" : outputMap[i] || "",
              analysis: analysisMap[i] || { type: "doc", content: [] },
            }))
          : [
              {
                files: resetFiles,
                output: "",
                analysis: analysisMap[0] || { type: "doc", content: [] },
              },
            ]

      onChange(steps)
    }
  }, [
    activeIndex,
    analysisMap,
    codeMap,
    defaultFileName,
    instructions,
    onChange,
    outputMap,
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
          onReset={handleReset}
          onRun={handleRun}
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
