import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  Pencil,
  Trash2,
} from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import type { FileTreeNode } from "./types"

interface Props {
  node: FileTreeNode
  activeFileId: string | null
  selectedNodeId: string | null
  depth?: number
  expandedFolders: Set<string>
  renamingNodeId: string | null
  onToggleFolder: (id: string) => void
  onSelectNode: (node: FileTreeNode) => void
  onOpenFile: (node: FileTreeNode) => void
  onRequestRename: (node: FileTreeNode) => void
  onRename: (node: FileTreeNode, nextName: string) => void
  onDelete: (node: FileTreeNode) => void
  onContextMenu: (event: React.MouseEvent, node: FileTreeNode) => void
  onDropNode: (draggedNodeId: string, targetNodeId: string) => void
}

export default function FileTreeItem({
  node,
  activeFileId,
  selectedNodeId,
  depth = 0,
  expandedFolders,
  renamingNodeId,
  onToggleFolder,
  onSelectNode,
  onOpenFile,
  onRequestRename,
  onRename,
  onDelete,
  onContextMenu,
  onDropNode,
}: Props) {
  const [draftName, setDraftName] = useState(node.name)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const isFolder = node.type === "folder"
  const isExpanded = expandedFolders.has(node.id)
  const isActive = node.type === "file" && activeFileId === node.id
  const isSelected = selectedNodeId === node.id
  const isRenaming = renamingNodeId === node.id
  const hasChildren = !!node.children?.length

  useEffect(() => {
    if (isRenaming) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftName(node.name)
    }
  }, [isRenaming, node.name])

  const submitRename = () => {
    const nextName = draftName.trim()

    if (nextName) {
      onRename(node, nextName)
    }
  }

  return (
    <div>
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("application/x-file-tree-node", node.id)
          event.dataTransfer.effectAllowed = "move"
        }}
        onDragOver={(event) => {
          if (!isFolder) return

          event.preventDefault()
          event.dataTransfer.dropEffect = "move"
          setIsDropTarget(true)
        }}
        onDragLeave={() => setIsDropTarget(false)}
        onDrop={(event) => {
          if (!isFolder) return

          event.preventDefault()
          event.stopPropagation()
          setIsDropTarget(false)
          const draggedNodeId = event.dataTransfer.getData("application/x-file-tree-node")

          if (draggedNodeId) {
            onDropNode(draggedNodeId, node.id)
          }
        }}
        className={`group flex h-7 items-center gap-1 pr-2 text-sm ${
          isActive
            ? "bg-[#37373d] text-white"
            : isSelected
              ? "bg-[#2a2d2e] text-white"
              : "text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
        } ${isDropTarget ? "outline outline-1 outline-[#007acc]" : ""}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={(event) => {
          event.stopPropagation()
          onSelectNode(node)

          if (isFolder) {
            onToggleFolder(node.id)
            return
          }

          onOpenFile(node)
        }}
        onContextMenu={(event) => onContextMenu(event, node)}
      >
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center text-[#858585]"
          onClick={(event) => {
            if (!isFolder) return

            event.stopPropagation()
            onToggleFolder(node.id)
          }}
          aria-label={isFolder ? `${isExpanded ? "Close" : "Open"} ${node.name}` : undefined}
        >
          {isFolder && (
            isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />
          )}
        </button>

        {isFolder ? (
          isExpanded ? (
            <FolderOpen size={16} className="shrink-0 text-[#dcb67a]" />
          ) : (
            <Folder size={16} className="shrink-0 text-[#dcb67a]" />
          )
        ) : (
          <FileCode2 size={16} className="shrink-0 text-[#75beff]" />
        )}

        {isRenaming ? (
          <input
            autoFocus
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={submitRename}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitRename()
              }

              if (event.key === "Escape") {
                onRename(node, node.name)
              }
            }}
            className="min-w-0 flex-1 border border-[#007acc] bg-[#3c3c3c] px-1 py-0.5 text-xs text-white outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate" title={node.name}>
            {node.name}
          </span>
        )}

        <div className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onRequestRename(node)
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
            aria-label={`Rename ${node.name}`}
            title="Rename"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDelete(node)
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
            aria-label={`Delete ${node.name}`}
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {isFolder && isExpanded && hasChildren && (
        <div>
          {node.children?.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              activeFileId={activeFileId}
              selectedNodeId={selectedNodeId}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              renamingNodeId={renamingNodeId}
              onToggleFolder={onToggleFolder}
              onSelectNode={onSelectNode}
              onOpenFile={onOpenFile}
              onRequestRename={onRequestRename}
              onRename={onRename}
              onDelete={onDelete}
              onContextMenu={onContextMenu}
              onDropNode={onDropNode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
