import type { Editor } from "@tiptap/core"
import { useEditorState } from "@tiptap/react"
import type { EditorRole } from "./utils/editorExtensions"
import { useState, useEffect } from "react"
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Highlighter,
  Subscript,
  Superscript,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Terminal,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table,
  Plus,
  Trash2,
  Undo,
  Redo,
  Eraser,
  ChevronDown,
  Merge,
  Split,
  Image as ImageIcon
} from "lucide-react"

interface Props {
  editor: Editor
  role: EditorRole
  layout?: "vertical" | "horizontal"
  onImageClick?: (e: React.MouseEvent) => void
}

type ToolbarButtonProps = {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
  className?: string
  showChevron?: boolean
}

function ToolbarButton({
  icon,
  label,
  active,
  onClick,
  disabled,
  className = "",
  showChevron = false,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`editor-toolbar-button flex items-center justify-center rounded-md transition-all duration-200 focus:outline-none relative
        w-8 h-8 md:w-9 md:h-9
        md:max-lg:w-7 md:max-lg:h-7
        ${
          active
            ? "bg-blue-50 text-blue-600 border border-blue-200/60 font-semibold shadow-sm"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
        } 
        disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-600
        ${className}`}
    >
      <div className="w-4 h-4 md:w-[17px] md:h-[17px] md:max-lg:w-3.5 md:max-lg:h-3.5 flex items-center justify-center">
        {icon}
      </div>
      {showChevron && (
        <ChevronDown className="w-2.5 h-2.5 ml-0.5 text-gray-400 md:max-lg:w-2 md:max-lg:h-2" />
      )}
    </button>
  )
}

function ToolbarDivider({ layout = "horizontal" }: { layout?: "vertical" | "horizontal" }) {
  return (
    <div 
      className={layout === "horizontal"
        ? "w-px h-6 bg-gray-200/80 mx-1 flex-shrink-0"
        : "w-px h-6 bg-gray-200/80 mx-1 flex-shrink-0 md:col-span-2 md:h-px md:w-full md:bg-gray-200/80 md:my-1 md:mx-0"
      }
      aria-hidden="true" 
    />
  )
}

