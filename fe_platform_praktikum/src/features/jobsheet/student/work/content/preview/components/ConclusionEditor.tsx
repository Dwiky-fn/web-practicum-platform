import { useEffect, useMemo, useState } from "react"
import type { Jobsheet } from "../../../../../../../entities/jobsheet/types" 
import type { JobsheetSubmission } from "../../../../../../../entities/jobsheetSubmission/types"
import type { JSONContent } from "@tiptap/react"

import RichTextEditor from "../../../../../../../shared/editor/RichTextEditor" 

interface Props {
  jobsheet: Jobsheet
  submission: JobsheetSubmission
  onChange?: (data: {
    content: JSONContent
    wordCount: number
  }) => void
}

function countWordsFromJSON(content: JSONContent): number {
  let text = ""

  function traverse(node: JSONContent) {
    if (!node) return

    if (node.type === "text") {
      text += " " + (node.text ?? "")
    }

    if (node.content) {
      node.content.forEach(traverse)
    }
  }

  traverse(content)

  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function ConclusionEditor({
  jobsheet,
  submission,
  onChange,
}: Props) {

  const config = jobsheet.task.conclusionConfig

  /* ================= STATE ================= */

  const [content, setContent] = useState<JSONContent>(
    submission.conclusion?.content ?? {
      type: "doc",
      content: [],
    }
  )

  const wordCount = useMemo(
    () => countWordsFromJSON(content),
    [content]
  )

  const minWord = config?.minWord ?? 0

  const isValid = config?.enabled
    ? config.required
      ? wordCount >= minWord
      : true
    : true

  /* ================= AUTOSAVE ================= */

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange?.({
        content,
        wordCount,
      })
    }, 500)

    return () => clearTimeout(timeout)
  }, [content, wordCount, onChange])

  /* ================= CONDITIONAL RENDER ================= */

  if (!config?.enabled) return null

  /* ================= UI ================= */

  return (
    <div className="bg-white border rounded-xl overflow-hidden">

      <div className="bg-gray-100 px-6 py-3 border-b font-semibold text-gray-800">
        Kesimpulan Akhir
      </div>

      <div className="p-6 space-y-4">

        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Tulis kesimpulan praktikum di sini..."
        />

        <div className="flex justify-between text-sm">

          <span className="text-gray-500">
            {wordCount} kata
            {config.minWord && <> (minimal {config.minWord})</>}
          </span>

          {!isValid && (
            <span className="text-red-500">
              Minimal {minWord} kata
            </span>
          )}

        </div>

      </div>
    </div>
  )
}