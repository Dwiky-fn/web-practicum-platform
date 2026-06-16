import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import { useCurrentUser } from "../../services/user/useCurrentUser";
import { getEditorExtensions, type EditorRole, type EditorMode } from "./utils/editorExtensions";
import type { JSONContent } from "@tiptap/react";
import EditorToolbar from "./EditorToolbar";
import { toEditorRole } from "./utils/toEditorRole";

interface Props {
  value: JSONContent;
  onChange?: (content: JSONContent) => void;
  editable?: boolean;
  placeholder?: string;
  role?: EditorRole;
  /**
   * @deprecated Toolbar rich text editor sekarang selalu berada di atas editor.
   * Prop ini dipertahankan sementara agar pemanggil lama tidak error.
   */
  toolbarPosition?: "top" | "side";
}

export default function RichTextEditor({
  value,
  onChange,
  editable = true,
  placeholder = "Mulai menulis...",
  role,
}: Props) {
  const { user } = useCurrentUser();
  const resolvedRole: EditorRole = role ?? toEditorRole(user?.role);
  const mode: EditorMode = "editor";

  const editor = useEditor({
    extensions: getEditorExtensions(resolvedRole, mode, placeholder),
    content: value,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none min-h-[200px]",
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className="rich-editor-wrapper flex flex-col gap-2 w-full min-w-0">
      {editable && (
        <div className="rich-editor-toolbar w-full min-w-0">
          <EditorToolbar editor={editor} role={resolvedRole} layout="horizontal" />
        </div>
      )}
      <div className="rich-editor-content w-full min-w-0 border border-gray-300 rounded-lg bg-white p-4 shadow-sm min-h-[200px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
