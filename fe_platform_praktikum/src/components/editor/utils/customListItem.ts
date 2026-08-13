import ListItem from '@tiptap/extension-list-item'

export const CustomListItem = ListItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      needsCode: {
        default: true,
        parseHTML: element => element.hasAttribute('data-needs-code') ? element.getAttribute('data-needs-code') === 'true' : true,
        renderHTML: attributes => {
          return {
            'data-needs-code': attributes.needsCode ? 'true' : 'false',
          }
        },
      },
    }
  },
})
