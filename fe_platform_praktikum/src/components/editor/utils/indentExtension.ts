import { Extension } from "@tiptap/core"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

export const IndentExtension = Extension.create({
  name: "indent",

  addOptions() {
    return {
      types: ["paragraph", "heading", "listItem"],
      minLevel: 0,
      maxLevel: 8,
      step: 24, // px per level
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indentLevel: {
            default: 0,
            parseHTML: (element) => {
              const marginLeft = element.style.marginLeft || element.style.paddingLeft
              if (!marginLeft) return 0
              const value = parseInt(marginLeft, 10)
              return Math.round(value / 24)
            },
            renderHTML: (attributes) => {
              const level = attributes.indentLevel || 0
              if (level <= 0) return {}
              return {
                style: `margin-left: ${level * 24}px;`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false

          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentLevel = node.attrs.indentLevel || 0
              if (currentLevel < this.options.maxLevel) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indentLevel: currentLevel + 1,
                })
                changed = true
              }
            }
          })

          if (changed && dispatch) {
            dispatch(tr)
          }

          return changed
        },

      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false

          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentLevel = node.attrs.indentLevel || 0
              if (currentLevel > this.options.minLevel) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indentLevel: currentLevel - 1,
                })
                changed = true
              }
            }
          })

          if (changed && dispatch) {
            dispatch(tr)
          }

          return changed
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
          return editor.commands.sinkListItem("listItem")
        }
        return editor.commands.indent()
      },
      "Shift-Tab": ({ editor }) => {
        if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
          return editor.commands.liftListItem("listItem")
        }
        return editor.commands.outdent()
      },
    }
  },
})
