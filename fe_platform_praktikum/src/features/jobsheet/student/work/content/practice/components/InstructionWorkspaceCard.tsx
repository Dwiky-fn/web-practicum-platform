import { useEffect, useState, useCallback, useMemo } from "react"
import type { JSONContent } from "@tiptap/react"
import CodeEditorPanel from "../../../../../../../shared/code-editor/CodeEditorPanel"
import OutputPanel from "../../../../../../../shared/code-editor/OutputPanel"
import AnalysisEditor from "./workSpace/AnalysisEditor"

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

  // ✅ HYDRATION (ambil dari DB dulu, kalau ada)
  useEffect(() => {
    if (initialSteps && initialSteps.length > 0) {
      const newCodeMap = Object.fromEntries(
        initialSteps.map((step, i) => [i, step.files || {}])
      )

      const newAnalysisMap = Object.fromEntries(
        initialSteps.map((step, i) => [i, step.analysis || { type: "doc", content: [] }])
      )

      const newOutputMap = Object.fromEntries(
        initialSteps.map((step, i) => [i, step.output || ""])
      )

      setCodeMap(newCodeMap)
      setAnalysisMap(newAnalysisMap)
      setOutputMap(newOutputMap)

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
    }
  }, [initialSteps, instructions, templateCode, defaultFileName])

  // ✅ CODE CHANGE (NO AUTOSAVE)
  const handleCodeChange = useCallback((value: string) => {
    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: {
        ...(prev[activeIndex] || {}),
        [activeFile]: value
      }
    }))
  }, [activeIndex, activeFile])

  // ✅ ANALYSIS CHANGE (NO AUTOSAVE)
  const handleAnalysisChange = useCallback((value: JSONContent) => {
    setAnalysisMap(prev => ({
      ...prev,
      [activeIndex]: value,
    }))
  }, [activeIndex])

  // ✅ RUN = SAVE TRIGGER
  const handleRun = useCallback(() => {
    const newOutput = "Program dijalankan (dummy output)..."

    console.log("🔥 CODEMAP:", codeMap)

    setOutputMap(prev => {
      const updatedOutputMap = {
        ...prev,
        [activeIndex]: newOutput
      }

      if (onChange) {
        const steps =
          instructions.length > 0
            ? instructions.map((_, i) => ({
                files: codeMap[i] || {},
                output: updatedOutputMap[i] || "", // ✅ FIX DISINI
                analysis: analysisMap[i] || { type: "doc", content: [] },
              }))
            : [
                {
                  files: codeMap[0] || {},
                  output: updatedOutputMap[0] || "",
                  analysis: analysisMap[0] || { type: "doc", content: [] },
                },
              ]

        console.log("🔥 STEPS TO SAVE:", steps)

        onChange(steps)
      }

      return updatedOutputMap
    })
  }, [activeIndex, instructions, codeMap, analysisMap, onChange])

  // ✅ RESET
  const handleReset = useCallback(() => {
    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: {
        ...(prev[activeIndex] || {}),
        [activeFile]: templateCode || ""
      }
    }))
  }, [activeIndex, activeFile, templateCode])

  // FILE HANDLING
  const handleAddFile = useCallback(() => {
    const current = codeMap[activeIndex] || {}
    const newFile = `File${Object.keys(current).length + 1}.${language}`

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
    if (!current || !current[oldName]) return

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
    onChangeFile: setActiveFile,
    onCodeChange: handleCodeChange,
    onRun: handleRun,
    onReset: handleReset,
    onAddFile: handleAddFile,
    onRenameFile: handleRenameFile,
    onDeleteFile: handleDeleteFile,
  }), [
    language,
    codeMap,
    activeIndex,
    activeFile,
    handleCodeChange,
    handleRun,
    handleReset,
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
              onClick={() => setActiveIndex(i)}
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
        <OutputPanel output={outputMap[activeIndex] || ""} />
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