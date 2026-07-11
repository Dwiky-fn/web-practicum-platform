import { useEffect, useMemo, useState } from "react"
import CodeEditorLayout from "./CodeEditorLayout"
import {
  addNodeToFolder,
  buildTreeFromFiles,
  copyNode,
  findFirstFilePath,
  findNodeByPath,
  findParentId,
  getChildrenForFolder,
  getFolderIdFromTarget,
  getNodePath,
  hasDuplicateName,
  makeNode,
  moveNode,
  removeNodeById,
  treeToFiles,
  updateFileContentByPath,
  updateNodeById,
} from "./fileTreeUtils"
import type { ExplorerClipboard, FileTreeNode, TreeContextMenuState } from "./types"

interface Props {
  language: string
  files: Record<string, string>
  activeFile: string
  editorPath: string
  onChangeFile: (fileName: string) => void
  onCodeChange: (value: string) => void
  onFilesChange: (files: Record<string, string>, activeFile?: string) => void
  getNewFileName?: (files: Record<string, string>) => string
  readOnly?: boolean
}

function getFileName(path: string): string {
  return path.split("/").pop() || path
}

function getFileSignature(files: Record<string, string>): string {
  return Object.keys(files).sort().join("|")
}

function hasSameFileContent(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  if (leftKeys.length !== rightKeys.length) return false

  return leftKeys.every(key => left[key] === right[key])
}

function makeUniqueName(siblings: FileTreeNode[], baseName: string): string {
  if (!hasDuplicateName(siblings, baseName)) return baseName

  const dotIndex = baseName.lastIndexOf(".")
  const nameWithoutExtension = dotIndex > 0 ? baseName.slice(0, dotIndex) : baseName
  const extension = dotIndex > 0 ? baseName.slice(dotIndex) : ""
  let index = 2

  while (hasDuplicateName(siblings, `${nameWithoutExtension}${index}${extension}`)) {
    index += 1
  }

  return `${nameWithoutExtension}${index}${extension}`
}

function isValidNodeName(name: string): boolean {
  return !!name.trim() && !/[\\/]/.test(name)
}

