import { AbstractControl, FormArray, FormGroup } from '@angular/forms'
import { SelectItem } from 'primeng/api'

export function limitText(text: string | undefined, limit: number): string {
  if (text) {
    return text.length < limit ? text : text.substring(0, limit) + '...'
  } else {
    return ''
  }
}

export function copyToClipboard(text?: string): void {
  if (text) navigator.clipboard.writeText(text)
}

/**
 *  FORM
 */
export function forceFormValidation(form: AbstractControl): void {
  if (form instanceof FormGroup || form instanceof FormArray) {
    for (const inner in form.controls) {
      const control = form.get(inner)
      control && forceFormValidation(control)
    }
  } else {
    form.markAsDirty()
    form.markAsTouched()
    form.updateValueAndValidity()
  }
}

/**
 *  DROPDOWN
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DropDownChangeEvent = MouseEvent & { value: any }

export function dropDownSortItemsByLabel(a: SelectItem, b: SelectItem): number {
  return (a.label ? (a.label as string).toUpperCase() : '').localeCompare(
    b.label ? (b.label as string).toUpperCase() : ''
  )
}
export function dropDownGetLabelByValue(ddArray: SelectItem[], val: string): string | undefined {
  const a = ddArray.find((item: SelectItem) => {
    return item?.value == val
  })
  return a?.label
}
export function sortByLocale(a: string, b: string): number {
  return a.toUpperCase().localeCompare(b.toUpperCase())
}

// display simple formatted text
export function convertLineBreaks(text?: string) {
  return text?.replace(/(?:\r\n|\r|\n)/g, '<br/>') ?? ''
}
