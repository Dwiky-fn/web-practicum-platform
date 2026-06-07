import { ChevronLeft, Files, FilePlus2, FolderPlus } from "lucide-react"
import type React from "react"
import ExplorerContextMenu from "./ExplorerContextMenu"
import FileTreeItem from "./FileTreeItem"
import type { ExplorerClipboard, FileTreeNode, TreeContextMenuState } from "./types"
import { findNodeById } from "./fileTreeUtils"

interface Props {
  tree: FileTreeNode[]
  activeFileId: string | null
  selectedNodeId: string | null
  expandedFolders: Set<string>
  isCollapsed: boolean
  contextMenu: TreeContextMenuState | null
  clipboard: ExplorerClipboard | null
  renamingNodeId: string | null
  onToggleCollapse: () => void
  onToggleFolder: (id: string) => void
  onSelectNode: (node: FileTreeNode | null) => void
  onOpenFile: (node: FileTreeNode) => void
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
}

export default function FileExplorer({
  tree,
  activeFileId,
  selectedNodeId,
  expandedFolders,
  isCollapsed,
  contextMenu,
  clipboard,
  renamingNodeId,
  onToggleCollapse,
  onToggleFolder,
  onSelectNode,
  onOpenFile,
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
}: Props) {
  if (isCollapsed) {
    return (
      <aside className="flex h-full min-h-0 w-11 shrink-0 flex-col items-center border-r border-[#2b2b2b] bg-[#252526] py-2 text-[#cccccc]">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-8 w-8 items-center justify-center rounded text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
          aria-label="Expand explorer"
          title="Expand explorer"
        >
          <Files size={18} />
        </button>
      </aside>
    )
  }

  const contextTarget = contextMenu ? findNodeById(tree, contextMenu.targetId) : null

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-r border-[#2b2b2b] bg-[#252526] text-[#cccccc]">
      <div className="flex h-10 items-center justify-between border-b border-[#2b2b2b] px-3">
        <span className="text-xs font-semibold tracking-[0.14em] text-[#bbbbbb]">
          EXPLORER
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAddFile(selectedNodeId)}
            className="flex h-7 w-7 items-center justify-center rounded text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
            aria-label="New file"
            title="New file"
          >
            <FilePlus2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => onAddFolder(selectedNodeId)}
            className="flex h-7 w-7 items-center justify-center rounded text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
            aria-label="New folder"
            title="New folder"
          >
            <FolderPlus size={15} />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
            aria-label="Collapse explorer"
            title="Collapse explorer"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto py-2"
        onClick={() => onSelectNode(null)}
        onContextMenu={(event) => onContextMenu(event, null)}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = "move"
        }}
        onDrop={(event) => {
          event.preventDefault()
          const draggedNodeId = event.dataTransfer.getData("application/x-file-tree-node")

          if (draggedNodeId) {
            onDropNode(draggedNodeId, null)
          }
        }}
      >
        {tree.length > 0 ? (
          tree.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
              activeFileId={activeFileId}
              selectedNodeId={selectedNodeId}
              expandedFolders={expandedFolders}
              renamingNodeId={renamingNodeId}
              onToggleFolder={onToggleFolder}
              onSelectNode={onSelectNode}
              onOpenFile={onOpenFile}
              onRequestRename={onRequestRename}
              onRename={onRenameNode}
              onDelete={onDeleteNode}
              onContextMenu={onContextMenu}
              onDropNode={onDropNode}
            />
          ))
        ) : (
          <div className="px-3 py-4 text-xs text-[#858585]">
            Belum ada file.
          </div>
        )}
      </div>

      {contextMenu && (
        <ExplorerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetNode={contextTarget}
          canPaste={!!clipboard}
          clipboardAction={clipboard?.action}
          onNewFile={() => {
            onAddFile(contextMenu.targetId)
            onCloseContextMenu()
          }}
          onNewFolder={() => {
            onAddFolder(contextMenu.targetId)
            onCloseContextMenu()
          }}
          onRename={() => {
            if (contextTarget) onRequestRename(contextTarget)
            onCloseContextMenu()
          }}
          onDelete={() => {
            if (contextTarget) onDeleteNode(contextTarget)
            onCloseContextMenu()
          }}
          onCut={() => {
            if (contextTarget) onCut(contextTarget)
            onCloseContextMenu()
          }}
          onCopy={() => {
            if (contextTarget) onCopy(contextTarget)
            onCloseContextMenu()
          }}
          onPaste={() => {
            onPaste(contextMenu.targetId)
            onCloseContextMenu()
          }}
        />
      )}
    </aside>
  )
}
