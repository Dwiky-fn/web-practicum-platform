import Editor from "@monaco-editor/react"
import type React from "react"
import { useCallback, useState } from "react"
import EditorTabs from "./EditorTabs"
import FileExplorer from "./FileExplorer"
import type { ExplorerClipboard, FileTreeNode, TreeContextMenuState } from "./types"
import { registerInternalEditorCopy, isInternalEditorCopy, notifyExternalPasteBlocked } from "../../shared/utils/editorClipboardProtection"

interface Props {
  language: string
  files: Record<string, string>
  activeFile: string
  activeFileId: string | null
  editorPath: string
  tree: FileTreeNode[]
  expandedFolders: Set<string>
  selectedNodeId: string | null
  isExplorerCollapsed: boolean
  contextMenu: TreeContextMenuState | null
  clipboard: ExplorerClipboard | null
  renamingNodeId: string | null
  onToggleExplorerCollapse: () => void
  onToggleFolder: (id: string) => void
  onSelectNode: (node: FileTreeNode | null) => void
  onOpenFile: (node: FileTreeNode) => void
  onChangeFile: (fileName: string) => void
  onCodeChange: (value: string) => void
  onAddFile: (targetId?: string | null) => void
  onAddFolder: (targetId?: string | null) => void
  onRequestRename: (node: FileTreeNode) => void
  onRenameNode: (node: FileTreeNode, nextName: string) => void
  onDeleteNode: (node: FileTreeNode) => void
  onContextMenu: (event: React.MouseEvent, node: FileTreeNode | null) => void
  onCloseContextMenu: () => void
  onCut: (node: FileTreeNode) => void
  onCopy: (node: FileTreeNode) => void
  onPaste: (targetId?: string | null) => void
  onDropNode: (draggedNodeId: string, targetNodeId: string | null) => void
  onDeleteFile: (fileName: string) => void
  readOnly?: boolean
}

export default function CodeEditorLayout({
  language,
  files,
  activeFile,
  activeFileId,
  editorPath,
  tree,
  expandedFolders,
  selectedNodeId,
  isExplorerCollapsed,
  contextMenu,
  clipboard,
  renamingNodeId,
  onToggleExplorerCollapse,
  onToggleFolder,
  onSelectNode,
  onOpenFile,
  onChangeFile,
  onCodeChange,
  onAddFile,
  onAddFolder,
  onRequestRename,
  onRenameNode,
  onDeleteNode,
  onContextMenu,
  onCloseContextMenu,
  onCut,
  onCopy,
  onPaste,
  onDropNode,
  onDeleteFile,
  readOnly = false,
}: Props) {
  const [explorerWidth, setExplorerWidth] = useState(256)

  const handleExplorerResize = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = explorerWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(Math.max(startWidth + moveEvent.clientX - startX, 180), 360)

      setExplorerWidth(nextWidth)
    }

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }, [explorerWidth])
  const handleEditorMount = useCallback((editor: any) => {
    const container = editor.getDomNode()
    if (!container) return

    const handleCopyCut = () => {
      const selection = editor.getModel()?.getValueInRange(editor.getSelection())
      if (selection) {
        registerInternalEditorCopy(selection)
      } else {
        const fullContent = editor.getValue()
        if (fullContent) {
          registerInternalEditorCopy(fullContent)
        }
      }
    }

    const handlePaste = (e: ClipboardEvent) => {
      const pastedText = e.clipboardData?.getData("text/plain") || ""
      if (!pastedText) return

      if (!isInternalEditorCopy(pastedText)) {
        e.preventDefault()
        e.stopPropagation()
        notifyExternalPasteBlocked()
      }
    }

    container.addEventListener("copy", handleCopyCut, true)
    container.addEventListener("cut", handleCopyCut, true)
    container.addEventListener("paste", handlePaste, true)
  }, [])

  return (
    <div className="h-full min-h-0 overflow-hidden border border-[#2b2b2b] bg-[#1e1e1e] shadow-sm">
      <div className="flex h-full min-h-0 flex-row">
        <div
          className="relative h-full min-h-0 shrink-0"
          style={{ width: isExplorerCollapsed ? 44 : explorerWidth }}
        >
          <FileExplorer
            tree={tree}
            activeFileId={activeFileId}
            selectedNodeId={selectedNodeId}
            expandedFolders={expandedFolders}
            isCollapsed={isExplorerCollapsed}
            contextMenu={contextMenu}
            clipboard={clipboard}
            renamingNodeId={renamingNodeId}
            onToggleCollapse={onToggleExplorerCollapse}
            onToggleFolder={onToggleFolder}
            onSelectNode={onSelectNode}
            onOpenFile={onOpenFile}
            onAddFile={onAddFile}
            onAddFolder={onAddFolder}
            onRequestRename={onRequestRename}
            onRenameNode={onRenameNode}
            onDeleteNode={onDeleteNode}
            onContextMenu={onContextMenu}
            onCloseContextMenu={onCloseContextMenu}
            onCut={onCut}
            onCopy={onCopy}
            onPaste={onPaste}
            onDropNode={onDropNode}
            readOnly={readOnly}
          />
          {!isExplorerCollapsed && (
            <div
              onMouseDown={handleExplorerResize}
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-[#007acc]"
              title="Resize explorer"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <EditorTabs
            files={files}
            activeFile={activeFile}
            onSelectFile={onChangeFile}
            onDeleteFile={onDeleteFile}
          />

          <div className="min-h-0 flex-1">
            <Editor
              key={editorPath}
              height="100%"
              language={language}
              path={editorPath}
              value={files[activeFile] ?? ""}
              theme="vs-dark"
              onMount={handleEditorMount}
              onChange={(value) => {
                if (readOnly) return
                if (value !== undefined) {
                  onCodeChange(value)
                }
              }}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 14, bottom: 14 },
                readOnly: readOnly,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
