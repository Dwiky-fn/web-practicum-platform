export function getDefaultFileName(language?: string): string {
  switch (language) {
    case "java": return "Main.java"
    case "javascript": return "index.js"
    case "typescript": return "index.ts"
    case "python": return "main.py"
    default: return `main.${language || "txt"}`
  }
}

/**
 * Parses a template code string (which may be raw code string OR JSON.stringified files object)
 * into a Record<string, string> map of filename -> content.
 */
export function parseTemplateFiles(templateCode?: string | null, language?: string): Record<string, string> {
  const defaultFileName = getDefaultFileName(language)
  if (!templateCode || !templateCode.trim()) {
    return { [defaultFileName]: "" }
  }

  const trimmed = templateCode.trim()
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const entries = Object.entries(parsed)
        if (entries.length > 0) {
          const result: Record<string, string> = {}
          for (const [key, val] of entries) {
            result[key] = typeof val === "string" ? val : String(val ?? "")
          }
          return result
        }
      }
    } catch {
      // Not JSON object
    }
  }

  return { [defaultFileName]: templateCode }
}

/**
 * Ensures code content of a file is un-stringified if it was accidentally saved as JSON object string
 */
export function cleanFileCode(rawCode?: string | null): string {
  if (!rawCode) return ""
  const trimmed = rawCode.trim()
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const values = Object.values(parsed)
        if (values.length === 1 && typeof values[0] === "string") {
          return values[0]
        }
        if (values.length > 1) {
          return Object.entries(parsed)
            .map(([fname, fcontent]) => `// ${fname}\n${fcontent}`)
            .join("\n\n")
        }
      }
    } catch {
      // Keep as raw code
    }
  }
  return rawCode
}

/**
 * Formats template code for simple text/code block display.
 */
export function formatTemplateCodeForDisplay(templateCode?: string | null): string {
  if (!templateCode) return ""
  const parsed = parseTemplateFiles(templateCode)
  const entries = Object.entries(parsed)
  if (entries.length === 1) {
    return entries[0][1]
  }
  return entries
    .map(([fname, fcontent]) => `// ${fname}\n${fcontent}`)
    .join("\n\n")
}

/**
 * Parses initial student step files or falls back to templateCode
 */
export function parseFilesOrTemplate(
  savedFiles?: Record<string, string> | null,
  templateCode?: string | null,
  language?: string,
  index?: number,
  isExperiment?: boolean
): Record<string, string> {
  if (savedFiles && Object.keys(savedFiles).length > 0) {
    const cleaned: Record<string, string> = {}
    for (const [fileName, fileContent] of Object.entries(savedFiles)) {
      cleaned[fileName] = cleanFileCode(fileContent)
    }
    return cleaned
  }

  if (templateCode) {
    try {
      if (templateCode.trim().startsWith("{")) {
        const parsed = JSON.parse(templateCode)
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          return parsed as Record<string, string>
        }
      }
    } catch { }
  }

  const ext = language === "python" ? "py" : (language === "java" ? "java" : (language || "txt"))
  const defaultFileName = index !== undefined && isExperiment !== undefined
    ? (isExperiment ? `percobaan${index + 1}.${ext}` : `latihan${index + 1}.${ext}`)
    : (language === "java" ? "Main.java" : `main.${ext}`)

  return { [defaultFileName]: templateCode || "" }
}
