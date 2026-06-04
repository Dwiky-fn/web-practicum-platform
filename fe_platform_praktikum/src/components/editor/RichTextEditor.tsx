import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import { useCurrentUser } from "../../services/user/useCurrentUser";
import { getEditorExtensions, type EditorRole, type EditorMode } from "./utils/editorExtensions";
import type { JSONContent } from "@tiptap/react";
import type { Role } from "../../services/user/types";
import EditorToolbar from "./EditorToolbar";

interface Props {
  value: JSONContent;
  onChange?: (content: JSONContent) => void;
  editable?: boolean;
  placeholder?: string;
  role?: EditorRole;
}

function toEditorRole(role: Role | undefined): EditorRole {
  if (role === "DOSEN" || role === "ADMIN") return "DOSEN";
  return "MAHASISWA";
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
    <div className="border border-gray-400 rounded-lg overflow-hidden bg-white">
      {editable && <EditorToolbar editor={editor} role={resolvedRole} />}
      <div className="p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
