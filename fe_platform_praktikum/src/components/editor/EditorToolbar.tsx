import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { EditorRole } from "./utils/editorExtensions";

interface Props {
  editor: Editor;
  role: EditorRole;
}

export default function EditorToolbar({ editor, role }: Props) {
  // Subscribe to editor state changes so toolbar re-renders on selection/mark changes
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive("bold"),
      isItalic: ctx.editor.isActive("italic"),
      isCode: ctx.editor.isActive("code"),      // ← inline code, bukan codeBlock
      isH1: ctx.editor.isActive("heading", { level: 1 }),
    }),
  });

  const btn = (label: string, action: () => void, active?: boolean) => (
    <button
      onClick={action}
      type="button"
      className={`px-3 py-1 text-sm rounded-md border transition ${
        active ? "bg-purple-600 text-white" : "bg-gray-100 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-2 p-3 border-b bg-gray-50">
      {btn("Bold", () => editor.chain().focus().toggleBold().run(), editorState.isBold)}

      {btn("Italic", () => editor.chain().focus().toggleItalic().run(), editorState.isItalic)}

      {btn(
        "Code",
        () => editor.chain().focus().toggleCode().run(),
        editorState.isCode
      )}

      {role === "DOSEN" &&
        btn(
          "H1",
          () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          editorState.isH1
        )}

      {role === "DOSEN" &&
        btn("Table", () =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()
        )}

      {btn("Undo", () => editor.chain().focus().undo().run())}

      {btn("Redo", () => editor.chain().focus().redo().run())}
    </div>
  );
}