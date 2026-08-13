import type { JSONContent } from "@tiptap/core"

export interface InstructionStep {
  content: JSONContent
  needsCode: boolean
}



export function splitInstructionContent(doc?: JSONContent): InstructionStep[] {
  if (!doc?.content) return []

  const targetList = doc.content.find(
    (node) => node.type === "orderedList"
  )

  if (!targetList?.content) {
    return [{ content: doc, needsCode: true }]
  }

  return targetList.content.map((listItem) => {
    // Check custom attribute needsCode (default true)
    const needsCode = listItem.attrs?.needsCode !== undefined ? Boolean(listItem.attrs.needsCode) : true

    return {
      content: {
        type: "doc",
        content: [
          {
            type: targetList.type,
            content: [listItem],
          },
        ],
      },
      needsCode,
    }
  })
}