export default function CodeEditorPanel({
  language,
  files,
  activeFile,
  editorPath,
  onChangeFile,
  onCodeChange,
  onFilesChange,
  getNewFileName,
  readOnly = false,
}: Props) {
  const [tree, setTree] = useState<FileTreeNode[]>(() => buildTreeFromFiles(files))
  const [fileSignature, setFileSignature] = useState(() => getFileSignature(files))
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false)
  const [contextMenu, setContextMenu] = useState<TreeContextMenuState | null>(null)
  const [clipboard, setClipboard] = useState<ExplorerClipboard | null>(null)
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null)

  const activeFileNode = useMemo(() => findNodeByPath(tree, activeFile), [activeFile, tree])
  const activeFileId = activeFileNode?.id || null

  const visibleExpandedFolders = useMemo(() => {
    const next = new Set(expandedFolders)
    const activePathParts = activeFile.split("/")
    let siblings = tree

    activePathParts.slice(0, -1).forEach((part) => {
      const folder = siblings.find(node => node.type === "folder" && node.name === part)

      if (folder) {
        next.add(folder.id)
        siblings = folder.children || []
      }
    })

    return next
  }, [activeFile, expandedFolders, tree])

  useEffect(() => {
    const nextSignature = getFileSignature(files)

    if (nextSignature === fileSignature) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTree(buildTreeFromFiles(files))
    setFileSignature(nextSignature)
    setSelectedNodeId(null)
    setRenamingNodeId(null)
  }, [fileSignature, files])

  useEffect(() => {
    const nextSignature = getFileSignature(files)

    if (nextSignature !== fileSignature) return

    setTree(currentTree => {
      const currentFiles = treeToFiles(currentTree)
      if (hasSameFileContent(currentFiles, files)) return currentTree

      return Object.entries(files).reduce(
        (nextTree, [filePath, content]) => updateFileContentByPath(nextTree, filePath, content),
        currentTree
      )
    })
  }, [fileSignature, files])

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null)

    window.addEventListener("click", closeContextMenu)

    return () => window.removeEventListener("click", closeContextMenu)
  }, [])

  const commitTree = (nextTree: FileTreeNode[], nextActiveFile?: string | null) => {
    const nextFiles = treeToFiles(nextTree)
    const resolvedActiveFile = nextActiveFile || activeFile
    const safeActiveFile = nextFiles[resolvedActiveFile] !== undefined
      ? resolvedActiveFile
      : findFirstFilePath(nextTree)

    setTree(nextTree)
    setFileSignature(getFileSignature(nextFiles))
    onFilesChange(nextFiles, safeActiveFile || undefined)

    if (safeActiveFile) {
      onChangeFile(safeActiveFile)
    }
  }

  const getTargetFolderId = (targetId?: string | null) => (
    getFolderIdFromTarget(tree, targetId === undefined ? selectedNodeId : targetId)
  )

  const handleAddFile = (targetId?: string | null) => {
    const targetFolderId = getTargetFolderId(targetId)
    const siblings = getChildrenForFolder(tree, targetFolderId)
    const baseName = getNewFileName?.(treeToFiles(tree)) || "untitled.txt"
    const newNode = makeNode(makeUniqueName(siblings, getFileName(baseName)), "file", "")
    const nextTree = addNodeToFolder(tree, targetFolderId, newNode)
    const nextPath = getNodePath(nextTree, newNode.id)

    if (targetFolderId) {
      setExpandedFolders(prev => new Set(prev).add(targetFolderId))
    }

    setSelectedNodeId(newNode.id)
    setRenamingNodeId(newNode.id)
    commitTree(nextTree, nextPath)
  }

  const handleAddFolder = (targetId?: string | null) => {
    const targetFolderId = getTargetFolderId(targetId)
    const siblings = getChildrenForFolder(tree, targetFolderId)
    const newNode = makeNode(makeUniqueName(siblings, "folder"), "folder")
    const nextTree = addNodeToFolder(tree, targetFolderId, newNode)

    if (targetFolderId) {
      setExpandedFolders(prev => new Set(prev).add(targetFolderId))
    }

    setSelectedNodeId(newNode.id)
    setRenamingNodeId(newNode.id)
    commitTree(nextTree)
  }

  const handleRenameNode = (node: FileTreeNode, nextName: string) => {
    const trimmedName = nextName.trim()
    const parentId = findParentId(tree, node.id)
    const siblings = getChildrenForFolder(tree, parentId)

    setRenamingNodeId(null)

    if (!isValidNodeName(trimmedName)) return
    if (hasDuplicateName(siblings, trimmedName, node.id)) return

    const nextTree = updateNodeById(tree, node.id, current => ({
      ...current,
      name: trimmedName,
    }))
    const nextActiveFile = activeFileId ? getNodePath(nextTree, activeFileId) : activeFile

    commitTree(nextTree, nextActiveFile)
  }

  const handleDeleteNode = (node: FileTreeNode) => {
    const { tree: nextTree } = removeNodeById(tree, node.id)

    if (Object.keys(treeToFiles(nextTree)).length === 0) return

    const nextActiveFile = activeFileId === node.id || !activeFileId || !getNodePath(nextTree, activeFileId)
      ? findFirstFilePath(nextTree)
      : getNodePath(nextTree, activeFileId)

    setSelectedNodeId(null)
    commitTree(nextTree, nextActiveFile)
  }

  const handleMoveNode = (draggedNodeId: string, targetNodeId: string | null) => {
    const targetFolderId = getTargetFolderId(targetNodeId)
    const nextTree = moveNode(tree, draggedNodeId, targetFolderId)

    if (nextTree === tree) return

    const nextActiveFile = activeFileId ? getNodePath(nextTree, activeFileId) : activeFile

    if (targetFolderId) {
      setExpandedFolders(prev => new Set(prev).add(targetFolderId))
    }

    commitTree(nextTree, nextActiveFile)
  }

  const handlePaste = (targetNodeId?: string | null) => {
    if (!clipboard) return

    const targetFolderId = getTargetFolderId(targetNodeId)
    const nextTree = clipboard.action === "copy"
      ? copyNode(tree, clipboard.nodeId, targetFolderId)
      : moveNode(tree, clipboard.nodeId, targetFolderId)

    if (nextTree === tree) return

    const nextActiveFile = activeFileId ? getNodePath(nextTree, activeFileId) : activeFile

    if (targetFolderId) {
      setExpandedFolders(prev => new Set(prev).add(targetFolderId))
    }

    if (clipboard.action === "cut") {
      setClipboard(null)
    }

    commitTree(nextTree, nextActiveFile)
  }

  return (
    <CodeEditorLayout
      language={language}
      files={treeToFiles(tree)}
      activeFile={activeFile}
      activeFileId={activeFileId}
      editorPath={editorPath}
      tree={tree}
      expandedFolders={visibleExpandedFolders}
      selectedNodeId={selectedNodeId}
      isExplorerCollapsed={isExplorerCollapsed}
      contextMenu={contextMenu}
      clipboard={clipboard}
      renamingNodeId={renamingNodeId}
      onToggleExplorerCollapse={() => setIsExplorerCollapsed(prev => !prev)}
      onToggleFolder={(id) => {
        setExpandedFolders(prev => {
          const next = new Set(prev)

          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }

          return next
        })
      }}
      onSelectNode={(node) => setSelectedNodeId(node?.id || null)}
      onOpenFile={(node) => {
        const path = getNodePath(tree, node.id)

        if (path) {
          onChangeFile(path)
        }
      }}
      onChangeFile={onChangeFile}
      onCodeChange={(value) => {
        if (readOnly) return
        const nextTree = updateFileContentByPath(tree, activeFile, value)

        setTree(nextTree)
        onCodeChange(value)
      }}
      onAddFile={handleAddFile}
      onAddFolder={handleAddFolder}
      onRequestRename={(node) => {
        setSelectedNodeId(node.id)
        setRenamingNodeId(node.id)
      }}
      onRenameNode={handleRenameNode}
      onDeleteNode={handleDeleteNode}
      onContextMenu={(event, node) => {
        event.preventDefault()
        event.stopPropagation()
        setSelectedNodeId(node?.id || null)
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          targetId: node?.id || null,
        })
      }}
      onCloseContextMenu={() => setContextMenu(null)}
      onCut={(node) => setClipboard({ action: "cut", nodeId: node.id })}
      onCopy={(node) => setClipboard({ action: "copy", nodeId: node.id })}
      onPaste={handlePaste}
      onDropNode={handleMoveNode}
      onDeleteFile={(fileName) => {
        const node = findNodeByPath(tree, fileName)

        if (node) {
          handleDeleteNode(node)
        }
      }}
      readOnly={readOnly}
    />
  )
}
