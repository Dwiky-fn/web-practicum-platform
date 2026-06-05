import { Play, RotateCcw, Save, Square } from "lucide-react"
import { useEffect, useRef } from "react"

interface Props {
  output: string
  isRunning?: boolean
  isSaving?: boolean
  saveStatus?: string
  saveError?: string
  runTime?: string
  currentInput?: string
  onCurrentInputChange?: (value: string) => void
  onSendInput?: () => void
  onReset?: () => void
  onRun?: () => void
  onSave?: () => void | Promise<void>
  onStop?: () => void
}

export default function OutputPanel({
  output,
  isRunning = false,
  isSaving = false,
  saveStatus,
  saveError,
  runTime,
  currentInput,
  onCurrentInputChange,
  onSendInput,
  onReset,
  onRun,
  onSave,
  onStop,
}: Props) {
  const canTypeInput = !!onCurrentInputChange
  const terminalInputRef = useRef<HTMLInputElement | null>(null)
  const consoleRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isRunning) return

    terminalInputRef.current?.focus()
  }, [isRunning])

  useEffect(() => {
    consoleRef.current?.scrollTo({
      top: consoleRef.current.scrollHeight,
    })
  }, [output])

  const handleTerminalSubmit = () => {
    if (!currentInput?.trim()) return

    onSendInput?.()
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Console
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Saat program meminta input, ketik langsung di terminal lalu tekan Enter. Batas waktu eksekusi 10 detik.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {runTime && !isRunning && (
            <span className="text-xs font-medium text-gray-500">
              {runTime}
            </span>
          )}

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              disabled={isRunning}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Reset
            </button>
          )}

          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={isRunning || isSaving}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
              <Save size={16} aria-hidden="true" />
              {isSaving ? "Saving" : "Save"}
            </button>
          )}

          {onRun && (
            <button
              type="button"
              onClick={onRun}
              disabled={isRunning}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <Play size={16} fill="currentColor" aria-hidden="true" />
              {isRunning ? "Running" : "Run"}
            </button>
          )}

          {onStop && isRunning && (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              <Square size={16} fill="currentColor" aria-hidden="true" />
              Stop
            </button>
          )}

        </div>
      </div>

      {(saveStatus || saveError) && (
        <div
          className={`border-b px-4 py-2 text-xs font-medium ${
            saveError
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-emerald-100 bg-emerald-50 text-emerald-700"
          }`}
        >
          {saveError || saveStatus}
        </div>
      )}

      <div>
        <div className="flex h-10 items-center justify-between border-b border-gray-200 px-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Terminal
          </span>
          <span className="text-xs text-gray-400">
            stdout / stderr / stdin
          </span>
        </div>

        <div
          ref={consoleRef}
          onClick={() => terminalInputRef.current?.focus()}
          className="min-h-52 max-h-96 cursor-text overflow-auto bg-gray-950 p-4 font-mono text-sm leading-6"
        >
          {!output && !isRunning && (
            <span className="text-gray-500">Belum ada output...</span>
          )}

          {!output && isRunning && !canTypeInput && (
            <span className="text-blue-300">Menunggu output realtime...</span>
          )}

          <div className="whitespace-pre-wrap wrap-break-word text-gray-100">
            {output}
            {canTypeInput && isRunning && (
              <input
                ref={terminalInputRef}
                value={currentInput || ""}
                onChange={(event) => onCurrentInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return

                  event.preventDefault()
                  handleTerminalSubmit()
                }}
                spellCheck={false}
                autoComplete="off"
                className="inline-block min-w-32 max-w-full border-0 bg-transparent p-0 font-mono text-sm leading-6 text-gray-100 caret-emerald-300 outline-none placeholder:text-gray-600"
                style={{
                  width: `${Math.max((currentInput || "").length + 1, 8)}ch`,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
