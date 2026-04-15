import { useState } from "react"
import type { JSONContent } from "@tiptap/react"
import CodeEditorPanel from "../../../../../../../shared/code-editor/CodeEditorPanel"
import OutputPanel from "../../../../../../../shared/code-editor/OutputPanel"
import AnalysisEditor from "./workSpace/AnalysisEditor"

interface Props {
  instructions: JSONContent[]
  templateCode: string
  language: string
}

function getDefaultFileName(language: string) {
  switch (language) {
    case "java":
      return "Main.java"
    case "javascript":
      return "index.js"
    case "typescript":
      return "index.ts"
    case "python":
      return "main.py"
    default:
      return `main.${language}`
  }
}

export default function InstructionWorkspaceCard({
  instructions,
  templateCode,
  language,
}: Props) {
  
  const defaultFileName = getDefaultFileName(language)

  const [activeIndex, setActiveIndex] = useState(0)
  const [activeFile, setActiveFile] = useState<string>(defaultFileName)

  const [codeMap, setCodeMap] = useState<
    Record<number, Record<string, string>>
  >(() =>
    Object.fromEntries(
      instructions.map((_, i) => [
        i,
        {
          [defaultFileName]: templateCode
        }
      ])
    )
  )


  const [analysisMap, setAnalysisMap] =
    useState<Record<number, JSONContent>>(() =>
      Object.fromEntries(
        instructions.map((_, i) => [
          i,
          { type: "doc", content: [] },
        ])
      )
    )

  const [outputMap, setOutputMap] =
    useState<Record<number, string>>(() =>
      Object.fromEntries(
        instructions.map((_, i) => [i, ""])
      )
    )

  const handleRun = () => {
    const files = codeMap[activeIndex]

    console.log(files)

    setOutputMap(prev => ({
      ...prev,
      [activeIndex]: "Program dijalankan (dummy output)..."
    }))
  }

  const handleReset = () => {
    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: {
        ...prev[activeIndex],
        [activeFile]: templateCode
      }
    }))
  }

  const handleAddFile = () => {
    const newFile = `File${Object.keys(codeMap[activeIndex]).length + 1}.java`

    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: {
        ...prev[activeIndex],
        [newFile]: ""
      }
    }))

    setActiveFile(newFile)
  }

  const handleRenameFile = (oldName: string, newName: string) => {
    if (!newName || oldName === newName) return

    setCodeMap(prev => {
      const currentFiles = prev[activeIndex]
      const { [oldName]: content, ...rest } = currentFiles

      return {
        ...prev,
        [activeIndex]: {
          ...rest,
          [newName]: content
        }
      }
    })

    setActiveFile(newName)
  }

  const handleDeleteFile = (fileName: string) => {
    const files = codeMap[activeIndex]

    if (Object.keys(files).length === 1) {
      alert("Minimal harus ada 1 file")
      return
    }

    const rest = Object.fromEntries(
      Object.entries(files).filter(([key]) => key !== fileName)
    )

    setCodeMap(prev => ({
      ...prev,
      [activeIndex]: rest
    }))

    if (fileName === activeFile) {
      setActiveFile(Object.keys(rest)[0])
    }
  }

  return (
    <div className="mt-3 border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white">

      {/* Tab Instruksi */}
      {instructions.length > 1 && (
        <div className="flex border-b bg-gray-100">
          {instructions.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeIndex === index
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-gray-600"
              }`}
            >
              Program {index + 1}
            </button>
          ))}
        </div>
      )}

      {/* Code Editor */}
      <div className="p-6 border-b">
        <CodeEditorPanel
          language={language}
          files={codeMap[activeIndex]}
          activeFile={activeFile}
          onChangeFile={setActiveFile}
          onCodeChange={(value) =>
            setCodeMap(prev => ({
              ...prev,
              [activeIndex]: {
                ...prev[activeIndex],
                [activeFile]: value
              }
            }))
          }
          onRun={handleRun}
          onReset={handleReset}
          onAddFile={handleAddFile}
          onRenameFile={handleRenameFile}
          onDeleteFile={handleDeleteFile}
        />
      </div>

      {/* Output */}
      <div className="p-6 border-b bg-gray-50">
        <OutputPanel output={outputMap[activeIndex]} />
      </div>

      {/* Analisis */}
      <div className="p-6">
        <AnalysisEditor
          value={analysisMap[activeIndex]}
          onChange={(value) =>
            setAnalysisMap(prev => ({
              ...prev,
              [activeIndex]: value,
            }))
          }
        />
      </div>
    </div>
  )
}