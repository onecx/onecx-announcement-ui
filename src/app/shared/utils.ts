import { AbstractControl, FormArray, FormGroup } from '@angular/forms'
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

  forceFormValidation(form: AbstractControl): void {
    if (form instanceof FormGroup || form instanceof FormArray) {
      for (const inner in form.controls) {
        const control = form.get(inner)
        control && Utils.forceFormValidation(control)
      }
    } else {
      form.markAsDirty()
      form.markAsTouched()
      form.updateValueAndValidity()
    }
  },

  dropDownSortItemsByLabel(a: SelectItem, b: SelectItem): number {
    return (a.label ? a.label.toUpperCase() : '').localeCompare(b.label ? b.label.toUpperCase() : '')
  },

  dropDownGetLabelByValue(ddArray: SelectItem[], val: string): string | undefined {
    const a = ddArray.find((item: SelectItem) => {
      return item?.value == val
    })
    return a?.label
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DropDownChangeEvent = MouseEvent & { value: any }
