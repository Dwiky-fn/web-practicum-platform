import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import { getEditorExtensions, type EditorMode, type EditorRole } from "./utils/editorExtensions";
import type { JSONContent } from "@tiptap/react";
import { useCurrentUser } from "../../services/user/useCurrentUser"; 
import type { Role } from "../../services/user/types";
import { toEditorRole } from "./utils/toEditorRole";

interface Props {
  content: JSONContent;
  role?: EditorRole;
  mode?: EditorMode;
}

export default function RichTextViewer({
  content,
  role,
  mode = "viewer-default",
}: Props) {
  const { user } = useCurrentUser();
  const resolvedRole: EditorRole = role ?? toEditorRole(user?.role as Role);

  const editor = useEditor({
    extensions: getEditorExtensions(resolvedRole, mode),
    content,
    editable: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    // queueMicrotask menghindari flushSync conflict dengan React rendering
    queueMicrotask(() => {
      if (editor.isDestroyed) return;
      editor.commands.setContent(content);
    });
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="prose prose-gray max-w-none 
      prose-headings:font-semibold
      prose-table:border
      prose-table:border-gray-300
      prose-th:bg-gray-100
      prose-code:text-sm
    ">
      <EditorContent editor={editor} />
    </div>
  );
}
