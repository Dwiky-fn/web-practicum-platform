import { toast } from "../../components/toast/toastStore"

interface InternalCopyRecord {
  text: string
  timestamp: number
}

let lastInternalCopy: InternalCopyRecord | null = null

export function registerInternalEditorCopy(text: string) {
  if (!text) return
  lastInternalCopy = {
    text: text.trim(),
    timestamp: Date.now(),
  }
}

export function isInternalEditorCopy(text: string): boolean {
  if (!lastInternalCopy) return false
  const trimmed = text.trim()
  if (!trimmed) return false

  // Check if text matches last internal copy and copy happened within last 30 minutes
  const isMatch = lastInternalCopy.text === trimmed
  const isFresh = Date.now() - lastInternalCopy.timestamp < 1000 * 60 * 30
  return isMatch && isFresh
}

export function notifyExternalPasteBlocked() {
  toast.warning("Penempelan teks dari luar kode editor dibatasi pada halaman praktikum ini.")
}
