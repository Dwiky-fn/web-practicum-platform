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
  toolbarPosition?: "top" | "side";
}

export default function RichTextEditor({
  value,
  onChange,
  editable = true,
  placeholder = "Mulai menulis...",
  role,
  toolbarPosition = "side",
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

  const isLecturer = resolvedRole === "DOSEN";

  if (isLecturer && editable) {
    if (toolbarPosition === "top") {
      return (
        <div className="flex flex-col gap-2 w-full">
          <EditorToolbar editor={editor} role={resolvedRole} layout="horizontal" />
          <div className="flex-1 w-full border border-gray-300 rounded-lg bg-white p-4 shadow-sm min-h-[120px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col md:flex-row gap-4 items-start relative w-full min-w-0">
        <div className="w-full md:w-auto md:sticky md:top-4 z-10 shrink-0">
          <EditorToolbar editor={editor} role={resolvedRole} />
        </div>
        <div className="flex-1 w-full min-w-0 border border-gray-300 rounded-lg bg-white p-5 shadow-sm min-h-[250px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
      {editable && <EditorToolbar editor={editor} role={resolvedRole} />}
      <div className="p-4 min-h-[200px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
