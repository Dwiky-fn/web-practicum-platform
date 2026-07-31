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
    }
  },
})
