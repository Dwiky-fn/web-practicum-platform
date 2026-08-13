import type { JSONContent } from "@tiptap/core"

interface Props {
  value: JSONContent
  onChange: (value: JSONContent) => void
}

export function InstructionCodeCheckboxes({ value, onChange }: Props) {
  if (!value?.content) return null

  // Temukan node orderedList pertama
  const listIndex = value.content.findIndex(node => node.type === "orderedList")
  if (listIndex === -1) return null

  const targetList = value.content[listIndex]
  if (!targetList?.content || targetList.content.length === 0) return null

  const handleToggle = (itemIndex: number, checked: boolean) => {
    // Clone seluruh dokumen untuk memicu re-render
    const newContent = JSON.parse(JSON.stringify(value)) as JSONContent
    const listNode = newContent.content![listIndex]
    
    // Pastikan list item memiliki objek attrs
    const listItem = listNode.content![itemIndex]
    if (!listItem.attrs) {
      listItem.attrs = {}
    }
    
    listItem.attrs.needsCode = checked
    onChange(newContent)
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-xs font-semibold text-gray-700">Tandai langkah yang memerlukan Workspace (Kode Program):</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {targetList.content.map((item, index) => {
          const needsCode = item.attrs?.needsCode !== undefined ? Boolean(item.attrs.needsCode) : true
          
          return (
            <label key={index} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={needsCode}
                onChange={(e) => handleToggle(index, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Langkah {index + 1}
            </label>
          )
        })}
      </div>
    </div>
  )
}
