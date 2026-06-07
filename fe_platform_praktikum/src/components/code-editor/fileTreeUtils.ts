import type { FileTreeNode } from "./types"

export function createNodeId(): string {
  return `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function cloneTree(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.map(node => ({
    ...node,
    children: node.children ? cloneTree(node.children) : undefined,
  }))
}

export function findNodeById(nodes: FileTreeNode[], id: string | null): FileTreeNode | null {
  if (!id) return null

  for (const node of nodes) {
    if (node.id === id) return node

    const childMatch = findNodeById(node.children || [], id)
    if (childMatch) return childMatch
  }

  return null
}

export function findNodeByPath(nodes: FileTreeNode[], path: string): FileTreeNode | null {
  const segments = normalizePath(path).split("/").filter(Boolean)

  const walk = (items: FileTreeNode[], depth: number): FileTreeNode | null => {
    const segment = segments[depth]
    const node = items.find(item => item.name === segment)

    if (!node) return null
    if (depth === segments.length - 1) return node

    return walk(node.children || [], depth + 1)
  }

  return walk(nodes, 0)
}

export function addNodeToFolder(
  nodes: FileTreeNode[],
  folderId: string | null,
  nodeToAdd: FileTreeNode
): FileTreeNode[] {
  if (!folderId) return sortTree([...nodes, nodeToAdd])

  return nodes.map(node => {
    if (node.id === folderId && node.type === "folder") {
      return {
        ...node,
        children: sortTree([...(node.children || []), nodeToAdd]),
      }
    }

    return {
      ...node,
      children: node.children ? addNodeToFolder(node.children, folderId, nodeToAdd) : undefined,
    }
  })
}

export function removeNodeById(
  nodes: FileTreeNode[],
  id: string
): { tree: FileTreeNode[], removedNode: FileTreeNode | null } {
  let removedNode: FileTreeNode | null = null
  const nextTree: FileTreeNode[] = []

  nodes.forEach(node => {
    if (node.id === id) {
      removedNode = node
      return
    }

    const childResult = removeNodeById(node.children || [], id)

    if (childResult.removedNode) {
      removedNode = childResult.removedNode
      nextTree.push({
        ...node,
        children: childResult.tree,
      })
      return
    }

    nextTree.push(node)
  })

  return { tree: nextTree, removedNode }
}

export function updateNodeById(
  nodes: FileTreeNode[],
  id: string,
  updater: (node: FileTreeNode) => FileTreeNode
): FileTreeNode[] {
  return nodes.map(node => {
    if (node.id === id) return updater(node)

    return {
      ...node,
      children: node.children ? updateNodeById(node.children, id, updater) : undefined,
    }
  })
}

export function moveNode(
  nodes: FileTreeNode[],
  nodeId: string,
  targetFolderId: string | null
): FileTreeNode[] {
  if (nodeId === targetFolderId || isDescendant(nodes, nodeId, targetFolderId)) {
    return nodes
  }

  const targetSiblings = getChildrenForFolder(nodes, targetFolderId)
  const movingNode = findNodeById(nodes, nodeId)

  if (!movingNode || hasDuplicateName(targetSiblings, movingNode.name, nodeId)) return nodes

  const { tree, removedNode } = removeNodeById(nodes, nodeId)
  if (!removedNode) return nodes

  return addNodeToFolder(tree, targetFolderId, removedNode)
}

export function copyNode(
  nodes: FileTreeNode[],
  nodeId: string,
  targetFolderId: string | null
): FileTreeNode[] {
  const sourceNode = findNodeById(nodes, nodeId)
  const targetSiblings = getChildrenForFolder(nodes, targetFolderId)

  if (!sourceNode || hasDuplicateName(targetSiblings, sourceNode.name)) return nodes

  return addNodeToFolder(nodes, targetFolderId, cloneNodeWithNewIds(sourceNode))
}

export function isDescendant(
  nodes: FileTreeNode[],
  ancestorId: string,
  maybeDescendantId: string | null
): boolean {
  if (!maybeDescendantId) return false

  const ancestor = findNodeById(nodes, ancestorId)
  if (!ancestor) return false

  return !!findNodeById(ancestor.children || [], maybeDescendantId)
}

export function treeToFiles(nodes: FileTreeNode[], parentPath = ""): Record<string, string> {
  return nodes.reduce<Record<string, string>>((acc, node) => {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name

    if (node.type === "file") {
      acc[path] = node.content || ""
      return acc
    }

    return {
      ...acc,
      ...treeToFiles(node.children || [], path),
    }
  }, {})
}

export function buildTreeFromFiles(files: Record<string, string>): FileTreeNode[] {
  const root: FileTreeNode[] = []

  Object.entries(files).forEach(([path, content]) => {
    const parts = normalizePath(path).split("/").filter(Boolean)
    let siblings = root

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1
      let node = siblings.find(item => item.name === part)

      if (!node) {
        node = {
          id: createNodeId(),
          name: part,
          type: isFile ? "file" : "folder",
          content: isFile ? content : undefined,
          children: isFile ? undefined : [],
        }
        siblings.push(node)
      }

      if (isFile) {
        node.content = content
      } else {
        node.children = node.children || []
        siblings = node.children
      }
    })
  })

  return sortTree(root)
}

export function getNodePath(nodes: FileTreeNode[], id: string, parentPath = ""): string | null {
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name

    if (node.id === id) return path

    const childPath = getNodePath(node.children || [], id, path)
    if (childPath) return childPath
  }

  return null
}

export function findFirstFilePath(nodes: FileTreeNode[], parentPath = ""): string | null {
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name

    if (node.type === "file") return path

    const childPath = findFirstFilePath(node.children || [], path)
    if (childPath) return childPath
  }

  return null
}

export function updateFileContentByPath(
  nodes: FileTreeNode[],
  path: string,
  content: string
): FileTreeNode[] {
  const node = findNodeByPath(nodes, path)

  if (!node) return nodes

  return updateNodeById(nodes, node.id, current => ({
    ...current,
    content,
  }))
}

export function getChildrenForFolder(
  nodes: FileTreeNode[],
  folderId: string | null
): FileTreeNode[] {
  if (!folderId) return nodes

  const folder = findNodeById(nodes, folderId)

  return folder?.type === "folder" ? folder.children || [] : []
}

export function hasDuplicateName(
  siblings: FileTreeNode[],
  name: string,
  ignoredId?: string
): boolean {
  return siblings.some(node => node.id !== ignoredId && node.name === name)
}

export function getFolderIdFromTarget(nodes: FileTreeNode[], targetId: string | null): string | null {
  const target = findNodeById(nodes, targetId)

  if (!target) return null

  return target.type === "folder" ? target.id : findParentId(nodes, target.id)
}

export function findParentId(nodes: FileTreeNode[], childId: string): string | null {
  for (const node of nodes) {
    if (node.children?.some(child => child.id === childId)) return node.id

    const nestedParentId = findParentId(node.children || [], childId)
    if (nestedParentId) return nestedParentId
  }

  return null
}

export function makeNode(
  name: string,
  type: "file" | "folder",
  content = ""
): FileTreeNode {
  return {
    id: createNodeId(),
    name,
    type,
    content: type === "file" ? content : undefined,
    children: type === "folder" ? [] : undefined,
  }
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
}

export function sortTree(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes]
    .map(node => ({
      ...node,
      children: node.children ? sortTree(node.children) : undefined,
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1

      return a.name.localeCompare(b.name)
    })
}

function cloneNodeWithNewIds(node: FileTreeNode): FileTreeNode {
  return {
    ...node,
    id: createNodeId(),
    children: node.children?.map(cloneNodeWithNewIds),
  }
}

