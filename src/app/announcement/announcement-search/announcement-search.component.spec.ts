import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { DataSortDirection } from '@onecx/angular-accelerator'
import { AnnouncementAssignments, AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { AnnouncementSearchComponent } from './announcement-search.component'
import { TranslateTestingModule } from 'ngx-translate-testing'

type Column = {
  field: string
  header: string
}

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
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    searchAnnouncements: jasmine.createSpy('searchAnnouncements').and.returnValue(of({})),
    deleteAnnouncementById: jasmine.createSpy('deleteAnnouncementById').and.returnValue(of({})),
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
      schemas: [NO_ERRORS_SCHEMA],
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
    translateServiceSpy.get.calls.reset()
    apiServiceSpy.searchAnnouncements.calls.reset()
    apiServiceSpy.deleteAnnouncementById.calls.reset()
    apiServiceSpy.getAllAnnouncementAssignments.calls.reset()
    // to spy data: refill with neutral data
    apiServiceSpy.searchAnnouncements.and.returnValue(of({}))
    apiServiceSpy.deleteAnnouncementById.and.returnValue(of({}))
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of({}))
  })

  describe('construction', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })

    it('should call OnInit and populate displayed column keys and actions', () => {
      component.ngOnInit()

      expect(component.displayedColumnKeys[0]).toEqual(component.columns[0].field)
    })
  })

  describe('page actions', () => {
    it('should open create dialog', async () => {
      translateServiceSpy.get.and.returnValue(of({ 'ACTIONS.CREATE.LABEL': 'Create' }))
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
      translateServiceSpy.get.and.returnValue(of({ 'ACTIONS.CREATE.LABEL': 'Create' }))
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
      apiServiceSpy.searchAnnouncements.and.returnValue(of({}))

      component.onSearch({})

      component.data$!.subscribe({
        next: (data) => {
          expect(data).toEqual([])
          expect(component.interactiveData).toEqual([])
          done()
        },
        error: done.fail
      })
    })

    it('should search assigned to one workspace', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: [itemData[1]] }))
      component.criteria = { workspaceName: 'ADMIN' }

      component.onSearch(component.criteria, false)

      component.data$!.subscribe({
        next: (data) => {
          expect(data.length).toBe(1)
          expect(data[0]).toEqual(itemData[1])
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
          expect(data.length).toBe(1)
          expect(data[0]).toEqual(itemData[1])
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
          expect(data.length).toBe(0)
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
            expect(meta.allProducts.length).toBe(1)
            expect(meta.allWorkspaces.length).toBe(1)
            expect(meta.usedProducts?.length).toBe(2)
            expect(meta.usedWorkspaces?.length).toBe(2)
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
            expect(meta.allProducts.length).toBe(2) // take over the used products
            expect(meta.allWorkspaces.length).toBe(2) // take over the used workspaces
            expect(meta.usedProducts?.length).toBe(2)
            expect(meta.usedWorkspaces?.length).toBe(2)
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
      const ev: Event = new Event('type')
      spyOn(ev, 'stopPropagation')
      const mode = 'CREATE'

      component.onDetail(ev, undefined, mode)

      expect(ev.stopPropagation).toHaveBeenCalled()
      expect(component.changeMode).toEqual(mode)
      expect(component.item4Detail).toBe(undefined)
      expect(component.displayDetailDialog).toBeTrue()

      component.onCloseDetail(false)

      expect(component.displayDetailDialog).toBeFalse()
    })

    it('should show details of a item', () => {
      const mode = 'EDIT'

      component.onDetail(undefined, itemData[0], mode)

      expect(component.changeMode).toEqual(mode)
      expect(component.item4Detail).toBe(itemData[0])
      expect(component.displayDetailDialog).toBeTrue()
    })

    it('should prepare the copy of a item', () => {
      const mode = 'COPY'

      component.onDetail(undefined, itemData[0], mode)

      expect(component.changeMode).toEqual(mode)
      expect(component.item4Detail).toBe(itemData[0])
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
      expect(component.changeMode).toEqual('EDIT')
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
      expect(component.changeMode).toEqual('VIEW')
      expect(component.item4Detail).toEqual(itemData[0])
    })

    it('should run copy additional action callback from interactive actions', async () => {
      hasPermissionSpy.and.returnValue(Promise.resolve(true))
      const copyAction = component.interactiveAdditionalActions.find((action) => action.id === 'copy')

      expect(copyAction).toBeDefined()

      copyAction?.callback(itemData[0])
      await Promise.resolve()

      expect(component.displayDetailDialog).toBeTrue()
      expect(component.changeMode).toEqual('COPY')
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

    it('should prepare the deletion of a item - ok', () => {
      const ev: Event = new Event('type')
      spyOn(ev, 'stopPropagation')

      component.onDelete(ev, items4Deletion[0])

      expect(ev.stopPropagation).toHaveBeenCalled()
      expect(component.item4Delete).toBe(items4Deletion[0])
      expect(component.displayDeleteDialog).toBeTrue()
    })

    it('should delete a item with confirmation', () => {
      apiServiceSpy.deleteAnnouncementById.and.returnValue(of(null))
      const ev: Event = new Event('type')

      component.onDelete(ev, items4Deletion[1])
      component.onDeleteConfirmation(items4Deletion) // remove but not the last of the product

      expect(component.displayDeleteDialog).toBeFalse()
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })

      component.onDelete(ev, items4Deletion[2])
      component.onDeleteConfirmation(items4Deletion) // remove and this was the last of the product
    })

    it('should display error if deleting a item fails', () => {
      const errorResponse = { status: '400', statusText: 'Error on deletion' }
      apiServiceSpy.deleteAnnouncementById.and.returnValue(throwError(() => errorResponse))
      const ev: Event = new Event('type')
      spyOn(console, 'error')

      component.onDelete(ev, items4Deletion[0])
      component.onDeleteConfirmation(items4Deletion)

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
      expect(console.error).toHaveBeenCalledWith('deleteAnnouncementById', errorResponse)
    })

    it('should reject confirmation if param was not set', () => {
      component.onDeleteConfirmation(items4Deletion)

      expect(apiServiceSpy.deleteAnnouncementById).not.toHaveBeenCalled()
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
      const columns: Column[] = [
        { field: 'workspaceName', header: 'WORKSPACE' },
        { field: 'context', header: 'CONTEXT' }
      ]
      component.columns = columns

      component.onColumnsChange(['workspaceName'])

      expect(component.displayedColumnKeys).toEqual(['workspaceName'])
    })

    it('should return early when selected columns are unchanged', () => {
      const applyGlobalFilterSpy = spyOn<any>(component, 'applyGlobalFilter')
      const sameColumns = [...component.displayedColumnKeys]

      component.onColumnsChange(sameColumns)

      expect(component.displayedColumnKeys).toEqual(sameColumns)
      expect(applyGlobalFilterSpy).not.toHaveBeenCalled()
    })

    it('should update columns when same length but with different order', () => {
      component.displayedColumnKeys = ['status', 'title']
      const applyGlobalFilterSpy = spyOn<any>(component, 'applyGlobalFilter')

      component.onColumnsChange(['title', 'status'])

      expect(component.displayedColumnKeys).toEqual(['title', 'status'])
      expect(applyGlobalFilterSpy).toHaveBeenCalled()
    })

    it('should allow interactive filter event handling', () => {
      expect(() => component.onInteractiveFilterChange([])).not.toThrow()
    })

    it('should filter table rows globally by input value', () => {
      const interactiveRows = component.toInteractiveData(itemData)
      ;(component as any).fullInteractiveData = interactiveRows
      component.interactiveData = [...interactiveRows]

      component.onGlobalFilter('ADMIN')

      expect(component.tableFilter).toBe('ADMIN')
      expect(component.interactiveData.length).toBe(1)
      expect((component.interactiveData[0] as any).workspaceName).toBe('ADMIN')
    })

    it('should treat nullish global filter value as empty', () => {
      const interactiveRows = component.toInteractiveData(itemData)
      ;(component as any).fullInteractiveData = interactiveRows
      component.interactiveData = [interactiveRows[0]]

      component.onGlobalFilter(undefined as any)

      expect(component.tableFilter).toBe('')
      expect(component.interactiveData.length).toBe(itemData.length)
    })

    it('should clear global filter and restore rows', () => {
      const interactiveRows = component.toInteractiveData(itemData)
      ;(component as any).fullInteractiveData = interactiveRows
      component.interactiveData = [interactiveRows[0]]
      component.tableFilter = 'admin'
      const input = document.createElement('input')
      input.value = 'admin'

      component.onClearGlobalFilter(input)

      expect(component.tableFilter).toBe('')
      expect(input.value).toBe('')
      expect(component.interactiveData.length).toBe(itemData.length)
    })

    it('should clear global filter without input element', () => {
      const interactiveRows = component.toInteractiveData(itemData)
      ;(component as any).fullInteractiveData = interactiveRows
      component.interactiveData = [interactiveRows[0]]
      component.tableFilter = 'admin'

      component.onClearGlobalFilter()

      expect(component.tableFilter).toBe('')
      expect(component.interactiveData.length).toBe(itemData.length)
    })

    it('should use all columns when displayed columns are empty', () => {
      const rows = component.toInteractiveData([
        {
          id: 'id-empty-columns',
          title: 'Needle title',
          productName: 'Product',
          workspaceName: 'Workspace',
          type: 'INFO',
          priority: 'NORMAL',
          status: 'ACTIVE',
          startDate: '2024-01-01T00:00:00Z',
          endDate: null
        } as any
      ])
      ;(component as any).fullInteractiveData = rows
      component.displayedColumnKeys = []

      component.onGlobalFilter('needle')

      expect(component.interactiveData.length).toBe(1)
    })

    it('should support global filtering for array values', () => {
      ;(component as any).fullInteractiveData = [
        {
          id: 'array-row',
          imagePath: 'array-row',
          title: ['Alpha', 'Beta']
        } as any
      ]
      component.displayedColumnKeys = ['title']

      component.onGlobalFilter('beta')

      expect(component.interactiveData.length).toBe(1)
      expect((component.interactiveData[0] as any).id).toBe('array-row')
    })

    it('should support global filtering for number, boolean, bigint and date values', () => {
      ;(component as any).fullInteractiveData = [
        { id: 'num-row', imagePath: 'num-row', title: 123 } as any,
        { id: 'bool-row', imagePath: 'bool-row', title: true } as any,
        { id: 'bigint-row', imagePath: 'bigint-row', title: BigInt(42) } as any,
        { id: 'date-row', imagePath: 'date-row', title: new Date('2024-01-01T00:00:00.000Z') } as any
      ]
      component.displayedColumnKeys = ['title']

      component.onGlobalFilter('123')
      expect(component.interactiveData.length).toBe(1)
      expect((component.interactiveData[0] as any).id).toBe('num-row')

      component.onGlobalFilter('true')
      expect(component.interactiveData.length).toBe(1)
      expect((component.interactiveData[0] as any).id).toBe('bool-row')

      component.onGlobalFilter('42')
      expect(component.interactiveData.length).toBe(1)
      expect((component.interactiveData[0] as any).id).toBe('bigint-row')

      component.onGlobalFilter('2024-01-01')
      expect(component.interactiveData.length).toBe(1)
      expect((component.interactiveData[0] as any).id).toBe('date-row')
    })

    it('should ignore unsupported objects and empty normalized arrays in global filter', () => {
      ;(component as any).fullInteractiveData = [
        { id: 'obj-row', imagePath: 'obj-row', title: { nested: 'value' } } as any,
        { id: 'array-empty-row', imagePath: 'array-empty-row', title: [{}] } as any
      ]
      component.displayedColumnKeys = ['title']

      component.onGlobalFilter('value')

      expect(component.interactiveData.length).toBe(0)
    })

    it('should update sort field and direction', () => {
      component.onSortChange({ sortColumn: 'title', sortDirection: DataSortDirection.ASCENDING })

      expect(component.sortField).toBe('title')
      expect(component.sortDirection).toBe(DataSortDirection.ASCENDING)
    })

    it('should validate date values for all branches', () => {
      expect(component.isValidDateValue(null)).toBeFalse()
      expect(component.isValidDateValue('')).toBeFalse()
      expect(component.isValidDateValue('not-a-date')).toBeFalse()
      expect(component.isValidDateValue(new Date('2024-01-01T00:00:00Z'))).toBeTrue()
      expect(component.isValidDateValue('2024-01-01T00:00:00Z')).toBeTrue()
    })

    it('should build fallback id and imagePath when item id is missing', () => {
      const transformed = component.toInteractiveData([
        {
          id: undefined,
          title: 'Without id'
        } as any
      ])

      expect((transformed[0] as any).id).toBe('announcement-0')
      expect((transformed[0] as any).imagePath).toBe('announcement-0')
    })

    it('should return empty interactive data for nullish input', () => {
      const transformed = component.toInteractiveData(undefined as any)

      expect(transformed).toEqual([])
    })
  })

  describe('Language tests', () => {
    it('should use default format: English', () => {
      expect(component.dateFormat).toEqual('M/d/yy, h:mm a')
    })

    it('should set German date format', () => {
      langSubject.next('de')
      initTestComponent()
      expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm')
    })
  })
})
