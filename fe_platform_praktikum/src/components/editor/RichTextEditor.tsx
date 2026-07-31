import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "../../services/user/useCurrentUser";
import { getEditorExtensions, type EditorRole, type EditorMode } from "./utils/editorExtensions";
import type { JSONContent } from "@tiptap/react";
import EditorToolbar from "./EditorToolbar";
import { toEditorRole } from "./utils/toEditorRole";
import { AlignLeft, AlignCenter, AlignRight, Trash2, X } from "lucide-react";
import { toast } from "../../components/toast/toastStore";

interface Props {
  value: JSONContent;
  onChange?: (content: JSONContent) => void;
  editable?: boolean;
  placeholder?: string;
  role?: EditorRole;
  onUploadImage?: (file: File) => Promise<{ id: string; url: string; alt: string; width?: number; height?: number }>;
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
  onUploadImage,
}: Props) {
  const { user } = useCurrentUser();
  const resolvedRole: EditorRole = role ?? toEditorRole(user?.role);
  const mode: EditorMode = "editor";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [altModalOpen, setAltModalOpen] = useState(false);
  const [altInput, setAltInput] = useState("");

  const handleImageUpload = async (file: File, pos?: number) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format gambar tidak didukung. Gunakan PNG, JPG, JPEG, atau WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5 MB.");
      return;
    }
    if (!onUploadImage) return;

    const objectUrl = URL.createObjectURL(file);
    const targetPos = pos !== undefined ? pos : editor?.state.selection.anchor ?? 0;

    editor?.chain().focus().insertContentAt(targetPos, {
      type: "image",
      attrs: {
        src: objectUrl,
        alt: "Mengunggah gambar...",
        imageId: "uploading-temp",
        widthMode: "custom",
        widthPx: 640,
        alignment: "center",
      }
    }).run();

    try {
      const uploaded = await onUploadImage(file);
      
      let foundPos = -1;
      editor?.state.doc.descendants((node, p) => {
        if (node.type.name === "image" && node.attrs.src === objectUrl) {
          foundPos = p;
          return false;
        }
        return true;
      });

      if (foundPos !== -1 && editor) {
        editor.chain().focus().deleteRange({ from: foundPos, to: foundPos + 1 }).insertContentAt(foundPos, {
          type: "image",
          attrs: {
            src: uploaded.url,
            alt: uploaded.alt || "Gambar pada jobsheet",
            imageId: uploaded.id,
            widthMode: "custom",
            widthPx: 640,
            alignment: "center",
          }
        }).run();
        toast.success("Gambar berhasil diunggah.");
      }
    } catch (err: any) {
      let foundPos = -1;
      editor?.state.doc.descendants((node, p) => {
        if (node.type.name === "image" && node.attrs.src === objectUrl) {
          foundPos = p;
          return false;
        }
        return true;
      });

      if (foundPos !== -1 && editor) {
        editor.chain().focus().deleteRange({ from: foundPos, to: foundPos + 1 }).run();
      }
      toast.error(err?.message || "Gagal mengunggah gambar.");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = "";
    handleImageUpload(file);
  };

  const editor = useEditor({
    extensions: getEditorExtensions(resolvedRole, mode, placeholder),
    content: value,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none min-h-[200px]",
      },
      handleDOMEvents: {
        paste(_view, event) {
          if (!onUploadImage) return false;
          const items = event.clipboardData?.items;
          if (!items) return false;

          for (const item of items) {
            if (item.type.indexOf("image") === 0) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                handleImageUpload(file);
                return true;
              }
            }
          }
          return false;
        },
        drop(_view, event) {
          if (!onUploadImage) return false;
          const files = event.dataTransfer?.files;
          if (!files || files.length === 0) return false;

          const file = files[0];
          if (file.type.indexOf("image") === 0) {
            event.preventDefault();
            const coordinates = _view.posAtCoords({ left: event.clientX, top: event.clientY });
            handleImageUpload(file, coordinates?.pos);
            return true;
          }
          return false;
        }
      }
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
    <div className="rich-editor-wrapper flex flex-col gap-2 w-full min-w-0 relative">
      {editable && (
        <div className="rich-editor-toolbar w-full min-w-0 sticky top-2 sm:top-4 z-30 bg-gray-50/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200/60 transition-all">
          <EditorToolbar
            editor={editor}
            role={resolvedRole}
            layout="horizontal"
            onImageClick={onUploadImage ? () => fileInputRef.current?.click() : undefined}
          />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileChange}
          />
        </div>
      )}
      <div className="rich-editor-content w-full min-w-0 border border-gray-300 rounded-lg bg-white p-4 shadow-sm min-h-[200px] relative">
        {editor && editable && editor.isActive("image") && (
          <BubbleMenu
            editor={editor}
            shouldShow={({ editor }: any) => editor.isActive("image")}
          >
            <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg shadow-lg p-1.5 z-50">
              <button
                type="button"
                onClick={() => {
                  const naturalWidth = editor.getAttributes("image").naturalWidth || 640;
                  editor.chain().focus().updateAttributes("image", { 
                    widthMode: "custom", 
                    widthPx: Math.min(320, naturalWidth) 
                  }).run();
                }}
                className={`px-2 py-1 text-xs rounded hover:bg-gray-100 ${editor.getAttributes("image").widthMode === "custom" && editor.getAttributes("image").widthPx === 320 ? "bg-blue-50 text-blue-600 font-semibold" : "text-gray-700"}`}
              >
                Kecil
              </button>
              <button
                type="button"
                onClick={() => {
                  const naturalWidth = editor.getAttributes("image").naturalWidth || 640;
                  editor.chain().focus().updateAttributes("image", { 
                    widthMode: "custom", 
                    widthPx: Math.min(640, naturalWidth) 
                  }).run();
                }}
                className={`px-2 py-1 text-xs rounded hover:bg-gray-100 ${editor.getAttributes("image").widthMode === "custom" && editor.getAttributes("image").widthPx === 640 ? "bg-blue-50 text-blue-600 font-semibold" : "text-gray-700"}`}
              >
                Sedang
              </button>
              <button
                type="button"
                onClick={() => {
                  const naturalWidth = editor.getAttributes("image").naturalWidth || 640;
                  editor.chain().focus().updateAttributes("image", { 
                    widthMode: "custom", 
                    widthPx: Math.min(900, naturalWidth) 
                  }).run();
                }}
                className={`px-2 py-1 text-xs rounded hover:bg-gray-100 ${editor.getAttributes("image").widthMode === "custom" && editor.getAttributes("image").widthPx === 900 ? "bg-blue-50 text-blue-600 font-semibold" : "text-gray-700"}`}
              >
                Besar
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().updateAttributes("image", { widthMode: "full", widthPx: null }).run()}
                className={`px-2 py-1 text-xs rounded hover:bg-gray-100 ${editor.getAttributes("image").widthMode === "full" ? "bg-blue-50 text-blue-600 font-semibold" : "text-gray-700"}`}
              >
                Penuh
              </button>

              <div className="w-px h-4 bg-gray-200 mx-1" />

              <button
                type="button"
                onClick={() => editor.chain().focus().updateAttributes("image", { alignment: "left" }).run()}
                className={`p-1.5 rounded hover:bg-gray-100 ${editor.getAttributes("image").alignment === "left" ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                title="Rata Kiri"
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().updateAttributes("image", { alignment: "center" }).run()}
                className={`p-1.5 rounded hover:bg-gray-100 ${editor.getAttributes("image").alignment === "center" || !editor.getAttributes("image").alignment ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                title="Tengah"
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().updateAttributes("image", { alignment: "right" }).run()}
                className={`p-1.5 rounded hover:bg-gray-100 ${editor.getAttributes("image").alignment === "right" ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
                title="Rata Kanan"
              >
                <AlignRight size={14} />
              </button>

              <div className="w-px h-4 bg-gray-200 mx-1" />

              <button
                type="button"
                onClick={() => {
                  const currentAlt = editor.getAttributes("image").alt || "";
                  setAltInput(currentAlt);
                  setAltModalOpen(true);
                }}
                className="px-2 py-1 text-xs rounded hover:bg-gray-100 text-gray-700 font-medium"
                title="Ubah Teks Alternatif"
              >
                Alt
              </button>

              <button
                type="button"
                onClick={() => editor.chain().focus().deleteSelection().run()}
                className="p-1.5 rounded hover:bg-red-50 text-red-650"
                title="Hapus Gambar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>

      {altModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Teks Alternatif Gambar (Alt)</h3>
              <button
                type="button"
                onClick={() => setAltModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-md p-1"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Masukkan Teks Alternatif:
              </label>
              <input
                type="text"
                autoFocus
                className="w-full h-10 px-3 text-sm rounded-lg border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={altInput}
                onChange={(e) => setAltInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (editor) {
                      editor.chain().focus().updateAttributes("image", { alt: altInput }).run();
                    }
                    setAltModalOpen(false);
                  }
                }}
                placeholder="Deskripsi singkat gambar..."
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAltModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().updateAttributes("image", { alt: altInput }).run();
                  }
                  setAltModalOpen(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