export default function EditorToolbar({ editor, role, layout = "horizontal", onImageClick }: Props) {
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

  const [activeMenu, setActiveMenu] = useState<"heading" | "align" | "table" | null>(null)
  const [hoveredGrid, setHoveredGrid] = useState<{ rows: number; cols: number } | null>(null)
  const [inputRows, setInputRows] = useState<number>(3)
  const [inputCols, setInputCols] = useState<number>(3)
  
  const isLecturer = role === "DOSEN"
  const headingDropdownPosition = layout === "vertical"
    ? "md:left-[36px] md:top-0 md:ml-2 md:mt-0 left-0 top-full mt-1.5"
    : "left-0 top-full mt-1.5"
  const sideDropdownPosition = layout === "vertical"
    ? "md:left-[76px] md:top-0 md:ml-2 md:mt-0 left-0 top-full mt-1.5"
    : "left-0 top-full mt-1.5"

  const toggleMenu = (menu: "heading" | "align" | "table") => {
    setActiveMenu((prev) => (prev === menu ? null : menu))
  }

  // Close menus on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".editor-toolbar-dropdown") && !target.closest(".editor-toolbar-button")) {
        setActiveMenu(null)
      }
    }
    document.addEventListener("click", handleOutsideClick)
    return () => document.removeEventListener("click", handleOutsideClick)
  }, [])

  // Alignment icon based on active state
  const getAlignIcon = () => {
    if (state.isAlignCenter) return <AlignCenter size={16} />
    if (state.isAlignRight) return <AlignRight size={16} />
    if (state.isAlignJustify) return <AlignJustify size={16} />
    return <AlignLeft size={16} />
  }

  // Heading label for UX
  const getHeadingLabel = () => {
    if (state.isH1) return "H1"
    if (state.isH2) return "H2"
    if (state.isH3) return "H3"
    return "P"
  }

  return (
    <div 
      className="editor-toolbar-container flex items-center justify-start flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-300 rounded-lg w-full max-w-full select-none overflow-visible"
    >
      {/* ============================================================ */}
      {/* KELOMPOK 1: FORMAT TEKS & HEADING (8 item -> 4 baris penuh) */}
      {/* ============================================================ */}
      
      {/* Row 1 */}
      <ToolbarButton
        icon={<Bold size={16} />}
        label="Tebal (Bold)"
        active={state.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={<Italic size={16} />}
        label="Miring (Italic)"
        active={state.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />

      {/* Row 2 */}
      <ToolbarButton
        icon={<Strikethrough size={16} />}
        label="Coret (Strikethrough)"
        active={state.isStrike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        icon={<Code size={16} />}
        label="Kode Inline"
        active={state.isCode}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />

      {/* Row 3 */}
      {isLecturer ? (
        <>
          <ToolbarButton
            icon={<Highlighter size={16} />}
            label="Sorotan (Mark)"
            active={state.isHighlight}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          />
          <ToolbarButton
            icon={<Subscript size={16} />}
            label="Subscript"
            active={state.isSubscript}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          />

          {/* Row 4 */}
          <ToolbarButton
            icon={<Superscript size={16} />}
            label="Superscript"
            active={state.isSuperscript}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          />
          
          {/* Row 4, Kolom 2: Heading (Dropdown - Kolom 2 -> md:left-[36px]) */}
          <div className="relative">
            <ToolbarButton
              icon={
                <span className="text-xs font-bold font-sans">
                  {getHeadingLabel()}
                </span>
              }
              label="Heading / Paragraf"
              active={state.isH1 || state.isH2 || state.isH3}
              onClick={() => toggleMenu("heading")}
              showChevron
            />
            {activeMenu === "heading" && (
              <div 
                className={`editor-toolbar-dropdown absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 min-w-[140px] ${headingDropdownPosition}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setParagraph().run()
                    setActiveMenu(null)
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-100 w-full text-left transition ${
                    state.isParagraph ? "text-blue-600 bg-blue-50/50 font-semibold" : "text-gray-700"
                  }`}
                >
                  <Pilcrow size={14} className="opacity-70" />
                  <span>Paragraf</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                    setActiveMenu(null)
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-100 w-full text-left transition ${
                    state.isH1 ? "text-blue-600 bg-blue-50/50 font-semibold" : "text-gray-700"
                  }`}
                >
                  <Heading1 size={14} className="opacity-70" />
                  <span>Heading 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                    setActiveMenu(null)
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-100 w-full text-left transition ${
                    state.isH2 ? "text-blue-600 bg-blue-50/50 font-semibold" : "text-gray-700"
                  }`}
                >
                  <Heading2 size={14} className="opacity-70" />
                  <span>Heading 2</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 3 }).run()
                    setActiveMenu(null)
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-100 w-full text-left transition ${
                    state.isH3 ? "text-blue-600 bg-blue-50/50 font-semibold" : "text-gray-700"
                  }`}
                >
                  <Heading3 size={14} className="opacity-70" />
                  <span>Heading 3</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Untuk non-dosen */}
        </>
      )}

      {isLecturer && <ToolbarDivider layout={layout} />}

      {/* ============================================================ */}
      {/* KELOMPOK 2: LIST, BLOCKS & ALIGNMENT (6 item -> 3 baris penuh) */}
      {/* ============================================================ */}
      
      {isLecturer && (
        <>
          {/* Row 5, Kolom 1: Align (Dropdown - Kolom 1 -> md:left-[76px]) */}
          <div className="relative">
            <ToolbarButton
              icon={getAlignIcon()}
              label="Penyelarasan Teks (Alignment)"
              active={state.isAlignLeft || state.isAlignCenter || state.isAlignRight || state.isAlignJustify}
              onClick={() => toggleMenu("align")}
              showChevron
            />
            {activeMenu === "align" && (
              <div 
                className={`editor-toolbar-dropdown absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 min-w-[140px] ${sideDropdownPosition}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setTextAlign("left").run()
                    setActiveMenu(null)
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-100 w-full text-left transition ${
                    state.isAlignLeft ? "text-blue-600 bg-blue-50/50 font-semibold" : "text-gray-700"
                  }`}
                >
                  <AlignLeft size={14} className="opacity-70" />
                  <span>Rata Kiri</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setTextAlign("center").run()
                    setActiveMenu(null)
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-100 w-full text-left transition ${
                    state.isAlignCenter ? "text-blue-600 bg-blue-50/50 font-semibold" : "text-gray-700"
                  }`}
                >
                  <AlignCenter size={14} className="opacity-70" />
                  <span>Rata Tengah</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setTextAlign("right").run()
                    setActiveMenu(null)
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-100 w-full text-left transition ${
                    state.isAlignRight ? "text-blue-600 bg-blue-50/50 font-semibold" : "text-gray-700"
                  }`}
                >
                  <AlignRight size={14} className="opacity-70" />
                  <span>Rata Kanan</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setTextAlign("justify").run()
                    setActiveMenu(null)
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-gray-100 w-full text-left transition ${
                    state.isAlignJustify ? "text-blue-600 bg-blue-50/50 font-semibold" : "text-gray-700"
                  }`}
                >
                  <AlignJustify size={14} className="opacity-70" />
                  <span>Rata Kiri Kanan</span>
                </button>
              </div>
            )}
          </div>

          {/* Row 5, Kolom 2 */}
          <ToolbarButton
            icon={<List size={16} />}
            label="Bullet List"
            active={state.isBulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />

          {/* Row 6 */}
          <ToolbarButton
            icon={<ListOrdered size={16} />}
            label="Numbered List"
            active={state.isOrderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            icon={<Quote size={16} />}
            label="Kutipan (Quote)"
            active={state.isBlockquote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />

          {/* Row 7 */}
          <ToolbarButton
            icon={<Terminal size={16} />}
            label="Code Block"
            active={state.isCodeBlock}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          />
          <ToolbarButton
            icon={<Minus size={16} />}
            label="Horizontal Rule (HR)"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          />
          {onImageClick && (
            <ToolbarButton
              icon={<ImageIcon size={16} />}
              label="Sisipkan Gambar"
              onClick={onImageClick}
            />
          )}
        </>
      )}

      {isLecturer && <ToolbarDivider layout={layout} />}

      {/* ============================================================ */}
      {/* KELOMPOK 3: TABLE & LAINNYA / SEJARAH (4 item -> 2 baris penuh) */}
      {/* ============================================================ */}
      
      {/* Row 8, Kolom 1: Table (Dropdown - Kolom 1 -> md:left-[76px]) */}
      {isLecturer ? (
        <>
          <div className="relative">
            <ToolbarButton
              icon={<Table size={16} />}
              label="Tabel"
              active={state.isTable}
              onClick={() => toggleMenu("table")}
              showChevron
            />
            {activeMenu === "table" && (
              <div 
                className={`editor-toolbar-dropdown absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 flex flex-col gap-2.5 w-[180px] select-none text-left ${sideDropdownPosition}`}
              >
                {/* Word-style Grid Picker */}
                <div className="flex flex-col gap-1.5 select-none">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <span>Buat Tabel</span>
                    <span className="text-blue-600 font-bold font-sans">
                      {hoveredGrid ? `${hoveredGrid.cols} × ${hoveredGrid.rows}` : "Pilih Ukuran"}
                    </span>
                  </div>
                  
                  <div 
                    className="grid grid-cols-8 gap-0.5 p-1 bg-gray-50 border border-gray-200 rounded"
                    onMouseLeave={() => setHoveredGrid(null)}
                  >
                    {Array.from({ length: 8 }).map((_, rIdx) => {
                      const r = rIdx + 1
                      return Array.from({ length: 8 }).map((_, cIdx) => {
                        const c = cIdx + 1
                        const isHighlighted = hoveredGrid
                          ? r <= hoveredGrid.rows && c <= hoveredGrid.cols
                          : false
                        return (
                          <div
                            key={`${r}-${c}`}
                            onMouseEnter={() => setHoveredGrid({ rows: r, cols: c })}
                            onClick={() => {
                              editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run()
                              setActiveMenu(null)
                              setHoveredGrid(null)
                            }}
                            className={`w-3.5 h-3.5 border transition-all duration-75 cursor-pointer rounded-[2px]
                              ${
                                isHighlighted
                                  ? "bg-blue-500 border-blue-600 shadow-[0_0_2px_rgba(59,130,246,0.5)]"
                                  : "bg-white border-gray-200 hover:border-blue-400"
                              }`}
                          />
                        )
                      })
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 my-0.5" />

                {/* Manual Size Inputs */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ukuran Kustom</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={inputCols}
                      onChange={(e) => setInputCols(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Kolom"
                      className="w-10 h-7 text-xs border border-gray-300 rounded text-center focus:border-blue-500 outline-none"
                    />
                    <span className="text-[10px] text-gray-400">×</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={inputRows}
                      onChange={(e) => setInputRows(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Baris"
                      className="w-10 h-7 text-xs border border-gray-300 rounded text-center focus:border-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().insertTable({ rows: inputRows, cols: inputCols, withHeaderRow: true }).run()
                        setActiveMenu(null)
                      }}
                      className="h-7 flex-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
                    >
                      OK
                    </button>
                  </div>
                </div>

                {/* Table Editing Actions */}
                {state.isTable && (
                  <>
                    <div className="h-px bg-gray-100 my-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Edit Tabel</span>
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().addRowAfter().run()
                          setActiveMenu(null)
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-gray-100 w-full text-left text-gray-700 transition"
                      >
                        <Plus size={12} className="text-gray-400" />
                        <span>Tambah Baris</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().addColumnAfter().run()
                          setActiveMenu(null)
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-gray-100 w-full text-left text-gray-700 transition"
                      >
                        <Plus size={12} className="text-gray-400" />
                        <span>Tambah Kolom</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().mergeCells().run()
                          setActiveMenu(null)
                        }}
                        disabled={!editor.can().mergeCells()}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent w-full text-left text-gray-700 transition"
                      >
                        <Merge size={12} className="text-gray-400" />
                        <span>Gabung Sel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().splitCell().run()
                          setActiveMenu(null)
                        }}
                        disabled={!editor.can().splitCell()}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent w-full text-left text-gray-700 transition"
                      >
                        <Split size={12} className="text-gray-400" />
                        <span>Pisah Sel</span>
                      </button>
                      <div className="h-px bg-gray-100 my-0.5" />
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().deleteRow().run()
                          setActiveMenu(null)
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-red-50 w-full text-left text-red-650 transition"
                      >
                        <Trash2 size={12} className="text-red-400" />
                        <span>Hapus Baris</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().deleteColumn().run()
                          setActiveMenu(null)
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-red-50 w-full text-left text-red-650 transition"
                      >
                        <Trash2 size={12} className="text-red-400" />
                        <span>Hapus Kolom</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().deleteTable().run()
                          setActiveMenu(null)
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-red-50 w-full text-left text-red-650 font-semibold transition"
                      >
                        <Trash2 size={12} className="text-red-650" />
                        <span>Hapus Tabel</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Row 8, Kolom 2: Clear Formatting */}
          <ToolbarButton
            icon={<Eraser size={16} />}
            label="Bersihkan Format"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          />
        </>
      ) : (
        <>
          {/* Untuk non-dosen */}
        </>
      )}

      {/* Row 9 */}
      <ToolbarButton
        icon={<Undo size={16} />}
        label="Urungkan (Undo)"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!state.canUndo}
      />
      <ToolbarButton
        icon={<Redo size={16} />}
        label="Ulangi (Redo)"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!state.canRedo}
      />
    </div>
  )
}
