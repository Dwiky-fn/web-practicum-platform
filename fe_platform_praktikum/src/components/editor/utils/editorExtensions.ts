import Highlight from "@tiptap/extension-highlight"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import Placeholder from "@tiptap/extension-placeholder"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import Typography from "@tiptap/extension-typography"
import StarterKit from "@tiptap/starter-kit"
import { CodeBlockWithLineNumber } from "../CodeBlockWithLineNumber"
import { CustomImage } from "./CustomImage"
import { FontSizeExtension } from "./fontSizeExtension"
import { IndentExtension } from "./indentExtension"
import { CustomOrderedList } from "./customOrderedList"

export type EditorRole = "DOSEN" | "MAHASISWA"
export type EditorMode = "editor" | "viewer-theory" | "viewer-default"

export function getEditorExtensions(
  _role: EditorRole,
  mode: EditorMode,
  placeholder?: string
) {
  const isViewer = mode !== "editor"

  const base = [
    StarterKit.configure({
      codeBlock: false,
      orderedList: false,
    }),
    CustomOrderedList,
    TextStyle,
    FontSizeExtension,
    IndentExtension,
    Highlight,
    HorizontalRule,
    Subscript,
    Superscript,
    Typography,
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    CustomImage,
  ]

  const table = [
    Table.configure({ resizable: !isViewer }),
    TableRow,
    TableHeader,
    TableCell,
  ]

  const codeBlock = [CodeBlockWithLineNumber]

  const editorOnly = [
    Placeholder.configure({
      placeholder: placeholder || "",
    }),
  ]

  return [
    ...base,
    ...table,
    ...codeBlock,
    ...(mode === "editor" ? editorOnly : []),
  ]
}
