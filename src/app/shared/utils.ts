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
  },

  mapDateStringsToDateRange(startDateFrom?: string, startDateTo?: string): Date[] | null {
    if (!startDateFrom) return null

    const dateFrom = new Date(startDateFrom)
    if (Number.isNaN(dateFrom.getTime())) return null
    if (!startDateTo) return [dateFrom]

    const dateTo = new Date(startDateTo)
    if (Number.isNaN(dateTo.getTime())) return null
    if (dateTo.getFullYear() === 3000) return [dateFrom]

    return [dateFrom, dateTo]
  },

  mapDateRangeToDateStrings(dateRange: Date[]) {
    let dateFrom!: Date
    let dateTo!: Date

    if (dateRange[1] == null || dateRange[0].toDateString() === dateRange[1].toDateString()) {
      dateFrom = dateRange[0]
      dateTo = new Date(dateFrom)
      dateTo.setFullYear(3000)
    } else {
      dateFrom = dateRange[0]
      dateTo = dateRange[1]
    }
    return [dateFrom.toISOString(), dateTo.toISOString()]
  }
}
