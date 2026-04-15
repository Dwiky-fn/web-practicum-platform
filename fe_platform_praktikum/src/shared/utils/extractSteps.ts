import type { JSONContent } from "@tiptap/react"

export function extractSteps(content?: JSONContent): string[] {
  if (!content || !content.content) return []

  const steps: string[] = []

  content.content.forEach((node) => {

    // 🔥 handle ordered list
    if (node.type === "orderedList" && node.content) {
      node.content.forEach((listItem) => {

        // ambil text di dalam listItem
        const paragraph = listItem.content?.[0]

        if (paragraph?.content) {
          const text = paragraph.content
            .map((child) => child.text ?? "")
            .join("")

          if (text.trim()) {
            steps.push(text)
          }
        }
      })
    }

  })

  return steps
}