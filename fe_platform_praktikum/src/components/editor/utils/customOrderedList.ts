import OrderedList from "@tiptap/extension-ordered-list"

export type ListStyleType = "decimal" | "lower-alpha" | "upper-alpha" | "lower-roman" | "upper-roman"

export const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: "decimal",
        parseHTML: (element) => element.style.listStyleType || element.getAttribute("type") || "decimal",
        renderHTML: (attributes) => {
          const style = attributes.listStyleType || "decimal"
          return {
            style: `list-style-type: ${style};`,
            "data-list-style": style,
          }
        },
      },
      start: {
        default: 1,
        parseHTML: (element) => {
          const val = element.getAttribute("start")
          return val ? parseInt(val, 10) : 1
        },
        renderHTML: (attributes) => {
          const val = Number(attributes.start || 1)
          if (!val || val === 1) return {}
          return {
            start: val,
          }
        },
      },
    }
  },
})
