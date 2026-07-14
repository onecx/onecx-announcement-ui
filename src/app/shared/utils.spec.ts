import { SelectItem } from 'primeng/api'

import { Utils } from './utils'

describe('Utils', () => {
  describe('limitText', () => {
    it('should truncate text that exceeds the specified limit', () => {
      const result = Utils.limitText('hello', 4)

      expect(result).toEqual('hell...')
    })

    it('should return the original text if it does not exceed the limit', () => {
      const result = Utils.limitText('hello', 6)

      expect(result).toEqual('hello')
    })

    it('should return an empty string for undefined input', () => {
      const str: any = undefined
      const result = Utils.limitText(str, 5)

      expect(result).toEqual('')
    })
  })

  describe('copyToClipboard', () => {
    let writeTextSpy: jasmine.Spy

    beforeEach(() => {
      writeTextSpy = spyOn(navigator.clipboard, 'writeText')
    })

    it('should copy text to clipboard', () => {
      Utils.copyToClipboard('text')

      expect(writeTextSpy).toHaveBeenCalledWith('text')
    })
  })

  describe('getDisplayName', () => {
    it('should return label when name matches a value in the list', () => {
      const list: SelectItem[] = [{ label: 'Product A', value: 'prodA' }]

      expect(Utils.getDisplayName('prodA', list)).toBe('Product A')
    })

    it('should return defValue when name does not match any value', () => {
      const list: SelectItem[] = [{ label: 'Product A', value: 'prodA' }]

      expect(Utils.getDisplayName('unknown', list, 'fallback')).toBe('fallback')
    })

    it('should return undefined when name does not match and no defValue', () => {
      const list: SelectItem[] = [{ label: 'Product A', value: 'prodA' }]

      expect(Utils.getDisplayName('unknown', list)).toBeUndefined()
    })

    it('should return undefined when name is undefined', () => {
      expect(Utils.getDisplayName(undefined, [])).toBeUndefined()
    })

    it('should return undefined when list is undefined', () => {
      expect(Utils.getDisplayName('test', undefined)).toBeUndefined()
    })
  })

  describe('sortByLocale', () => {
    it('should sort strings based on locale', () => {
      const strings: string[] = ['str2', 'str1']

      const sortedStrings = strings.sort(Utils.sortByLocale)

      expect(sortedStrings[0]).toEqual('str1')
    })
  })

  describe('convertLineBreaks', () => {
    it('should convert line breaks to br', () => {
      const text = '123\r456'

      expect(Utils.convertLineBreaks(text)).toEqual('123<br/>456')
    })

    it('should ignore empty text', () => {
      const text = undefined

      expect(Utils.convertLineBreaks(text)).toEqual('')
    })
  })
})
