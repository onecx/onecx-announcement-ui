import { SelectItem } from 'primeng/api'

// This object encapsulates functions because ...
//  ...Jasmine has problems to spying direct imported functions
export const Utils = {
  limitText(text: string | undefined, limit: number): string {
    if (text) {
      return text.length < limit ? text : text.substring(0, limit) + '...'
    } else {
      return ''
    }
  },

  copyToClipboard(text?: string): void {
    if (text) navigator.clipboard.writeText(text)
  },

  getDisplayName(name: string | undefined, list: SelectItem[] | undefined, defValue?: string): string | undefined {
    if (name) return list?.find((item) => item.value === name)?.label ?? defValue
    return undefined
  },

  sortByLocale(a: string, b: string): number {
    return a.toUpperCase().localeCompare(b.toUpperCase())
  },

  convertLineBreaks(text?: string) {
    return text?.replaceAll(/(?:\r\n|\r|\n)/g, '<br/>') ?? ''
  }
}
