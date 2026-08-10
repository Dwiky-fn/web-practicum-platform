import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Play, RotateCcw, Square, Terminal, AlertTriangle } from "lucide-react"
import { ExecutionClient } from "../../../services/execution/executionClient"
import CodeEditorPanel from "../../../components/code-editor/CodeEditorPanel"

interface Props {
  language: "java" | "python"
  value: string
  onChange: (value: string) => void
  label: string
}

function parseFiles(templateCode: string, language: string): Record<string, string> {
  const defaultFileName = language === "python" ? "main.py" : "Main.java"
  if (!templateCode) {
    return { [defaultFileName]: "" }
  }
  try {
    if (templateCode.trim().startsWith("{")) {
      const parsed = JSON.parse(templateCode)
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, string>
      }
    }
  } catch (e) {
    // Not valid JSON
  }
  return { [defaultFileName]: templateCode }
}


function getDefaultTemplateCode(language: string): string {
  if (language === "python") {
    return 'print("Hello, Python!")'
  }
  return `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}`
}

function formatRunTime(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(3)} detik`
}

function normalizeStdin(value: string): string {
  if (!value) return ""
  return value.endsWith("\n") ? value : `${value}\n`
}

export default function LecturerTemplateWorkspace({
  language,
  value,
  onChange,
  label,
}: Props) {

  const filesRecord = useMemo(() => {
    return parseFiles(value, language)
  }, [value, language])

  const [activeFile, setActiveFile] = useState(() => {
    const parsed = parseFiles(value, language)
    return Object.keys(parsed)[0] || (language === "python" ? "main.py" : "Main.java")
  })

  const [editorVersion, setEditorVersion] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [stdin, setStdin] = useState("")
  const [terminalOutput, setTerminalOutput] = useState("")
  const [runTime, setRunTime] = useState("")
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false)
  // ── Confirm dialog state ──
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDeleteFile, setConfirmDeleteFile] = useState(false)
  
  const executionClientRef = useRef<ExecutionClient | null>(null)
  const terminalScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return () => {
      executionClientRef.current?.close()
    }
  }, [])

  useEffect(() => {
    terminalScrollRef.current?.scrollTo({ top: terminalScrollRef.current.scrollHeight })
  }, [terminalOutput])

  useEffect(() => {
    const parsed = parseFiles(value, language)
    const keys = Object.keys(parsed)
    if (!keys.includes(activeFile)) {
      setActiveFile(keys[0] || (language === "python" ? "main.py" : "Main.java"))
    }
  }, [language, value, activeFile])

  const appendOutput = useCallback((chunk: string) => {
    setTerminalOutput((prev) => prev + chunk)
  }, [])

  const handleRun = () => {
    if (isRunning) return

    const runStartedAt = performance.now()
    setIsRunning(true)
    setTerminalOutput("")
    setRunTime("")

    if (language === "java") {
      appendOutput("Compiling...\n")
    } else {
      appendOutput("Running...\n")
    }

    const finishRun = () => {
      setRunTime(formatRunTime(performance.now() - runStartedAt))
      setIsRunning(false)
    }

    const client = new ExecutionClient({
      onMessage: (message) => {
        if (message.type === "started" || message.type === "start") {
          if (language === "java") {
            appendOutput("Running...\n")
          }
          return
        }
        if (message.type === "output" || message.type === "stdout") {
          appendOutput(message.data)
          return
        }
        if (message.type === "stderr") {
          appendOutput(message.data)
          return
        }
        if (message.type === "error" || message.type === "timeout") {
          appendOutput(`\n[Error] ${message.type === "error" ? message.message || message.data || "" : message.data}\n`)
          finishRun()
          return
        }
        if (message.type === "exit") {
          appendOutput(`\nProcess finished with exit code ${message.code ?? 0}\n`)
          finishRun()
          return
        }
        if (message.type === "stopped") {
          appendOutput(`\nProcess stopped: ${message.data}\n`)
          finishRun()
          return
        }
        if (message.type === "runner_closed") {
          finishRun()
        }
      },
      onError: (errMessage) => {
        appendOutput(`\n[Connection Error] ${errMessage}\n`)
        finishRun()
      },
      onClose: () => {
        setIsRunning(false)
      },
    })

    executionClientRef.current = client
    
    // Prepare files list conforming to backend files format
    const files = Object.entries(filesRecord).map(([path, content]) => ({
      path,
      content,
    }))

    const entryFile = language === "python"
      ? (filesRecord["main.py"] !== undefined ? "main.py" : Object.keys(filesRecord)[0] || "main.py")
      : (filesRecord["Main.java"] !== undefined ? "Main.java" : Object.keys(filesRecord)[0] || "Main.java")

    const mainClass = language === "java" ? "Main" : undefined

    client.run({
      language,
      code: filesRecord[entryFile] || "",
      files,
      entryFile,
      mainClass,
    })
  }

  const handleStop = () => {
    executionClientRef.current?.stop()
    setIsRunning(false)
  }

  const handleSendStdin = () => {
    const input = normalizeStdin(stdin)
    if (!input) return
    executionClientRef.current?.sendInput(input)
    appendOutput(input)
    setStdin("")
  }

  const handleResetTemplate = () => {
    setConfirmReset(true)
  }

  // ── Shared mini confirm modal ──
  function MiniConfirmModal({
    open,
    title,
    description,
    onConfirm,
    onCancel,
    confirmLabel = "Ya, Lanjutkan",
  }: {
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    onCancel: () => void
    confirmLabel?: string
  }) {
    if (!open) return null
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      >
        <div
          className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-80 mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white font-sans shadow-sm">
      <MiniConfirmModal
        open={confirmReset}
        title="Reset ke Template Default"
        description={`Kode saat ini akan ditimpa oleh template default ${language === "python" ? "Python" : "Java"}. Perubahan yang belum disimpan akan hilang.`}
        confirmLabel="Reset Template"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          onChange(getDefaultTemplateCode(language))
          setConfirmReset(false)
        }}
      />
      <MiniConfirmModal
        open={confirmDeleteFile}
        title={`Hapus File "${activeFile}"`}
        description="File ini akan dihapus dari template. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus File"
        onCancel={() => setConfirmDeleteFile(false)}
        onConfirm={() => {
          const nextFiles = { ...filesRecord }
          delete nextFiles[activeFile]
          const remaining = Object.keys(nextFiles)
          onChange(JSON.stringify(nextFiles))
          setActiveFile(remaining[0])
          setConfirmDeleteFile(false)
        }}
      />
      <div className="h-[720px] min-h-[650px] overflow-hidden bg-[#1e1e1e]">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-[#2b2b2b] bg-[#252526] px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Template Editor ({label})</p>
              <p className="truncate text-xs text-[#858585]">{activeFile}</p>
            </div>
            <div className="ml-3 flex items-center gap-2">
              {runTime && !isRunning && <span className="text-xs text-[#858585]">{runTime}</span>}
              {isRunning ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <Square size={16} fill="currentColor" />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRun}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Play size={16} fill="currentColor" />
                  Run
                </button>
              )}
              <button
                type="button"
                onClick={() => setTerminalOutput("")}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#3c3c3c] bg-[#2d2d2d] px-3 text-sm font-semibold text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
                title="Bersihkan output konsol"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <CodeEditorPanel
              key={`${editorVersion}`}
              language={language}
              files={filesRecord}
              activeFile={activeFile}
              editorPath={`${label}/${activeFile}`}
              onChangeFile={setActiveFile}
              onCodeChange={(newVal) => {
                const nextFiles = { ...filesRecord, [activeFile]: newVal }
                onChange(JSON.stringify(nextFiles))
              }}
              onFilesChange={(nextFiles, nextActiveFile) => {
                const ext = language === "python" ? ".py" : ".java"
                const invalidFile = Object.keys(nextFiles).find((filename) => !filename.endsWith(ext))
                if (invalidFile) {
                  alert(`Bahasa ${language === "python" ? "Python" : "Java"} hanya mendukung file berekstensi ${ext}`)
                  setEditorVersion(v => v + 1)
                  return
                }

                onChange(JSON.stringify(nextFiles))
                if (nextActiveFile) {
                  setActiveFile(nextActiveFile)
                }
              }}
              getNewFileName={(files) => {
                const ext = language === "python" ? "py" : "java"
                let i = 1
                while (files[`File${i}.${ext}`] !== undefined) {
                  i++
                }
                return `File${i}.${ext}`
              }}
            />
          </div>

          <div
            className="min-h-9 shrink-0 overflow-hidden border-t border-[#2b2b2b] bg-[#1e1e1e]"
            style={{ height: isTerminalCollapsed ? "40px" : "220px" }}
          >
            <div className="flex h-10 items-center justify-between border-b border-[#2b2b2b] bg-[#252526] px-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#cccccc]">
                <Terminal size={14} />
                Terminal
              </span>
              <button
                type="button"
                onClick={() => setIsTerminalCollapsed(prev => !prev)}
                className="h-7 rounded px-2.5 text-xs font-semibold text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
              >
                {isTerminalCollapsed ? "Expand Terminal" : "Collapse Terminal"}
              </button>
            </div>

            {!isTerminalCollapsed && (
              <div className="flex h-[calc(100%-40px)] min-h-0 flex-col overflow-hidden bg-[#0c0c0c] text-sm text-gray-100">
                <div
                  ref={terminalScrollRef}
                  className="flex-1 overflow-y-auto p-4 font-mono whitespace-pre-wrap break-all leading-6"
                >
                  {terminalOutput || <span className="text-gray-500">Klik Run untuk menjalankan dan melihat output program...</span>}
                </div>

                {isRunning && (
                  <div className="flex border-t border-[#2b2b2b] bg-[#1a1a1a] p-2">
                    <input
                      type="text"
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleSendStdin()
                        }
                      }}
                      placeholder="Kirim stdin ke program..."
                      className="flex-1 border-0 bg-transparent px-2 py-1 font-mono text-sm text-gray-100 outline-none placeholder:text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={handleSendStdin}
                      className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2.5 select-none">
        <span className="text-[10px] text-gray-400">
          Ekstensi file: <span className="font-mono bg-gray-200 text-gray-600 px-1 py-0.5 rounded">.{language === "python" ? "py" : "java"}</span>
        </span>
        <button
          type="button"
          onClick={handleResetTemplate}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          <RotateCcw size={12} />
          Gunakan Template Default {language === "python" ? "Python" : "Java"}
        </button>
      </div>
    </div>
  )
}
