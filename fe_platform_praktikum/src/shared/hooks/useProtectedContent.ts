import { useEffect, useCallback } from "react"
import { toast } from "../../components/toast/toastStore"

export interface UseProtectedContentOptions {
  enabled?: boolean
  showBlurOnFocusLoss?: boolean
  customMessage?: string
}

export function useProtectedContent(options: UseProtectedContentOptions = {}) {
  const {
    enabled = true,
    customMessage = "Tindakan penyalinan atau penempelan teks dibatasi pada area ini.",
  } = options

  const notifyRestricted = useCallback(() => {
    toast.warning(customMessage)
  }, [customMessage])

  const handleCopyCutPaste = useCallback(
    (e: Event) => {
      if (!enabled) return
      e.preventDefault()
      e.stopPropagation()
      notifyRestricted()
    },
    [enabled, notifyRestricted]
  )

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return
      e.preventDefault()
      e.stopPropagation()
      notifyRestricted()
    },
    [enabled, notifyRestricted]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey
      const key = e.key.toLowerCase()

      // Block Ctrl/Cmd + C, X, V, A, P, S
      const isClipboardShortcut = modifier && ["c", "x", "v", "a", "p"].includes(key)
      const isDevToolsShortcut = (modifier && e.shiftKey && (key === "i" || key === "c" || key === "j" || key === "s")) || key === "f12"
      const isPrintScreen = key === "printscreen"

      if (isClipboardShortcut || isDevToolsShortcut || isPrintScreen) {
        e.preventDefault()
        e.stopPropagation()
        notifyRestricted()
      }
    },
    [enabled, notifyRestricted]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener("keydown", handleKeyDown, true)

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [enabled, handleKeyDown])

  return {
    notifyRestricted,
    handleCopyCutPaste,
    handleContextMenu,
    handleKeyDown,
  }
}
