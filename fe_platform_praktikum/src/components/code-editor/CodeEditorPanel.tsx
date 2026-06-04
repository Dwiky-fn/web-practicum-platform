import Editor from "@monaco-editor/react"
import { useState } from "react"

interface Props {
  language: string
  files: Record<string, string>
  activeFile: string
  editorPath: string
  onChangeFile: (fileName: string) => void
  onCodeChange: (value: string) => void
  onAddFile: () => void
  onRenameFile: (oldName: string, newName: string) => void
  onDeleteFile: (fileName: string) => void
}

export default function CodeEditorPanel({
  language,
  files,
  activeFile,
  editorPath,
  onChangeFile,
  onCodeChange,
  onAddFile,
  onRenameFile,
  onDeleteFile
}: Props) {

  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [tempName, setTempName] = useState("")

  return (
    <div className="border border-gray-400 rounded-lg overflow-hidden">

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-gray-200 border-b px-4 py-2">

        {/* Left: File Tabs */}
        <div className="flex items-center gap-4 overflow-x-auto">
          {Object.keys(files).map(fileName => (
            <div
              key={fileName}
              className={`flex items-center text-sm font-medium ${
                activeFile === fileName
                  ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                  : "text-gray-600"
              }`}
            >

              {editingFile === fileName ? (
                <input
                  autoFocus
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={() => {
                    if (tempName.trim()) {
                      onRenameFile(fileName, tempName.trim())
                    }
                    setEditingFile(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (tempName.trim()) {
                        onRenameFile(fileName, tempName.trim())
                      }
                      setEditingFile(null)
                    }
                    if (e.key === "Escape") {
                      setEditingFile(null)
                    }
                  }}
                  className="border px-2 py-1 text-sm rounded"
                />
              ) : (
                <span
                  onClick={() => onChangeFile(fileName)}
                  onDoubleClick={() => {
                    setEditingFile(fileName)
                    setTempName(fileName)
                  }}
                  className="cursor-pointer"
                >
                  {fileName}
                </span>
              )}

              {/* DELETE BUTTON */}
              <button
                onClick={() => onDeleteFile(fileName)}
                className="ml-2 text-xs text-red-600 hover:text-red-800"
              >
                ✕
              </button>

            </div>
          ))}

          <button
            onClick={onAddFile}
            className="text-green-600 text-sm font-semibold hover:text-green-800"
          >
            + File
          </button>

        </div>

      </div>

      {/* Code Editor */}
      <Editor
        key={editorPath}
        height="400px"
        language={language}
        path={editorPath}
        value={files[activeFile] ?? ""}
        theme="vs-light"
        onChange={(value) => {
          if (value !== undefined) {
            onCodeChange(value)
          }
        }}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
        }}
      />

    </div>
  )
}
