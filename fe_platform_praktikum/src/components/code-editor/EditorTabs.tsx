import { X } from "lucide-react"

interface Props {
  files: Record<string, string>
  activeFile: string
  onSelectFile: (path: string) => void
  onDeleteFile: (path: string) => void
}

function getBaseName(path: string): string {
  return path.split("/").pop() || path
}

export default function EditorTabs({
  files,
  activeFile,
  onSelectFile,
  onDeleteFile,
}: Props) {
  const filePaths = Object.keys(files)

  return (
    <div className="flex h-10 min-w-0 overflow-x-auto border-b border-[#2b2b2b] bg-[#252526]">
      {filePaths.map((filePath) => {
        const isActive = activeFile === filePath

        return (
          <button
            key={filePath}
            type="button"
            onClick={() => onSelectFile(filePath)}
            className={`group flex h-10 min-w-32 max-w-56 shrink-0 items-center gap-2 border-r border-[#2b2b2b] px-3 text-left text-sm ${
              isActive
                ? "border-t-2 border-t-[#007acc] bg-[#1e1e1e] text-white"
                : "bg-[#2d2d2d] text-[#bbbbbb] hover:bg-[#333333] hover:text-white"
            }`}
            title={filePath}
          >
            <span className="min-w-0 flex-1 truncate">
              {getBaseName(filePath)}
            </span>
            <span
              role="button"
              tabIndex={-1}
              onClick={(event) => {
                event.stopPropagation()
                onDeleteFile(filePath)
              }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#858585] hover:bg-[#3c3c3c] hover:text-white"
              aria-label={`Close ${filePath}`}
              title="Delete file"
            >
              <X size={14} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

