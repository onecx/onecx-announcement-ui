import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { Column } from '@onecx/portal-integration-angular'
import { AnnouncementAssignments, AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { AnnouncementSearchComponent } from './announcement-search.component'
import { TranslateTestingModule } from 'ngx-translate-testing'

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
  const mockUserService = { lang$: { getValue: jasmine.createSpy('getValue') } }
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
      declarations: [AnnouncementSearchComponent],
      imports: [
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
    }).compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()
  })

  afterEach(() => {
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    translateServiceSpy.get.calls.reset()
    mockUserService.lang$.getValue.and.returnValue(defaultLang)
    // to spy data: reset
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

    it('should call OnInit and populate filteredColumns/actions correctly', () => {
      component.ngOnInit()

      expect(component.filteredColumns[0]).toEqual(component.columns[0])
    })
  })

  describe('page actions', () => {
    it('should open create dialog', () => {
      translateServiceSpy.get.and.returnValue(of({ 'ACTIONS.CREATE.LABEL': 'Create' }))
      spyOn(component, 'onDetail')

      component.ngOnInit()

      component.actions$?.subscribe((action) => {
        action[0].actionCallback()
      })

      expect(component.onDetail).toHaveBeenCalled()
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

    it('should reset search criteria and empty announcements for the next search', (done) => {
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
        error: () => {
          expect(console.error).toHaveBeenCalledWith('searchAnnouncements', errorResponse)
          expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.ANNOUNCEMENTS')
          expect(msgServiceSpy.error).toHaveBeenCalledWith({
            summaryKey: 'ACTIONS.SEARCH.MESSAGE.SEARCH_FAILED',
            detailKey: 'EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.ANNOUNCEMENTS'
          })
          done.fail
        }
      })
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
        error: (err) => {
          expect(console.error).toHaveBeenCalledOnceWith('getAllAnnouncementAssignments', errorResponse)
          done.fail
        }
      })
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
  })

  describe('filter columns', () => {
    it('should update the columns that are seen in results', () => {
      const columns: Column[] = [
        { field: 'workspaceName', header: 'WORKSPACE' },
        { field: 'context', header: 'CONTEXT' }
      ]
      const expectedColumn = { field: 'workspaceName', header: 'WORKSPACE' }
      component.columns = columns

      component.onColumnsChange(['workspaceName'])

      expect(component.filteredColumns).not.toContain(columns[1])
      expect(component.filteredColumns).toEqual([jasmine.objectContaining(expectedColumn)])
    })

    it('should apply a filter to the result table', () => {
      const dataTable = jasmine.createSpyObj('dataTable', ['filterGlobal'])

      component.onFilterChange('test', dataTable)

      expect(dataTable?.filterGlobal).toHaveBeenCalledWith('test', 'contains')
    })
  })

  describe('Language tests', () => {
    it('should use default format: English', () => {
      expect(component.dateFormat).toEqual('M/d/yy, h:mm a')
    })

    it('should set German date format', () => {
      mockUserService.lang$.getValue.and.returnValue('de')
      initTestComponent()
      expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm')
    })
  })
})
