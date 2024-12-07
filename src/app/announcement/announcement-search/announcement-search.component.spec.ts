import { NO_ERRORS_SCHEMA } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import {
  AppStateService,
  Column,
  createTranslateLoader,
  PortalMessageService,
  UserService
} from '@onecx/portal-integration-angular'

import { AnnouncementAssignments, AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { AnnouncementSearchComponent } from './announcement-search.component'

const announcementData: any = [
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

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error', 'info'])
  const apiServiceSpy = {
    searchAnnouncements: jasmine.createSpy('searchAnnouncements').and.returnValue(of({})),
    deleteAnnouncementById: jasmine.createSpy('deleteAnnouncementById').and.returnValue(of({})),
    getAllAnnouncementAssignments: jasmine.createSpy('getAllAnnouncementAssignments').and.returnValue(of({})),
    getAllWorkspaceNames: jasmine.createSpy('getAllWorkspaceNames').and.returnValue(of([])),
    getAllProductNames: jasmine.createSpy('getAllProductNames').and.returnValue(of([]))
  }
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])

  const mockUserService = {
    lang$: {
      getValue: jasmine.createSpy('getValue')
    }
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AnnouncementSearchComponent],
      imports: [
        TranslateModule.forRoot({
          isolate: true,
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    translateServiceSpy.get.calls.reset()
    mockUserService.lang$.getValue.and.returnValue('de')
    // to spy data: reset
    apiServiceSpy.searchAnnouncements.calls.reset()
    apiServiceSpy.deleteAnnouncementById.calls.reset()
    apiServiceSpy.getAllAnnouncementAssignments.calls.reset()
    apiServiceSpy.getAllProductNames.calls.reset()
    apiServiceSpy.getAllWorkspaceNames.calls.reset()
    // to spy data: refill with neutral data
    apiServiceSpy.searchAnnouncements.and.returnValue(of({}))
    apiServiceSpy.deleteAnnouncementById.and.returnValue(of({}))
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of({}))
    apiServiceSpy.getAllProductNames.and.returnValue(of([]))
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(of([]))
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnouncementSearchComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should call search OnInit and populate filteredColumns/actions correctly', () => {
    component.columns = [
      { field: 'title', header: 'TITLE', active: false },
      { field: 'workspaceName', header: 'WORKSPACE', active: true }
    ]

    component.ngOnInit()

    expect(component.filteredColumns[0].field).toEqual('workspaceName')
  })

  describe('search', () => {
    it('should search announcements without search criteria', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: announcementData }))

      component.onSearch({ announcementSearchCriteria: {} })

      component.announcements$!.subscribe({
        next: (data) => {
          expect(data.length).toBe(3)
          expect(data[0]).toEqual(announcementData[0])
          expect(data[1]).toEqual(announcementData[1])
          expect(data[2]).toEqual(announcementData[2])
          done()
        },
        error: done.fail
      })
    })

    it('should search announcements assigned to one workspace', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: [announcementData[1]] }))
      component.criteria = { workspaceName: 'ADMIN' }
      const reuseCriteria = false

      component.onSearch({ announcementSearchCriteria: component.criteria }, reuseCriteria)

      component.announcements$!.subscribe({
        next: (data) => {
          expect(data.length).toBe(1)
          expect(data[0]).toEqual(announcementData[1])
          done()
        },
        error: done.fail
      })
    })

    it('should search announcements for all workspaces and products', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: announcementData }))
      component.criteria = {}
      const reuseCriteria = false

      component.onSearch({ announcementSearchCriteria: component.criteria }, reuseCriteria)

      component.announcements$!.subscribe({
        next: (data) => {
          expect(data.length).toBe(3)
          expect(data[0]).toEqual(announcementData[0])
          expect(data[1]).toEqual(announcementData[1])
          expect(data[2]).toEqual(announcementData[2])
          done()
        },
        error: done.fail
      })
    })

    it('should reset search criteria and empty announcements for the next search', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: [announcementData[1]] }))
      component.criteria = { workspaceName: 'ADMIN' }
      const reuseCriteria = false

      component.onSearch({ announcementSearchCriteria: component.criteria }, reuseCriteria)

      component.announcements$!.subscribe({
        next: (data) => {
          expect(data.length).toBe(1)
          expect(data[0]).toEqual(announcementData[1])
          done()
        },
        error: done.fail
      })

      component.onCriteriaReset()

      expect(component.criteria).toEqual({})
    })

    it('should display an error message if the search call fails', (done) => {
      const errorResponse = { status: '403', statusText: 'Not authorized' }
      apiServiceSpy.searchAnnouncements.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component.onSearch({ announcementSearchCriteria: {} })

      component.announcements$!.subscribe({
        next: (data) => {
          expect(data.length).toBe(0)
          done()
        },
        error: () => {
          expect(console.error).toHaveBeenCalledWith('searchAnnouncements', errorResponse)
          expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.ANNOUNCEMENTS')
          expect(msgServiceSpy.error).toHaveBeenCalledWith({
            summaryKey: 'ACTIONS.SEARCH.SEARCH_FAILED',
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

      component.onSearch({ announcementSearchCriteria: newCriteria }, reuseCriteria)

      expect(component.criteria).toEqual(newCriteria)
    })

    it('should search with wildcard * in title', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: announcementData }))
      component.criteria = { title: 'A*' }
      const reuseCriteria = false

      component.onSearch({ announcementSearchCriteria: component.criteria }, reuseCriteria)

      component.announcements$!.subscribe({
        next: (data) => {
          expect(data).toEqual(announcementData)
          done()
        },
        error: done.fail
      })
    })
  })

  /*
   * UI ACTIONS
   */
  it('should prepare the creation of a new announcement', () => {
    component.onCreate()

    expect(component.changeMode).toEqual('CREATE')
    expect(component.announcement).toBe(undefined)
    expect(component.displayDetailDialog).toBeTrue()
  })

  it('should show details of an announcement', () => {
    const ev: MouseEvent = new MouseEvent('type')
    spyOn(ev, 'stopPropagation')
    const mode = 'EDIT'

    component.onDetail(ev, announcementData[0], mode)

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.changeMode).toEqual(mode)
    expect(component.announcement).toBe(announcementData[0])
    expect(component.displayDetailDialog).toBeTrue()
  })

  it('should prepare the copy of an announcement', () => {
    const ev: MouseEvent = new MouseEvent('type')
    spyOn(ev, 'stopPropagation')

    component.onCopy(ev, announcementData[0])

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.changeMode).toEqual('CREATE')
    expect(component.announcement).toBe(announcementData[0])
    expect(component.displayDetailDialog).toBeTrue()
  })

  it('should prepare the deletion of an announcement', () => {
    const ev: MouseEvent = new MouseEvent('type')
    spyOn(ev, 'stopPropagation')

    component.onDelete(ev, announcementData[0])

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.announcement).toBe(announcementData[0])
    expect(component.displayDeleteDialog).toBeTrue()
  })

  it('should delete an announcement item with and without workspace assignment', () => {
    const ev: MouseEvent = new MouseEvent('type')
    apiServiceSpy.deleteAnnouncementById.and.returnValue(of({}))
    const announcements = [
      { id: 'a1', title: 'a1' },
      { id: 'a2', title: 'a2', workspaceName: 'workspace' }
    ]
    component.onDelete(ev, announcements[0])
    component.onDeleteConfirmation()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
  })

  it('should display error if deleting an announcement fails', () => {
    const errorResponse = { status: '400', statusText: 'Deletion failed' }
    apiServiceSpy.deleteAnnouncementById.and.returnValue(throwError(() => errorResponse))
    component.announcement = { id: 'definedHere' }
    spyOn(console, 'error')

    component.onDeleteConfirmation()

    expect(console.error).toHaveBeenCalledWith('deleteAnnouncementById', errorResponse)
    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
  })

  it('should set correct values when detail dialog is closed', () => {
    spyOn(component, 'onSearch')

    component.onCloseDetail(true)

    expect(component.onSearch).toHaveBeenCalled()
    expect(component.displayDeleteDialog).toBeFalse()
  })

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
    component.announcementTable = jasmine.createSpyObj('announcementTable', ['filterGlobal'])

    component.onFilterChange('test')

    expect(component.announcementTable?.filterGlobal).toHaveBeenCalledWith('test', 'contains')
  })

  it('should open create dialog', () => {
    translateServiceSpy.get.and.returnValue(of({ 'ACTIONS.CREATE.LABEL': 'Create' }))
    spyOn(component, 'onCreate')

    component.ngOnInit()

    component.actions$?.subscribe((action) => {
      action[0].actionCallback()
    })

    expect(component.onCreate).toHaveBeenCalled()
  })

  /**
   * META data: used products/workspaces (which were assigned to announcements)
   */
  describe('META data: load used products/workspaces', () => {
    it('should get all announcements assigned to workspaces', (done) => {
      const assignments: AnnouncementAssignments = { productNames: ['prod1'], workspaceNames: ['w1'] }
      apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of(assignments))

      component.ngOnInit()

      component.allUsedLists$?.subscribe({
        next: (data) => {
          expect(data.workspaces).toContain({ label: 'w1', value: 'w1' })
          expect(data.products).toContain({ label: 'prod1', value: 'prod1' })
          done()
        }
      })
    })

    it('should get all announcements assigned to workspaces', (done) => {
      const errorResponse = { status: '404', statusText: 'An error occur' }
      apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.ngOnInit()

      component.allUsedLists$?.subscribe({
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

  describe('META data: load all workspaces', () => {
    it('should get all existing workspaces', (done) => {
      const workspaces = [{ name: 'ws', displayName: 'Workspace' }]
      apiServiceSpy.getAllWorkspaceNames.and.returnValue(of(workspaces))

      component.ngOnInit()

      component.allWorkspaces$.subscribe({
        next: (workspaces) => {
          expect(workspaces.length).toBe(1)
          expect(workspaces[0].label).toEqual('Workspace')
          done()
        }
      })
    })

    it('should log error getting all existing workspaces fails', (done) => {
      const errorResponse = { status: '404', statusText: 'Not Found' }
      apiServiceSpy.getAllWorkspaceNames.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.ngOnInit()

      component.allWorkspaces$.subscribe({
        next: () => {
          expect(console.error).toHaveBeenCalledWith('getAllWorkspaceNames', errorResponse)
          done()
        }
      })
    })

    it('should verify a workspace to be one of all workspaces', () => {
      const workspaces = [{ label: 'w1', value: 'w1' }]

      let result = component.isWorkspace(workspaces[0].value, workspaces)

      expect(result).toEqual(true)

      result = component.isWorkspace('unknown value', workspaces)

      expect(result).toEqual(false)
    })

    it('should provide a translation if unknown workspace is listed', () => {
      let key = component.getTranslationKeyForNonExistingWorkspaces('unknown workspace')

      expect(key).toEqual('ANNOUNCEMENT.WORKSPACE_NOT_FOUND')

      key = component.getTranslationKeyForNonExistingWorkspaces()

      expect(key).toEqual('ANNOUNCEMENT.ALL')
    })
  })

  describe('META data: load all products', () => {
    it('should get all existing products - successful', (done) => {
      const products = {
        stream: [
          { name: 'prod1', displayName: 'prod1_display' },
          { name: 'prod2', displayName: 'prod2_display' }
        ]
      }
      apiServiceSpy.getAllProductNames.and.returnValue(of(products))

      component.ngOnInit()

      component.allProducts$.subscribe({
        next: (products) => {
          if (products) {
            expect(products.length).toBe(2)
            expect(products[0].label).toEqual('prod1_display')
            done()
          }
        }
      })
    })

    it('should display error if that call fails', () => {
      const errorResponse = { status: '404', statusText: 'Not found' }
      apiServiceSpy.getAllProductNames.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')

      component.ngOnInit()

      component.allProducts$.subscribe({
        next: () => {
          expect(console.error).toHaveBeenCalledWith('getAllProductNames', errorResponse)
        }
      })
    })
  })

  describe('META data: load all meta data together and check enrichments', () => {
    it('should get all existing products - successful', (done) => {
      const products = {
        stream: [{ name: 'product', displayName: 'Product' }]
      }
      apiServiceSpy.getAllProductNames.and.returnValue(of(products))
      const workspaces = [{ name: 'ws', displayName: 'Workspace' }]
      apiServiceSpy.getAllWorkspaceNames.and.returnValue(of(workspaces))
      // product and workspace are used...
      const assignments: AnnouncementAssignments = {
        productNames: ['product', 'unknown'],
        workspaceNames: ['ws', 'unknown']
      }
      apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of(assignments))

      component.ngOnInit()

      component.allMetaData$.subscribe({
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
  })

  /**
   * Language tests
   */
  describe('Language tests', () => {
    it('should set a German date format', () => {
      expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm')
    })

    it('should set default date format', () => {
      mockUserService.lang$.getValue.and.returnValue('en')
      fixture = TestBed.createComponent(AnnouncementSearchComponent)
      component = fixture.componentInstance
      fixture.detectChanges()
      expect(component.dateFormat).toEqual('M/d/yy, h:mm a')
    })
  })
})
