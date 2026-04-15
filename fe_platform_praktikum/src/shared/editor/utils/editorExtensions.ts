import { Table } from "@tiptap/extension-table";
import { CodeBlockWithLineNumber } from "../CodeBlockWithLineNumber";
import StarterKit from "@tiptap/starter-kit";
import Superscript from "@tiptap/extension-superscript";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";

export type EditorRole = "DOSEN" | "MAHASISWA";
export type EditorMode = "editor" | "viewer-theory" | "viewer-default";

export function getEditorExtensions(
  _role: EditorRole,  // ← tetap ada untuk konsistensi API, tapi tidak dipakai di schema
  mode: EditorMode,
  placeholder?: string
) {
  const isViewer = mode !== "editor";

  const base = [
    StarterKit.configure({
      codeBlock: false,
      // ← TIDAK batasi heading/blockquote di sini
      // schema harus selalu lengkap agar viewer bisa render konten apapun
    }),
    Superscript,
  ];

  const table = [
    Table.configure({ resizable: !isViewer }),
    TableRow,
    TableHeader,
    TableCell,
  ];

  const codeBlock = [CodeBlockWithLineNumber];

  const editorOnly = [
    Placeholder.configure({
      placeholder: placeholder || "",
    }),
  ];

  return [
    ...base,
    ...table,
    ...codeBlock,
    ...(mode === "editor" ? editorOnly : []),
  ];
}