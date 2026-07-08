import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { DataSortDirection, RowListGridData } from '@onecx/angular-accelerator'

import { Announcement, AnnouncementAssignments, AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { AnnouncementSearchComponent, ExtendedColumn } from './announcement-search.component'

const itemData: any = [
  {
    modificationCount: 0,
    id: '9abc8923-6200-4346-858e-cac3ce62e1a6',
    title: 'Anncmt1',
    content: null,
    type: 'INFO',
    priority: 'NORMAL',
    status: 'INACTIVE',
    startDate: '2024-07-17T13:18:11Z',
    endDate: null,
    productName: 'OneCX IAM',
    workspaceName: null
  },
  {
    modificationCount: 0,
    id: '28fe929a-424b-4c6d-8cd1-abf8e87104d5',
    title: 'Anncmt1 ADMIN',
    content: null,
    type: 'INFO',
    priority: 'NORMAL',
    status: 'INACTIVE',
    startDate: '2024-07-16T13:42:40Z',
    endDate: null,
    productName: null,
    workspaceName: 'ADMIN'
  },
  {
    modificationCount: 0,
    id: 'ff5fbfd7-da53-47e0-8898-e6a4e7c3125e',
    title: 'Anncmt2',
    content: null,
    type: 'INFO',
    priority: 'NORMAL',
    status: 'INACTIVE',
    startDate: '2024-07-16T13:42:54Z',
    endDate: null,
    productName: 'OneCX Permission',
    workspaceName: 'WORK'
  }
]

describe('AnnouncementSearchComponent', () => {
  let component: AnnouncementSearchComponent
  let fixture: ComponentFixture<AnnouncementSearchComponent>

  const defaultLang = 'en'
  const langSubject = new BehaviorSubject<string>(defaultLang)
  const hasPermissionSpy = jasmine.createSpy('hasPermission').and.returnValue(Promise.resolve(true))
  const mockUserService = {
    lang$: langSubject,
    hasPermission: hasPermissionSpy
  }
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error', 'info'])
  const apiServiceSpy = {
    searchAnnouncements: jasmine.createSpy('searchAnnouncements').and.returnValue(of({})),
    getAllAnnouncementAssignments: jasmine.createSpy('getAllAnnouncementAssignments').and.returnValue(of({}))
  }

  function initTestComponent() {
    fixture = TestBed.createComponent(AnnouncementSearchComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        AnnouncementSearchComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage(defaultLang)
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: mockUserService },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy }
      ]
    })
      .overrideComponent(AnnouncementSearchComponent, {
        set: {
          template: '',
          imports: []
        }
      })
      .compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()
  })

  afterEach(() => {
    langSubject.next(defaultLang)
    hasPermissionSpy.calls.reset()
    hasPermissionSpy.and.returnValue(Promise.resolve(true))
    // to spy data: reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    apiServiceSpy.searchAnnouncements.calls.reset()
    apiServiceSpy.getAllAnnouncementAssignments.calls.reset()
    // to spy data: refill with neutral data
    apiServiceSpy.searchAnnouncements.and.returnValue(of({}))
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of({}))
  })

  describe('construction', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })

    it('should call OnInit and populate displayed column keys and actions', () => {
      component.ngOnInit()

      expect(component.displayedColumnKeys[0]).toEqual(component.dataViewColumns[0].field)
    })
  })

  describe('page actions', () => {
    it('should open create dialog', async () => {
      spyOn(component, 'onDetail')

      component.ngOnInit()

      component.actions$?.subscribe((action) => {
        action[0].actionCallback()
      })

      await Promise.resolve()

      expect(component.onDetail).toHaveBeenCalled()
    })

    it('should deny create dialog if permission is missing', async () => {
      hasPermissionSpy.and.returnValue(Promise.resolve(false))
      spyOn(component, 'onDetail')

      component.ngOnInit()

      component.actions$?.subscribe((action) => {
        action[0].actionCallback()
      })

      await Promise.resolve()

      expect(component.onDetail).not.toHaveBeenCalled()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.ANNOUNCEMENT' })
    })
  })

  describe('search', () => {
    it('should search without search criteria', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: itemData }))

      component.onSearch({})

      component.data$!.subscribe({
        next: (data) => {
          expect(data).toEqual(itemData)
          done()
        },
        error: done.fail
      })
    })

    it('should fallback to empty stream when response has no stream property', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: [] }))

      component.onSearch({})

      component.data$!.subscribe({
        next: (data) => {
          expect(data).toEqual([])
          done()
        },
        error: done.fail
      })
      expect(msgServiceSpy.info).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.NO_RESULTS' })
    })

    it('should search assigned to one workspace', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: [itemData[1]] }))
      component.criteria = { workspaceName: 'ADMIN' }

      component.onSearch(component.criteria, false)

      component.data$!.subscribe({
        next: (data) => {
          expect(data!.length).toBe(1)
          expect(data![0]).toEqual(itemData[1])
          done()
        },
        error: done.fail
      })
    })

    it('should reset search criteria and empty items for the next search', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: [itemData[1]] }))
      component.criteria = { workspaceName: 'ADMIN' }

      component.onSearch(component.criteria, true)

      component.data$!.subscribe({
        next: (data) => {
          expect(data!.length).toBe(1)
          expect(data![0]).toEqual(itemData[1])
          done()
        },
        error: done.fail
      })

      component.onCriteriaReset()

      expect(component.criteria).toEqual({})
    })

    it('should display an error message if the search fails', (done) => {
      const errorResponse = { status: '403', statusText: 'Not authorized' }
      apiServiceSpy.searchAnnouncements.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component.onSearch({})

      component.data$!.subscribe({
        next: (data) => {
          expect(data!.length).toBe(0)
          done()
        },
        error: done.fail
      })
      expect(console.error).toHaveBeenCalledWith('searchAnnouncements', errorResponse)
      expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.ANNOUNCEMENTS')
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.SEARCH_FAILED' })
    })

    it('should search with newly defined criteria', () => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of([]))
      component.criteria = { workspaceName: 'workspaceName', title: 'title' }
      const newCriteria = { workspaceName: '', productName: '', title: 'new title' }
      const reuseCriteria = false

      component.onSearch(newCriteria, reuseCriteria)

      expect(component.criteria).toEqual(newCriteria)
    })

    it('should search with wildcard * in title', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: itemData }))
      component.criteria = { title: 'A*' }
      const reuseCriteria = false

      component.onSearch(component.criteria, reuseCriteria)

      component.data$!.subscribe({
        next: (data) => {
          expect(data).toEqual(itemData)
          done()
        },
        error: done.fail
      })
    })

    it('should no display name if no name', () => {
      const dn = component.getDisplayName(undefined, undefined)

      expect(dn).toBeUndefined()
    })

    it('should return display name if found in list', () => {
      const list = [{ label: 'Product A', value: 'prodA' }]

      expect(component.getDisplayName('prodA', list)).toBe('Product A')
    })

    it('should return defValue if name not found in list', () => {
      const list = [{ label: 'Product A', value: 'prodA' }]

      expect(component.getDisplayName('unknown', list, 'fallback')).toBe('fallback')
    })

    it('should return undefined if name not found and no defValue', () => {
      const list = [{ label: 'Product A', value: 'prodA' }]

      expect(component.getDisplayName('unknown', list)).toBeUndefined()
    })
  })

  describe('sort', () => {
    it('should update sort field and direction', () => {
      component.onSortChange({ sortColumn: 'title', sortDirection: DataSortDirection.ASCENDING })

      expect(component.sortField).toBe('title')
      expect(component.sortDirection).toBe(DataSortDirection.ASCENDING)
    })
  })

  describe('META data: load used products/workspaces', () => {
    it('should get all items assigned to products/workspaces - successful', (done) => {
      const assignments: AnnouncementAssignments = { productNames: ['prod1'], workspaceNames: ['w1'] }
      apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of(assignments))

      component.ngOnInit()

      component.usedLists$?.subscribe({
        next: (data) => {
          expect(data.workspaces).toContain({ label: 'w1', value: 'w1' })
          expect(data.products).toContain({ label: 'prod1', value: 'prod1' })
          done()
        }
      })
    })

    it('should get all items assigned to products/workspaces - failed', (done) => {
      const errorResponse = { status: '404', statusText: 'An error occur' }
      apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.ngOnInit()

      component.usedLists$?.subscribe({
        next: (data) => {
          expect(data.workspaces).toEqual([])
          expect(data.products).toEqual([])
          done()
        },
        error: done.fail
      })
      expect(console.error).toHaveBeenCalledOnceWith('getAllAnnouncementAssignments', errorResponse)
    })
  })

  describe('META data: load all meta data together and check enrichments', () => {
    it('should get all existing products and workspaces - successful enrichments', (done) => {
      const workspaces = [{ name: 'ws', displayName: 'Workspace' }]
      component.wdSlotEmitter.emit(workspaces)
      const products = [{ name: 'product', displayName: 'Product' }]
      component.pdSlotEmitter.emit(products)
      // product and workspace are used...
      const assignments: AnnouncementAssignments = {
        productNames: ['product', 'unknown'],
        workspaceNames: ['ws', 'unknown']
      }
      apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of(assignments))

      component.ngOnInit()

      component.metaData$.subscribe({
        next: (meta) => {
          if (meta) {
            expect(meta.allProducts).toHaveSize(1)
            expect(meta.allWorkspaces).toHaveSize(1)
            expect(meta.usedProducts).toHaveSize(2)
            expect(meta.usedWorkspaces).toHaveSize(2)
            expect(meta.usedProducts).toEqual([
              { label: 'Product', value: 'product' },
              { label: 'unknown', value: 'unknown' }
            ])
            expect(meta.usedWorkspaces).toEqual([
              { label: 'Workspace', value: 'ws' },
              { label: 'unknown', value: 'unknown' }
            ])
            done()
          }
        }
      })
    })

    it('should get no existing products and workspaces - successful but without enrichments', (done) => {
      // product and workspace are used...
      const assignments: AnnouncementAssignments = {
        productNames: ['product', 'unknown'],
        workspaceNames: ['ws', 'unknown']
      }
      apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of(assignments))

      component.ngOnInit()

      component.metaData$.subscribe({
        next: (meta) => {
          if (meta) {
            expect(meta.allProducts).toHaveSize(2) // take over the used products
            expect(meta.allWorkspaces).toHaveSize(2) // take over the used workspaces
            expect(meta.usedProducts).toHaveSize(2)
            expect(meta.usedWorkspaces).toHaveSize(2)
            expect(meta.usedProducts).toEqual([
              { label: 'product', value: 'product' },
              { label: 'unknown', value: 'unknown' }
            ])
            expect(meta.usedWorkspaces).toEqual([
              { label: 'ws', value: 'ws' },
              { label: 'unknown', value: 'unknown' }
            ])
            done()
          }
        }
      })
    })
  })

  describe('detail actions', () => {
    it('should prepare the creation of a new item', () => {
      const mode = 'CREATE'

      component.onDetail(undefined, mode)

      expect(component.changeMode).toBe(mode)
      expect(component.item4Detail).toEqual({})
      expect(component.displayDetailDialog).toBeTrue()

      component.onCloseDetail(false)

      expect(component.displayDetailDialog).toBeFalse()
    })

    it('should show details of a item', () => {
      const mode = 'EDIT'

      component.onDetail(itemData[0], mode)

      expect(component.changeMode).toBe(mode)
      expect(component.item4Detail).toEqual(itemData[0])
      expect(component.displayDetailDialog).toBeTrue()
    })

    it('should prepare the copy of a item', () => {
      const mode = 'COPY'

      component.onDetail(itemData[0], mode)

      expect(component.changeMode).toBe(mode)
      expect(component.item4Detail).toEqual(itemData[0])
      expect(component.displayDetailDialog).toBeTrue()

      component.onCloseDetail(true)

      expect(component.displayDetailDialog).toBeFalse()
    })

    it('should deny editing from interactive table if permission is missing', async () => {
      hasPermissionSpy.and.returnValue(Promise.resolve(false))

      component.onEditFromInteractive(itemData[0])
      await Promise.resolve()

      expect(component.displayDetailDialog).toBeFalse()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.ANNOUNCEMENT' })
    })

    it('should allow editing from interactive table if permission is granted', async () => {
      hasPermissionSpy.and.returnValue(Promise.resolve(true))

      component.onEditFromInteractive(itemData[0])
      await Promise.resolve()

      expect(component.displayDetailDialog).toBeTrue()
      expect(component.changeMode).toBe('EDIT')
      expect(component.item4Detail).toEqual(itemData[0])
    })

    it('should deny viewing from interactive table if permission is missing', async () => {
      hasPermissionSpy.and.returnValue(Promise.resolve(false))

      component.onViewFromInteractive(itemData[0])
      await Promise.resolve()

      expect(component.displayDetailDialog).toBeFalse()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.ANNOUNCEMENT' })
    })

    it('should allow viewing from interactive table if permission is granted', async () => {
      hasPermissionSpy.and.returnValue(Promise.resolve(true))

      component.onViewFromInteractive(itemData[0])
      await Promise.resolve()

      expect(component.displayDetailDialog).toBeTrue()
      expect(component.changeMode).toBe('VIEW')
      expect(component.item4Detail).toEqual(itemData[0])
    })

    it('should run copy additional action callback from interactive actions', async () => {
      hasPermissionSpy.and.returnValue(Promise.resolve(true))
      const copyAction = component.interactiveAdditionalActions.find((action) => action.id === 'copy')

      expect(copyAction).toBeDefined()

      copyAction?.callback(itemData[0])
      await Promise.resolve()

      expect(component.displayDetailDialog).toBeTrue()
      expect(component.changeMode).toBe('COPY')
      expect(component.item4Detail).toEqual(itemData[0])
    })
  })

  describe('deletion', () => {
    let items4Deletion: any[] = []

    beforeEach(() => {
      items4Deletion = [
        { id: 'id1', title: 't1', content: 'text1' },
        { id: 'id2', title: 't2', content: 'text2', productName: 'p1' },
        { id: 'id3', title: 't3', content: 'text3', workspace: 'wsp' }
      ]
    })

    it('should handle deletion confirmed - remove item from data and keep product', () => {
      component.item4Delete = items4Deletion[1]
      component['dataSubject$'].next(items4Deletion)

      component.onDeleteConfirmed(false)

      expect(component.displayDeleteDialog).toBeFalse()
      expect(component.item4Delete).toBeUndefined()
    })

    it('should handle deletion confirmed - trigger usedLists reload when last of product removed', (done) => {
      const itemsWithUniqueProduct: RowListGridData[] = [
        { id: 'id1', title: 't1', productName: 'uniqueProduct', imagePath: '' }
      ]
      component.item4Delete = itemsWithUniqueProduct[0] as Announcement
      component['dataSubject$'].next(itemsWithUniqueProduct)
      spyOn(component.usedListsTrigger$, 'next')

      component.onDeleteConfirmed(true)

      expect(component.usedListsTrigger$.next).toHaveBeenCalled()
      expect(component.displayDeleteDialog).toBeFalse()
      expect(component.item4Delete).toBeUndefined()
      component.data$!.subscribe({
        next: (data) => {
          expect(data!.length).toBe(0)
          done()
        },
        error: done.fail
      })
    })

    it('should handle deletion confirmed - do not trigger usedLists if product still exists', (done) => {
      const items: RowListGridData[] = [
        { id: 'id1', title: 't1', productName: 'p1', imagePath: '' },
        { id: 'id2', title: 't2', productName: 'p1', imagePath: '' }
      ]
      component.item4Delete = items[0] as Announcement
      component['dataSubject$'].next(items)
      spyOn(component.usedListsTrigger$, 'next')

      component.onDeleteConfirmed(true)

      expect(component.usedListsTrigger$.next).not.toHaveBeenCalled()
      expect(component.displayDeleteDialog).toBeFalse()
      expect(component.item4Delete).toBeUndefined()
      component.data$!.subscribe({
        next: (data) => {
          expect(data!.length).toBe(1)
          done()
        },
        error: done.fail
      })
    })

    it('should also remove deleted item from filteredData when filter is active', (done) => {
      const items: RowListGridData[] = [
        { id: 'id1', title: 't1', productName: 'p1', imagePath: '' },
        { id: 'id2', title: 't2', productName: 'p1', imagePath: '' },
        { id: 'id3', title: 'ab', productName: 'p2', imagePath: '' }
      ]
      component.item4Delete = items[0] as Announcement
      component['dataSubject$'].next(items)
      component.onGlobalFilter('t', items) // filter to items 1 and 2

      if (component.filteredData) expect(component.filteredData.length).toBe(2)

      component.onDeleteConfirmed(true)

      if (component.filteredData) expect(component.filteredData.length).toBe(1)
      component.data$!.subscribe({
        next: (data) => {
          expect(data!.length).toBe(2)
          done()
        },
        error: done.fail
      })
    })

    it('should fallback to empty array when dataSubject$ holds null on deletion', () => {
      component.item4Delete = { id: 'id1', productName: 'p1' } as Announcement
      component['dataSubject$'].next(null)
      spyOn(component.usedListsTrigger$, 'next')

      component.onDeleteConfirmed(true)

      expect(component.usedListsTrigger$.next).toHaveBeenCalled()
      expect(component.displayDeleteDialog).toBeFalse()
    })

    it('should deny deleting from interactive table if permission is missing', async () => {
      hasPermissionSpy.and.returnValue(Promise.resolve(false))

      component.onDeleteFromInteractive(itemData[0])
      await Promise.resolve()

      expect(component.displayDeleteDialog).toBeFalse()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.ANNOUNCEMENT' })
    })

    it('should allow deleting from interactive table if permission is granted', async () => {
      hasPermissionSpy.and.returnValue(Promise.resolve(true))

      component.onDeleteFromInteractive(itemData[0])
      await Promise.resolve()

      expect(component.displayDeleteDialog).toBeTrue()
      expect(component.item4Delete).toEqual(itemData[0])
    })

    it('should handle permission check errors when deleting from interactive table', async () => {
      const errorResponse = new Error('permission failed')
      hasPermissionSpy.and.returnValue(Promise.reject(errorResponse))
      spyOn(console, 'error')

      component.onDeleteFromInteractive(itemData[0])
      await fixture.whenStable()

      expect(component.displayDeleteDialog).toBeFalse()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.ANNOUNCEMENT' })
      expect(console.error).toHaveBeenCalledWith('hasPermission', errorResponse)
    })
  })

  describe('filter columns', () => {
    it('should update the columns that are seen in results', () => {
      const columns: ExtendedColumn[] = [
        { field: 'workspaceName', labelKey: 'WORKSPACE', active: true, sortable: true },
        { field: 'context', labelKey: 'CONTEXT', active: true, sortable: true }
      ]
      component.dataViewColumns = columns

      component.onColumnsChange(['workspaceName'])

      expect(component.displayedColumnKeys).toEqual(['workspaceName'])
    })

    it('should not update columns if activeIds are unchanged', () => {
      component.displayedColumnKeys = ['status', 'title']

      component.onColumnsChange(['status', 'title'])

      expect(component.displayedColumnKeys).toEqual(['status', 'title'])
    })
  })

  describe('filter data', () => {
    it('should return early if data is not provided', () => {
      component.onGlobalFilter('test', undefined)

      expect(component.globalFilterValue).toBe('')
      expect(component.filteredData).toBeUndefined()
    })

    it('should set filteredData to full data when value is empty', () => {
      const data = itemData as RowListGridData[]

      component.onGlobalFilter('', data)

      expect(component.globalFilterValue).toBe('')
      expect(component.filteredData).toBeUndefined()
    })

    it('should set filteredData to full data when value is undefined', () => {
      const data = itemData as RowListGridData[]

      component.onGlobalFilter(undefined, data)

      expect(component.globalFilterValue).toBe('')
      expect(component.filteredData).toBeUndefined()
    })

    it('should filter data by title field (case-insensitive)', () => {
      const data = itemData as RowListGridData[]

      component.onGlobalFilter('admin', data)

      expect(component.globalFilterValue).toBe('admin')
      expect(component.filteredData?.length).toBe(1)
      expect((component.filteredData?.[0] as any).workspaceName).toBe('ADMIN')
    })

    it('should return empty array when no title matches', () => {
      const data = itemData as RowListGridData[]

      component.onGlobalFilter('nonexistent', data)

      expect(component.globalFilterValue).toBe('nonexistent')
      expect(component.filteredData?.length).toBe(0)
    })

    it('should clear global filter and reset filteredData', () => {
      component.globalFilterValue = 'some filter'
      component.filteredData = itemData as RowListGridData[]

      component.onClearGlobalFilter()

      expect(component.globalFilterValue).toBe('')
      expect(component.filteredData).toBeUndefined()
    })

    it('should clear global filter and reset input element value', () => {
      component.globalFilterValue = 'some filter'
      component.filteredData = itemData as RowListGridData[]
      const input = document.createElement('input')
      input.value = 'some filter'

      component.onClearGlobalFilter(input)

      expect(component.globalFilterValue).toBe('')
      expect(component.filteredData).toBeUndefined()
      expect(input.value).toBe('')
    })
  })

  describe('Language tests', () => {
    it('should use default format: English', () => {
      expect(component.datetimeFormat).toEqual('M/d/yy, h:mm a')
    })

    it('should set German date format', () => {
      langSubject.next('de')
      initTestComponent()
      expect(component.datetimeFormat).toEqual('dd.MM.yyyy HH:mm')
    })
  })
})
