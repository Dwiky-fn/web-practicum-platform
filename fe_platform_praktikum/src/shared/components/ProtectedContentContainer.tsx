import React, { useState, useEffect, useCallback, type ReactNode } from "react"
import { toast } from "../../components/toast/toastStore"
import { useCurrentUser } from "../../services/user/useCurrentUser"
import { EyeOff } from "lucide-react"

export interface ProtectedContentContainerProps {
  children: ReactNode
  enabled?: boolean
  showBlurOnFocusLoss?: boolean
  customMessage?: string
  className?: string
}

export default function ProtectedContentContainer({
  children,
  enabled = true,
  showBlurOnFocusLoss = true,
  customMessage = "Tindakan penyalinan atau penempelan teks dibatasi pada area ini.",
  className = "",
}: ProtectedContentContainerProps) {
  const { user } = useCurrentUser()
  const isStudent = !user || user.role === "MAHASISWA"
  const isProtectionActive = enabled && isStudent

  const [isWindowBlurred, setIsWindowBlurred] = useState(false)

  const notifyRestricted = useCallback(() => {
    toast.warning(customMessage)
  }, [customMessage])

  const handleCopy = (e: React.ClipboardEvent) => {
    if (!isProtectionActive) return
    e.preventDefault()
    notifyRestricted()
  }

  const handleCut = (e: React.ClipboardEvent) => {
    if (!isProtectionActive) return
    e.preventDefault()
    notifyRestricted()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isProtectionActive) return
    e.preventDefault()
    notifyRestricted()
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isProtectionActive) return
    e.preventDefault()
    notifyRestricted()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isProtectionActive) return
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
    const modifier = isMac ? e.metaKey : e.ctrlKey
    const key = e.key.toLowerCase()

    const isClipboardShortcut = modifier && ["c", "x", "v", "a", "p"].includes(key)
    const isDevTools = (modifier && e.shiftKey && (key === "i" || key === "c" || key === "j" || key === "s")) || key === "f12"
    const isPrintScreen = key === "printscreen"

    if (isClipboardShortcut || isDevTools || isPrintScreen) {
      e.preventDefault()
      e.stopPropagation()
      notifyRestricted()
    }
  }

  useEffect(() => {
    if (!isProtectionActive || !showBlurOnFocusLoss) return

    const handleBlur = () => setIsWindowBlurred(true)
    const handleFocus = () => setIsWindowBlurred(false)

    window.addEventListener("blur", handleBlur)
    window.addEventListener("focus", handleFocus)

    return () => {
      window.removeEventListener("blur", handleBlur)
      window.removeEventListener("focus", handleFocus)
    }
  }, [isProtectionActive, showBlurOnFocusLoss])

  if (!isProtectionActive) {
    return <>{children}</>
  }

  return (
    <div
      onCopy={handleCopy}
      onCut={handleCut}
      onPaste={handlePaste}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onDragStart={(e) => e.preventDefault()}
      className={`relative select-none ${className}`}
      style={{
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
      }}
    >
      <div className={isWindowBlurred && showBlurOnFocusLoss ? "blur-md pointer-events-none transition-all duration-200" : "transition-all duration-200"}>
        {children}
      </div>

      {isWindowBlurred && showBlurOnFocusLoss && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-lg bg-gray-900/80 p-6 text-center text-white backdrop-blur-sm transition-opacity">
          <EyeOff className="mb-2 h-8 w-8 text-amber-400 animate-pulse" />
          <h4 className="text-sm font-bold">Layar Tidak Aktif</h4>
          <p className="mt-1 text-xs text-gray-300 max-w-xs">
            Materi dan instruksi praktikum dilindungi dari screenshot. Kembali ke halaman ini untuk melanjutkan.
          </p>
        </div>
      )}
    </div>
  )
}
