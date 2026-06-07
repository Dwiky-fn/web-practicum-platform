import type React from "react"
import type { ClipboardAction, FileTreeNode } from "./types"

interface Props {
  x: number
  y: number
  targetNode: FileTreeNode | null
  canPaste: boolean
  clipboardAction?: ClipboardAction
  onNewFile: () => void
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
  onCut: () => void
  onCopy: () => void
  onPaste: () => void
}

export default function ExplorerContextMenu({
  x,
  y,
  targetNode,
  canPaste,
  clipboardAction,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onCut,
  onCopy,
  onPaste,
}: Props) {
  const hasTarget = !!targetNode

  return (
    <div
      className="fixed z-50 w-44 overflow-hidden rounded-md border border-[#454545] bg-[#252526] py-1 text-sm text-[#cccccc] shadow-2xl"
      style={{ left: x, top: y }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <ContextMenuButton onClick={onNewFile}>New File</ContextMenuButton>
      <ContextMenuButton onClick={onNewFolder}>New Folder</ContextMenuButton>
      <Divider />
      <ContextMenuButton disabled={!hasTarget} onClick={onRename}>Rename</ContextMenuButton>
      <ContextMenuButton disabled={!hasTarget} onClick={onDelete}>Delete</ContextMenuButton>
      <Divider />
      <ContextMenuButton disabled={!hasTarget} onClick={onCut}>Cut</ContextMenuButton>
      <ContextMenuButton disabled={!hasTarget} onClick={onCopy}>Copy</ContextMenuButton>
      <ContextMenuButton disabled={!canPaste} onClick={onPaste}>
        {clipboardAction === "cut" ? "Paste Move" : "Paste"}
      </ContextMenuButton>
    </div>
  )
}

function ContextMenuButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left hover:bg-[#094771] hover:text-white disabled:cursor-not-allowed disabled:text-[#666666] disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="my-1 border-t border-[#3c3c3c]" />
}
