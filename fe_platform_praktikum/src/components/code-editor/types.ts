export type FileTreeNodeType = "file" | "folder"

export interface FileTreeNode {
  id: string
  name: string
  type: FileTreeNodeType
  content?: string
  children?: FileTreeNode[]
}

export interface TreeContextMenuState {
  x: number
  y: number
  targetId: string | null
}

export type ClipboardAction = "cut" | "copy"

export interface ExplorerClipboard {
  action: ClipboardAction
  nodeId: string
}

