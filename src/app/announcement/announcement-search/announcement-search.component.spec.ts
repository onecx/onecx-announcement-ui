import { NO_ERRORS_SCHEMA } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ComponentFixture, fakeAsync, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import {
  AppStateService,
  createTranslateLoader,
  Column,
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

    it('should search anncmts assigned to one workspace', (done) => {
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

    it('should search anncmts in all workspaces and products', (done) => {
      apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: announcementData }))
      component.criteria = { workspaceName: 'all', productName: 'all' }
      const resultCriteria = {
        workspaceName: undefined,
        productName: undefined
      }
      const reuseCriteria = false

      component.onSearch({ announcementSearchCriteria: component.criteria }, reuseCriteria)
      expect(component.criteria).toEqual(resultCriteria)

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
      const err = { status: '400' }
      apiServiceSpy.searchAnnouncements.and.returnValue(throwError(() => err))

      component.onSearch({ announcementSearchCriteria: {} })

      component.announcements$!.subscribe({
        next: (data) => {
          expect(data.length).toBe(0)
          done()
        },
        error: () => {
          expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_400.HELP_ITEM')
          expect(msgServiceSpy.error).toHaveBeenCalledWith({
            summaryKey: 'ACTIONS.SEARCH.SEARCH_FAILED',
            detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENTS'
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

    expect(component.changeMode).toEqual('NEW')
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
    expect(component.changeMode).toEqual('NEW')
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
    apiServiceSpy.deleteAnnouncementById.and.returnValue(throwError(() => new Error()))
    component.announcement = {
      id: 'definedHere'
    }

    component.onDeleteConfirmation()

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
   * test workspaces: fetching used ws and all ws
   */
  it('should get all announcements assigned to workspaces', (done) => {
    const assignments: AnnouncementAssignments = { productNames: ['prod1'], workspaceNames: ['w1'] }
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of(assignments))
    component.allWorkspaces = [{ label: 'Workspace1', value: 'w1' }]
    component.allProducts = [{ label: 'Product1', value: 'prod1' }]

    component['getUsedWorkspacesAndProducts']()

    component.allCriteriaLists$?.subscribe({
      next: (data) => {
        expect(data.workspaces).toContain({ label: 'Workspace1', value: 'w1' })
        expect(data.products).toContain({ label: 'Product1', value: 'prod1' })
        done()
      }
    })
  })

  it('should display error message on getting all announcements assigned to', (done) => {
    const err = { status: '400' }
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(throwError(() => err))
    spyOn(console, 'error')

    component['getUsedWorkspacesAndProducts']()

    component.allCriteriaLists$?.subscribe({
      next: () => {
        expect(console.error).toHaveBeenCalledWith('getAllAnnouncementAssignments', err)
        done()
      }
    })
  })

  it('should get all existing workspaces', (done) => {
    const workspaceNames = [{ name: 'ws', displayName: 'Workspace' }]
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(of(workspaceNames))
    component.allWorkspaces = []

    component['searchWorkspaces']()

    component.allWorkspaces$.subscribe({
      next: (workspaces) => {
        expect(workspaces.length).toBe(1)
        expect(workspaces[0].displayName).toEqual('Workspace')
        done()
      }
    })
  })

  it('should log error getting all existing wss fails', fakeAsync(() => {
    const err = { status: '400' }
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(throwError(() => err))
    spyOn(console, 'error')

    component['searchWorkspaces']()

    component.allWorkspaces$.subscribe({
      next: () => {
        expect(console.error).toHaveBeenCalledWith('getAllWorkspaceNames():', err)
      }
    })
  }))

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

  it('should provide the translation for ALL', () => {
    expect(component.allItem?.label).toEqual('ANNOUNCEMENT.ALL')
  })

  it('should provide a translation if unknown workspace is listed', () => {
    let key = component.getTranslationKeyForNonExistingWorkspaces('unknown workspace')

    expect(key).toEqual('ANNOUNCEMENT.WORKSPACE_NOT_FOUND')

    key = component.getTranslationKeyForNonExistingWorkspaces()

    expect(key).toEqual('ANNOUNCEMENT.ALL')
  })

  it('should get all existing products', (done) => {
    const productNames = {
      stream: [
        { name: 'prod1', displayName: 'prod1_display' },
        { name: 'prod2', displayName: 'prod2_display' }
      ]
    }
    apiServiceSpy.getAllProductNames.and.returnValue(of(productNames))
    component.allProducts = []

    component['searchProducts']()

    component.allProducts$.subscribe({
      next: (products) => {
        if (products.stream) {
          expect(products.stream.length).toBe(2)
          expect(products.stream[0].displayName).toEqual('prod1_display')
          done()
        }
      }
    })
  })

  it('should display error if that call fails', () => {
    const err = { status: '400' }
    apiServiceSpy.getAllProductNames.and.returnValue(throwError(() => err))
    spyOn(console, 'error')

    component['searchProducts']()

    component.allProducts$.subscribe({
      next: () => {
        expect(console.error).toHaveBeenCalledWith('getAllProductNames():', err)
      }
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
