import { ChevronDown, ChevronUp, Play, RotateCcw } from "lucide-react"
import { useState } from "react"

interface Props {
  output: string
  isRunning?: boolean
  runTime?: string
  currentInput?: string
  onCurrentInputChange?: (value: string) => void
  onReset?: () => void
  onRun?: () => void
}

export default function OutputPanel({
  output,
  isRunning = false,
  runTime,
  currentInput,
  onCurrentInputChange,
  onReset,
  onRun,
}: Props) {
  const canTypeInput = !!onCurrentInputChange
  const [isInputOpen, setIsInputOpen] = useState(() => !!currentInput)

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Console
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Jalankan langsung. Stdin hanya dipakai kalau program membaca input.
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

          {canTypeInput && (
            <button
              type="button"
              onClick={() => setIsInputOpen(prev => !prev)}
              disabled={isRunning}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            >
              {isInputOpen ? (
                <ChevronUp size={16} aria-hidden="true" />
              ) : (
                <ChevronDown size={16} aria-hidden="true" />
              )}
              Stdin
            </button>
          )}
        </div>
      </div>

      <div className={`grid gap-0 ${canTypeInput && isInputOpen ? "md:grid-cols-2" : ""}`}>
        {canTypeInput && isInputOpen && (
          <div className="border-b border-gray-200 md:border-b-0 md:border-r">
            <div className="flex h-10 items-center justify-between border-b border-gray-200 px-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Input opsional
              </label>
              <span className="text-xs text-gray-400">
                stdin
              </span>
            </div>

            <textarea
              value={currentInput || ""}
              onChange={(event) => onCurrentInputChange(event.target.value)}
              disabled={isRunning}
              rows={8}
              placeholder="Kosongkan kalau program tidak membutuhkan input."
              className="block min-h-52 w-full resize-y border-0 bg-white p-4 font-mono text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        )}

        <div>
          <div className="flex h-10 items-center justify-between border-b border-gray-200 px-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              Output
            </span>
            <span className="text-xs text-gray-400">
              stdout / stderr
            </span>
          </div>

          <div className="min-h-52 max-h-96 overflow-auto bg-gray-950 p-4 font-mono text-sm leading-6">
            {isRunning ? (
              <span className="text-blue-300">Sedang menjalankan kode...</span>
            ) : output ? (
              <pre className="m-0 whitespace-pre-wrap break-words text-gray-100">{output}</pre>
            ) : (
              <span className="text-gray-500">Belum ada output...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
