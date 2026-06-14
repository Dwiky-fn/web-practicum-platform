import Editor from "@monaco-editor/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Play, RotateCcw, Square, Terminal } from "lucide-react"
import { ExecutionClient } from "../../../services/execution/executionClient"

interface Props {
  language: "java" | "python"
  value: string
  onChange: (value: string) => void
  label: string
}

function getDefaultFileName(language: string): string {
  return language === "python" ? "main.py" : "Main.java"
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
  const defaultFileName = getDefaultFileName(language)
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
    const files = [
      {
        path: defaultFileName,
        content: value,
      },
    ]

    client.run({
      language,
      code: value,
      files,
      entryFile: defaultFileName,
      mainClass: language === "java" ? "Main" : undefined,
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

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        <span>Template Editor ({label})</span>
        <span className="font-mono text-gray-400">{defaultFileName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] h-[340px] min-h-[300px]">
        {/* Editor Area */}
        <div className="border-r border-gray-200 h-full overflow-hidden relative">
          <Editor
            height="100%"
            language={language}
            path={`${label}-${language}`}
            value={value}
            theme="vs-dark"
            onChange={(val) => onChange(val || "")}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>

        {/* Console / Terminal Output */}
        <div className="flex flex-col h-full bg-[#0c0c0c] text-gray-100 font-mono text-xs overflow-hidden">
          {/* Header Controls */}
          <div className="flex shrink-0 items-center justify-between border-b border-[#2b2b2b] bg-[#1a1a1a] px-3 py-1.5">
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
            <div className="flex border-t border-[#2b2b2b] bg-[#1a1a1a] p-1.5">
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
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2.5">
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
