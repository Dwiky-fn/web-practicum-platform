import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

interface SaveStatusIndicatorProps {
  status: SaveStatus
  lastSavedAt?: Date | null
  errorMessage?: string
  onRetry?: () => void
  className?: string
}

export default function SaveStatusIndicator({
  status,
  lastSavedAt,
  errorMessage,
  onRetry,
  className = "",
}: SaveStatusIndicatorProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all shadow-xs ${className} ${
        status === "saving"
          ? "bg-blue-50 text-blue-700 border border-blue-200"
          : status === "saved" || status === "idle"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 shrink-0" />
          <span>Menyimpan...</span>
        </>
      )}

      {(status === "saved" || status === "idle") && (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Tersimpan</span>
          {lastSavedAt && (
            <span className="text-[10px] font-normal text-emerald-600/80">
              ({lastSavedAt.toLocaleTimeString("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).replace(/\./g, ":")} WIB)
            </span>
          )}
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
          <span>Gagal menyimpan</span>
          {errorMessage && <span className="text-[10px] text-red-500 font-normal">({errorMessage})</span>}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 underline hover:text-red-800 font-bold cursor-pointer"
            >
              Coba lagi
            </button>
          )}
        </>
      )}
    </div>
  )
}
