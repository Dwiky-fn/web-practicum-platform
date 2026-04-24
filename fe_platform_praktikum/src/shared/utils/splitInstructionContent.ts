import type { JSONContent } from "@tiptap/core"

export function splitInstructionContent(doc?: JSONContent): JSONContent[] {
  if (!doc?.content) return []

  const orderedList = doc.content.find(
    (node) => node.type === "orderedList"
  )

  if (!orderedList?.content) {
    return [doc]
  }

  return orderedList.content.map((listItem) => ({
    type: "doc",
    content: [
      {
        type: "orderedList",
        content: [listItem],
      },
    ],
  }))
}