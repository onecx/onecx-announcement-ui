import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import {
  AppStateService,
  createTranslateLoader,
  Column,
  PortalMessageService,
  UserService
} from '@onecx/portal-integration-angular'
import { Announcement, AnnouncementAssignments, AnnouncementInternalAPIService } from 'src/app/shared/generated'
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

  const newAnnArray: Announcement[] = [{ id: 'id', title: 'new' }]
  const mockUserService = {
    lang$: {
      getValue: jasmine.createSpy('getValue')
    }
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AnnouncementSearchComponent],
      imports: [
        HttpClientTestingModule,
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
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    apiServiceSpy.searchAnnouncements.calls.reset()
    apiServiceSpy.deleteAnnouncementById.calls.reset()
    apiServiceSpy.getAllAnnouncementAssignments.calls.reset()
    apiServiceSpy.getAllProductNames.calls.reset()
    translateServiceSpy.get.calls.reset()
    mockUserService.lang$.getValue.and.returnValue('de')
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
    spyOn(component, 'search')

    component.ngOnInit()

    expect(component.search).toHaveBeenCalled()
    expect(component.filteredColumns[0].field).toEqual('workspaceName')
  })

  describe('search', () => {
    it('should search announcements without search criteria', () => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: announcementData }))
      component.announcements = []

      component.search({ announcementSearchCriteria: {} })

      expect(component.announcements).toEqual(announcementData)
    })

    it('should search anncmts assigned to one workspace', () => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: [announcementData[1]] }))
      component.announcements = []
      component.criteria = { workspaceName: 'ADMIN' }
      const reuseCriteria = false

      component.search({ announcementSearchCriteria: component.criteria }, reuseCriteria)

      expect(component.announcements[0]).toEqual(announcementData[1])
    })

    it('should search anncmts in all workspaces and products', () => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: announcementData }))
      component.criteria = { workspaceName: 'all', productName: 'all' }
      const resultCriteria = {
        workspaceName: undefined,
        productName: undefined
      }
      const reuseCriteria = false

      component.search({ announcementSearchCriteria: component.criteria }, reuseCriteria)
      expect(component.criteria).toEqual(resultCriteria)
      expect(component.announcements).toEqual(announcementData)
    })

    it('should display an info message if there are no announcements', () => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of([]))
      component.announcements = []

      component.search({ announcementSearchCriteria: {} })

      expect(component.announcements.length).toEqual(0)
      expect(msgServiceSpy.info).toHaveBeenCalledOnceWith({ summaryKey: 'ACTIONS.SEARCH.NO_RESULTS' })
    })

    it('should reset search criteria and empty announcements for the next search', () => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: [announcementData[1]] }))
      component.announcements = []
      component.criteria = { workspaceName: 'ADMIN' }
      const reuseCriteria = false

      component.search({ announcementSearchCriteria: component.criteria }, reuseCriteria)
      expect(component.announcements[0]).toEqual(announcementData[1])

      component.reset()

      expect(component.criteria).toEqual({})
      expect(component.announcements).toEqual([])
    })

    it('should display an error message if the search call fails', () => {
      const err = { status: '400' }
      apiServiceSpy.searchAnnouncements.and.returnValue(throwError(() => err))

      component.search({ announcementSearchCriteria: {} })

      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'ACTIONS.SEARCH.SEARCH_FAILED',
        detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENTS'
      })
    })

    it('should search with newly defined criteria', () => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of([]))
      component.criteria = { workspaceName: 'workspaceName', title: 'title' }
      const newCriteria = { workspaceName: '', productName: '', title: 'new title' }
      const reuseCriteria = false

      component.search({ announcementSearchCriteria: newCriteria }, reuseCriteria)

      expect(component.criteria).toEqual(newCriteria)
    })

    it('should search with wildcard * in title', () => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: announcementData }))
      component.criteria = { title: 'A*' }
      const reuseCriteria = false

      component.search({ announcementSearchCriteria: component.criteria }, reuseCriteria)

      expect(component.announcements).toEqual(announcementData)
    })
  })

  /*
   * UI ACTIONS
   */
  it('should prepare the creation of a new announcement', () => {
    component.onCreate()

    expect(component.changeMode).toEqual('NEW')
    expect(component.appsChanged).toBeFalse()
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
    expect(component.appsChanged).toBeFalse()
    expect(component.announcement).toBe(announcementData[0])
    expect(component.displayDetailDialog).toBeTrue()
  })

  it('should prepare the copy of an announcement', () => {
    const ev: MouseEvent = new MouseEvent('type')
    spyOn(ev, 'stopPropagation')

    component.onCopy(ev, announcementData[0])

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.changeMode).toEqual('NEW')
    expect(component.appsChanged).toBeFalse()
    expect(component.announcement).toBe(announcementData[0])
    expect(component.displayDetailDialog).toBeTrue()
  })

  it('should prepare the deletion of an announcement', () => {
    const ev: MouseEvent = new MouseEvent('type')
    spyOn(ev, 'stopPropagation')

    component.onDelete(ev, announcementData[0])

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.appsChanged).toBeFalse()
    expect(component.announcement).toBe(announcementData[0])
    expect(component.displayDeleteDialog).toBeTrue()
  })

  it('should delete an announcement item with and without workspace assignment', () => {
    const ev: MouseEvent = new MouseEvent('type')
    apiServiceSpy.deleteAnnouncementById.and.returnValue(of({}))
    component.usedWorkspaces = [{ label: 'workspace', value: 'workspace' }]
    component.announcements = [
      { id: 'a1', title: 'a1' },
      { id: 'a2', title: 'a2', workspaceName: 'workspace' }
    ]
    component.onDelete(ev, component.announcements[0])
    component.onDeleteConfirmation()

    expect(component.announcements.length).toBe(1)
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })

    component.onDelete(ev, component.announcements[0])
    component.onDeleteConfirmation()
    expect(component.announcements.length).toBe(0)
  })

  it('should display error if deleting an announcement fails', () => {
    apiServiceSpy.deleteAnnouncementById.and.returnValue(throwError(() => new Error()))
    component.announcement = {
      id: 'definedHere'
    }
    component.announcements = newAnnArray

    component.onDeleteConfirmation()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK'
    })
  })

  it('should set correct values when detail dialog is closed', () => {
    spyOn(component, 'search')

    component.onCloseDetail(true)

    expect(component.search).toHaveBeenCalled()
    expect(component.displayDeleteDialog).toBeFalse()
  })

  it('should update the columns that are seen in results', () => {
    const columns: Column[] = [
      {
        field: 'workspaceName',
        header: 'WORKSPACE'
      },
      {
        field: 'context',
        header: 'CONTEXT'
      }
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
   * test workspaces: fetching used ws and all ws
   */
  it('should get all workspaces announcements are assigned to', () => {
    const assignments: AnnouncementAssignments = { productNames: [], workspaceNames: ['w1'] }
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of(assignments))
    component.usedWorkspaces = []

    component.ngOnInit()

    expect(component.usedWorkspaces).toContain({ label: 'w1', value: 'w1' })
  })

  it('should display error msg if that call fails', () => {
    const err = { status: '400' }
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(throwError(() => err))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.ASSIGNMENTS.NOT_FOUND',
      detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ASSIGNMENTS'
    })
  })

  it('should get all existing workspaces', () => {
    const workspaceNames = [{ name: 'w1' }, { name: 'w2' }]
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(of(workspaceNames))
    component.allWorkspaces = []

    component.ngOnInit()

    expect(component.allWorkspaces).toContain({ label: 'ANNOUNCEMENT.EVERY_WORKSPACE', value: 'all' })
  })

  it('should log error if that fails', () => {
    const err = { status: '400' }
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(throwError(() => err))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.WORKSPACES.NOT_FOUND',
      detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.WORKSPACES'
    })
  })

  it('should verify a workspace to be one of all workspaces', () => {
    const workspaces = [{ label: 'w1', value: 'w1' }]
    component.allWorkspaces = workspaces

    const result = component.isWorkspace(workspaces[0].value)

    expect(result).toEqual(true)
  })

  it('should not verify an unknown workspace', () => {
    const workspaces = [{ label: 'w1', value: 'w1' }]
    component.allWorkspaces = workspaces

    const result = component.isWorkspace('w2')

    expect(result).toEqual(false)
  })

  it('should provide a translation if the workspace is undefined', () => {
    const result = component.getTranslationKeyForNonExistingWorkspaces(undefined)

    expect(result).toEqual('ANNOUNCEMENT.EVERY_WORKSPACE')
  })

  it('should provide a translation if unknown workspace is listed', () => {
    const result = component.getTranslationKeyForNonExistingWorkspaces('unknown workspace')

    expect(result).toEqual('ANNOUNCEMENT.WORKSPACE_NOT_FOUND')
  })

  /**
   * test products: fetching used products and all products
   */
  it('should get products announcements are assigned to', () => {
    const assignments: AnnouncementAssignments = { workspaceNames: [], productNames: ['prod1'] }
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of(assignments))
    component.usedProducts = []

    component.ngOnInit()

    expect(component.usedProducts).toContain({ label: 'prod1', value: 'prod1' })
  })

  it('should display error if that call fails', () => {
    const err = { status: '400' }
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(throwError(() => err))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.ASSIGNMENTS.NOT_FOUND',
      detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ASSIGNMENTS'
    })
  })

  // it('should get all existing products', () => {
  //   const productNames = { stream: [{ name: 'prod1', displayName: 'prod1_display' }, { name: 'prod2', displayName: 'prod2_display'}] }
  //   apiServiceSpy.getAllProductNames.and.returnValue(of(productNames))
  //   component.allProducts = []

  //   component.ngOnInit()

  //   expect(component.allProducts).toEqual([{label: 'ANNOUNCEMENT.EVERY_PRODUCT', value: 'all' }, { label: 'prod1_display', value: 'prod1' }, { label: 'prod2_display', value: 'prod2' }])
  // })

  it('should display error if that call fails', () => {
    const err = { status: '400' }
    apiServiceSpy.getAllProductNames.and.returnValue(throwError(() => err))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.PRODUCTS.NOT_FOUND',
      detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
    })
  })

  /**
   * Language tests
   */
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
