import Editor from "@monaco-editor/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Play, RotateCcw, Square, Terminal } from "lucide-react"
import { ExecutionClient } from "../../../services/execution/executionClient"
import CodeEditorPanel from "../../../components/code-editor/CodeEditorPanel"

interface Props {
  editorMode: "mini_ide" | "simple"
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
  editorMode,
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
    const confirm = window.confirm(
      `Apakah Anda yakin ingin menggunakan template default ${language === "python" ? "Python" : "Java"}? Kode saat ini akan ditimpa.`
    )
    if (confirm) {
      onChange(getDefaultTemplateCode(language))
    }
  }

  const handleSimpleAddFile = () => {
    const filename = window.prompt("Masukkan nama file baru:")
    if (!filename) return
    const trimmed = filename.trim()
    if (!trimmed) return

    // Validate extension based on language
    const ext = language === "python" ? ".py" : ".java"
    if (!trimmed.endsWith(ext)) {
      alert(`Bahasa ${language === "python" ? "Python" : "Java"} hanya mendukung file berekstensi ${ext}`)
      return
    }

    if (filesRecord[trimmed] !== undefined) {
      alert("File dengan nama tersebut sudah ada!")
      return
    }

    const nextFiles = { ...filesRecord, [trimmed]: "" }
    onChange(JSON.stringify(nextFiles))
    setActiveFile(trimmed)
  }

  const handleSimpleRenameFile = () => {
    const newName = window.prompt(`Rename file ${activeFile} menjadi:`, activeFile)
    if (!newName) return
    const trimmed = newName.trim()
    if (!trimmed || trimmed === activeFile) return

    // Validate extension based on language
    const ext = language === "python" ? ".py" : ".java"
    if (!trimmed.endsWith(ext)) {
      alert(`Bahasa ${language === "python" ? "Python" : "Java"} hanya mendukung file berekstensi ${ext}`)
      return
    }

    if (filesRecord[trimmed] !== undefined) {
      alert("File dengan nama tersebut sudah ada!")
      return
    }

    const nextFiles = { ...filesRecord }
    const code = nextFiles[activeFile]
    delete nextFiles[activeFile]
    nextFiles[trimmed] = code

    onChange(JSON.stringify(nextFiles))
    setActiveFile(trimmed)
  }

  const handleSimpleDeleteFile = () => {
    if (Object.keys(filesRecord).length <= 1) return
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus file ${activeFile}?`)
    if (!confirm) return

    const nextFiles = { ...filesRecord }
    delete nextFiles[activeFile]

    const remaining = Object.keys(nextFiles)
    onChange(JSON.stringify(nextFiles))
    setActiveFile(remaining[0])
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white font-sans">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
        <span>Template Editor ({label})</span>
        <span className="font-mono text-gray-400">{activeFile}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] h-[340px] min-h-[300px]">
        {/* Editor Area */}
        <div className="border-r border-gray-200 h-full overflow-hidden relative">
          {editorMode === "mini_ide" ? (
            <div className="h-full min-h-0">
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
          ) : (
            <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
              {/* File bar */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#2d2d2d] bg-[#252526] px-3 py-1.5 gap-2 select-none">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
                  <span>File:</span>
                  <select
                    value={activeFile}
                    onChange={(e) => setActiveFile(e.target.value)}
                    className="bg-[#2d2d2d] text-white text-xs rounded border border-[#3c3c3c] px-2 py-0.5 outline-none font-mono"
                  >
                    {Object.keys(filesRecord).map((filename) => (
                      <option key={filename} value={filename}>{filename}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSimpleAddFile}
                    className="rounded bg-[#2d2d2d] border border-[#3c3c3c] hover:bg-[#3c3c3c] hover:text-white text-gray-300 px-2 py-0.5 text-[11px] font-semibold"
                  >
                    + Tambah File
                  </button>
                  <button
                    type="button"
                    onClick={handleSimpleRenameFile}
                    className="rounded bg-[#2d2d2d] border border-[#3c3c3c] hover:bg-[#3c3c3c] hover:text-white text-gray-300 px-2 py-0.5 text-[11px] font-semibold"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={handleSimpleDeleteFile}
                    disabled={Object.keys(filesRecord).length <= 1}
                    className="rounded bg-[#2d2d2d] border border-[#3c3c3c] hover:bg-[#3c3c3c] hover:text-white text-gray-300 px-2 py-0.5 text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              {/* Simple Editor */}
              <div className="flex-1 min-h-0 relative">
                <Editor
                  height="100%"
                  language={language}
                  path={`${label}-${language}-${activeFile}`}
                  value={filesRecord[activeFile] ?? ""}
                  theme="vs-dark"
                  onChange={(val) => {
                    const nextFiles = { ...filesRecord, [activeFile]: val || "" }
                    onChange(JSON.stringify(nextFiles))
                  }}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 8, bottom: 8 },
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Console / Terminal Output */}
        <div className="flex flex-col h-full bg-[#0c0c0c] text-gray-100 font-mono text-xs overflow-hidden">
          {/* Header Controls */}
          <div className="flex shrink-0 items-center justify-between border-b border-[#2b2b2b] bg-[#1a1a1a] px-3 py-1.5 select-none">
            <span className="flex items-center gap-1.5 font-bold text-gray-400">
              <Terminal size={14} />
              Konsol Output
            </span>
            <div className="flex items-center gap-1.5">
              {runTime && !isRunning && <span className="text-[10px] text-gray-500">{runTime}</span>}
              {isRunning ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-700"
                >
                  <Square size={10} fill="currentColor" />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRun}
                  className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 font-semibold text-white hover:bg-blue-700"
                >
                  <Play size={10} fill="currentColor" />
                  Run
                </button>
              )}
              <button
                type="button"
                onClick={() => setTerminalOutput("")}
                className="flex items-center gap-1 rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 font-semibold text-gray-300 hover:bg-[#3c3c3c] hover:text-white"
                title="Bersihkan output konsol"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Terminal Screen */}
          <div
            ref={terminalScrollRef}
            className="flex-1 overflow-y-auto p-3 whitespace-pre-wrap break-all leading-relaxed"
          >
            {terminalOutput || <span className="text-gray-600">Klik Run untuk menjalankan dan melihat output program...</span>}
          </div>

          {/* Interactive Stdin */}
          {isRunning && (
            <div className="flex border-t border-[#2b2b2b] bg-[#1a1a1a] p-1.5 select-none">
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
                className="flex-1 border-0 bg-transparent px-2 py-1 text-xs text-gray-100 outline-none placeholder:text-gray-600"
              />
              <button
                type="button"
                onClick={handleSendStdin}
                className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Send
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Reset Tool */}
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
