import { nextTick } from 'vue'

export function useMarkdownEditor(contentRef: { value: string }, textareaRef: any) {
  function applyFormat(type: string) {
    const textarea = textareaRef.value?.$el.querySelector('textarea') || textareaRef.value
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = contentRef.value.substring(start, end)
    let replacement = ''
    let cursorOffset = 2
    let selectionLen = selected.length || 9

    switch (type) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`
        break
      case 'italic':
        replacement = `*${selected || 'italic text'}*`
        cursorOffset = 1
        break
      case 'h1':
        replacement = `\n# ${selected || 'Header'}\n`
        cursorOffset = 3
        break
      case 'h2':
        replacement = `\n## ${selected || 'Subheader'}\n`
        cursorOffset = 4
        break
      case 'list':
        replacement = `\n- ${selected || 'item'}`
        cursorOffset = 3
        break
      case 'wiki-link':
        replacement = `[[path/to/page | ${selected || 'Page Label'}]]`
        cursorOffset = 2
        selectionLen = 12
        break
    }

    contentRef.value = contentRef.value.substring(0, start) + replacement + contentRef.value.substring(end)
    
    nextTick(() => {
      textarea.focus()
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + selectionLen)
    })
  }

  return {
    applyFormat
  }
}
