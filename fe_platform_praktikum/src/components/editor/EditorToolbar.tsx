import type { Editor } from "@tiptap/core"
import { useEditorState } from "@tiptap/react"
import type { EditorRole } from "./utils/editorExtensions"

interface Props {
  editor: Editor
  role: EditorRole
}

type ToolbarButtonProps = {
  label: string
  active?: boolean
  onClick: () => void
  disabled?: boolean
}

function ToolbarButton({ label, active, onClick, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-3 py-1 text-sm transition ${
        active
          ? "border-blue-700 bg-blue-700 text-white"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {label}
    </button>
  )
}

function ToolbarDivider() {
  return <span className="h-7 w-px bg-gray-300" aria-hidden="true" />
}

export default function EditorToolbar({ editor, role }: Props) {
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive("bold"),
      isItalic: ctx.editor.isActive("italic"),
      isStrike: ctx.editor.isActive("strike"),
      isCode: ctx.editor.isActive("code"),
      isHighlight: ctx.editor.isActive("highlight"),
      isSubscript: ctx.editor.isActive("subscript"),
      isSuperscript: ctx.editor.isActive("superscript"),
      isParagraph: ctx.editor.isActive("paragraph"),
      isH1: ctx.editor.isActive("heading", { level: 1 }),
      isH2: ctx.editor.isActive("heading", { level: 2 }),
      isH3: ctx.editor.isActive("heading", { level: 3 }),
      isBulletList: ctx.editor.isActive("bulletList"),
      isOrderedList: ctx.editor.isActive("orderedList"),
      isBlockquote: ctx.editor.isActive("blockquote"),
      isCodeBlock: ctx.editor.isActive("codeBlock"),
      isAlignLeft: ctx.editor.isActive({ textAlign: "left" }),
      isAlignCenter: ctx.editor.isActive({ textAlign: "center" }),
      isAlignRight: ctx.editor.isActive({ textAlign: "right" }),
      isAlignJustify: ctx.editor.isActive({ textAlign: "justify" }),
      isTable: ctx.editor.isActive("table"),
      canUndo: ctx.editor.can().chain().focus().undo().run(),
      canRedo: ctx.editor.can().chain().focus().redo().run(),
    }),
  })

  const isLecturer = role === "DOSEN"

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-gray-50 p-3">
      <ToolbarButton label="B" onClick={() => editor.chain().focus().toggleBold().run()} active={state.isBold} />
      <ToolbarButton label="I" onClick={() => editor.chain().focus().toggleItalic().run()} active={state.isItalic} />
      <ToolbarButton label="S" onClick={() => editor.chain().focus().toggleStrike().run()} active={state.isStrike} />
      <ToolbarButton label="Code" onClick={() => editor.chain().focus().toggleCode().run()} active={state.isCode} />

      {isLecturer && (
        <>
          <ToolbarButton
            label="Mark"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={state.isHighlight}
          />
          <ToolbarButton
            label="Sub"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            active={state.isSubscript}
          />
          <ToolbarButton
            label="Sup"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            active={state.isSuperscript}
          />
          <ToolbarDivider />
          <ToolbarButton
            label="P"
            onClick={() => editor.chain().focus().setParagraph().run()}
            active={state.isParagraph}
          />
          <ToolbarButton
            label="H1"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={state.isH1}
          />
          <ToolbarButton
            label="H2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={state.isH2}
          />
          <ToolbarButton
            label="H3"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={state.isH3}
          />
          <ToolbarDivider />
          <ToolbarButton
            label="Bullet"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={state.isBulletList}
          />
          <ToolbarButton
            label="Number"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={state.isOrderedList}
          />
          <ToolbarButton
            label="Quote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={state.isBlockquote}
          />
          <ToolbarButton
            label="Code Block"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={state.isCodeBlock}
          />
          <ToolbarButton
            label="HR"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          />
          <ToolbarDivider />
          <ToolbarButton
            label="Left"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={state.isAlignLeft}
          />
          <ToolbarButton
            label="Center"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={state.isAlignCenter}
          />
          <ToolbarButton
            label="Right"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={state.isAlignRight}
          />
          <ToolbarButton
            label="Justify"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            active={state.isAlignJustify}
          />
          <ToolbarDivider />
          <ToolbarButton
            label="Table"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            active={state.isTable}
          />
          <ToolbarButton
            label="+Row"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            disabled={!state.isTable}
          />
          <ToolbarButton
            label="+Col"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            disabled={!state.isTable}
          />
          <ToolbarButton
            label="-Row"
            onClick={() => editor.chain().focus().deleteRow().run()}
            disabled={!state.isTable}
          />
          <ToolbarButton
            label="-Col"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            disabled={!state.isTable}
          />
          <ToolbarButton
            label="Del Table"
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={!state.isTable}
          />
          <ToolbarDivider />
          <ToolbarButton
            label="Clear"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          />
        </>
      )}

      <ToolbarDivider />
      <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!state.canUndo} />
      <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!state.canRedo} />
    </div>
  )
}
