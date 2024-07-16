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
import { Announcement, AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { AnnouncementSearchComponent } from './announcement-search.component'

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
  const resultAllAnnouncements: Announcement[] = [
    { id: 'id1', title: 'ann1', workspaceName: 'w1' },
    { id: 'id2', title: 'ann2', workspaceName: 'w2' },
    { id: 'id3', title: 'announcement without workspace' }
  ]
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

  it('should correctly assign results if API call returns some data', () => {
    apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: [{ id: 'id', title: 'new' }] }))
    component.announcements = []

    component.search({ announcementSearchCriteria: {} })

    expect(component.announcements[0]).toEqual({ id: 'id', title: 'new' })
  })

  it('should search workspace', () => {
    apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: resultAllAnnouncements }))
    component.announcements = []
    component.criteria = { workspaceName: 'w1' }
    const reuseCriteria = false
    const resultAnnouncements = { id: 'id1', title: 'ann1', workspaceName: 'w1' }

    component.search({ announcementSearchCriteria: component.criteria }, reuseCriteria)
    expect(component.announcements[0]).toEqual(resultAnnouncements)
  })

  it('should search all', () => {
    apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: resultAllAnnouncements }))
    component.criteria = { workspaceName: 'all', productName: 'all' }
    const resultCriteria = {
      workspaceName: undefined,
      productName: undefined
    }
    const reuseCriteria = false

    component.search({ announcementSearchCriteria: component.criteria }, reuseCriteria)
    expect(component.criteria).toEqual(resultCriteria)
    expect(component.announcements).toEqual(resultAllAnnouncements)
  })

  it('should handle empty announcements on search', () => {
    msgServiceSpy.info.calls.reset()
    apiServiceSpy.searchAnnouncements.and.returnValue(of([]))
    component.announcements = []

    component.search({ announcementSearchCriteria: {} })

    expect(component.announcements.length).toEqual(0)
    expect(msgServiceSpy.info).toHaveBeenCalledOnceWith({ summaryKey: 'ACTIONS.SEARCH.NO_RESULTS' })
  })

  it('should reset search criteria', () => {
    apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: resultAllAnnouncements }))
    component.announcements = []
    component.criteria = { workspaceName: 'w1' }
    const reuseCriteria = false
    const resultAnnouncements = { id: 'id1', title: 'ann1', workspaceName: 'w1' }

    component.search({ announcementSearchCriteria: component.criteria }, reuseCriteria)
    expect(component.announcements[0]).toEqual(resultAnnouncements)

    component.reset()
    expect(component.criteria).toEqual({})
    expect(component.announcements).toEqual([])
  })

  it('should handle API call error', () => {
    msgServiceSpy.error.calls.reset()
    const err = { status: '400' }
    apiServiceSpy.searchAnnouncements.and.returnValue(throwError(() => err))

    component.search({ announcementSearchCriteria: {} })

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.SEARCH.SEARCH_FAILED',
      detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENTS'
    })
  })

  it('should use new criteria if reuseCriteria is false', () => {
    apiServiceSpy.searchAnnouncements.and.returnValue(of([]))
    component.criteria = { workspaceName: 'workspaceName', title: 'title' }
    const newCriteria = { workspaceName: '', productName: '', title: 'new title' }
    const reuseCriteria = false

    component.search({ announcementSearchCriteria: newCriteria }, reuseCriteria)

    expect(component.criteria).toEqual(newCriteria)
  })

  it('should set correct values onCreate', () => {
    component.onCreate()

    expect(component.changeMode).toEqual('NEW')
    expect(component.appsChanged).toBeFalse()
    expect(component.announcement).toBe(undefined)
    expect(component.displayDetailDialog).toBeTrue()
  })

  it('should set correct values onDetail', () => {
    const ev: MouseEvent = new MouseEvent('type')
    spyOn(ev, 'stopPropagation')
    const mode = 'EDIT'

    component.onDetail(ev, newAnnArray[0], mode)

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.changeMode).toEqual(mode)
    expect(component.appsChanged).toBeFalse()
    expect(component.announcement).toBe(newAnnArray[0])
    expect(component.displayDetailDialog).toBeTrue()
  })

  it('should set correct values onCopy', () => {
    const ev: MouseEvent = new MouseEvent('type')
    spyOn(ev, 'stopPropagation')

    component.onCopy(ev, newAnnArray[0])

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.changeMode).toEqual('NEW')
    expect(component.appsChanged).toBeFalse()
    expect(component.announcement).toBe(newAnnArray[0])
    expect(component.displayDetailDialog).toBeTrue()
  })

  it('should set correct values onDelete', () => {
    const ev: MouseEvent = new MouseEvent('type')
    spyOn(ev, 'stopPropagation')

    component.onDelete(ev, newAnnArray[0])

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.appsChanged).toBeFalse()
    expect(component.announcement).toBe(newAnnArray[0])
    expect(component.displayDeleteDialog).toBeTrue()
  })

  it('should delete announcement item with/without workspace', () => {
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

  it('should display error on delete announcement failure', () => {
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

  it('should set correct values onCloseDetail', () => {
    spyOn(component, 'search')

    component.onCloseDetail(true)

    expect(component.search).toHaveBeenCalled()
    expect(component.displayDeleteDialog).toBeFalse()
  })

  it('should update filteredColumns onColumnsChange', () => {
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

  it('should call filterGlobal onFilterChange', () => {
    component.announcementTable = jasmine.createSpyObj('announcementTable', ['filterGlobal'])

    component.onFilterChange('test')

    expect(component.announcementTable?.filterGlobal).toHaveBeenCalledWith('test', 'contains')
  })

  it('should call onCreate when actionCallback is executed', () => {
    translateServiceSpy.get.and.returnValue(of({ 'ACTIONS.CREATE.LABEL': 'Create' }))
    spyOn(component, 'onCreate')

    component.ngOnInit()
    component.actions$?.subscribe((action) => {
      action[0].actionCallback()
    })

    expect(component.onCreate).toHaveBeenCalled()
  })

  /**
   * test workspaces: used and all
   */
  it('should get workspaces used by announcements (getUsedWorkspaces)', () => {
    const apps = { appIds: [], workspaceNames: ['w1'] }
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of(apps))
    component.usedWorkspaces = []

    component.ngOnInit()

    expect(component.usedWorkspaces).toContain({ label: 'w1', value: 'w1' })
  })

  it('should log error if getUsedWorkspaces fails', () => {
    const err = { status: '400' }
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(throwError(() => err))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.ASSIGNMENTS.NOT_FOUND',
      detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ASSIGNMENTS'
    })
  })

  it('should get all existing workspaces (getAllWorkspaceNames)', () => {
    const workspaceNames = [{ displayName: 'w1' }, { displayName: 'w2' }]
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(of(workspaceNames))
    component.allWorkspaces = []

    component.ngOnInit()

    expect(component.allWorkspaces).toContain(workspaceNames[0].displayName)
  })

  it('should log error if getAllWorkspaceNames fails', () => {
    const err = { status: '400' }
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(throwError(() => err))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.WORKSPACES.NOT_FOUND',
      detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.WORKSPACES'
    })
  })

  it('should verify workspace', () => {
    const workspaces = ['w1']
    component.allWorkspaces = workspaces

    const result = component.isWorkspace(workspaces[0])

    expect(result).toEqual(true)
  })

  it('should verify unknown workspace', () => {
    const workspaces = ['w1']
    component.allWorkspaces = workspaces

    const result = component.isWorkspace('w2')

    expect(result).toEqual(false)
  })

  it('should getTranslationKeyForNonExistingWorkspaces: return Every workspace', () => {
    const result = component.getTranslationKeyForNonExistingWorkspaces(undefined)

    expect(result).toEqual('ANNOUNCEMENT.EVERY_WORKSPACE')
  })

  it('should getTranslationKeyForNonExistingWorkspaces: return unknown workspace', () => {
    const result = component.getTranslationKeyForNonExistingWorkspaces('unknown workspace')

    expect(result).toEqual('ANNOUNCEMENT.WORKSPACE_NOT_FOUND')
  })

  /**
   * test products: used and all
   */
  it('should get products used by announcements (getUsedProducts)', () => {
    const apps = { appIds: [], productNames: ['prod1'] }
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(of(apps))
    component.usedProducts = []

    component.ngOnInit()

    expect(component.usedProducts).toContain({ label: 'prod1', value: 'prod1' })
  })

  it('should log error if getUsedProducts fails', () => {
    const err = { status: '400' }
    apiServiceSpy.getAllAnnouncementAssignments.and.returnValue(throwError(() => err))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.ASSIGNMENTS.NOT_FOUND',
      detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ASSIGNMENTS'
    })
  })

  it('should get all existing products (getAllProductNames)', () => {
    const productNames = { stream: [{ displayName: 'prod1' }, { displayName: 'prod2' }] }
    apiServiceSpy.getAllProductNames.and.returnValue(of(productNames))
    component.allProducts = []

    component.ngOnInit()

    expect(component.allProducts).toContain(productNames.stream[0].displayName)
  })

  it('should log error if getAllProductNames fails', () => {
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
  it('should call this.user.lang$ from the constructor and set this.dateFormat to a german date format', () => {
    expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm')
  })

  it('should call this.user.lang$ from the constructor and set this.dateFormat to the default format if user.lang$ is not de', () => {
    mockUserService.lang$.getValue.and.returnValue('en')
    fixture = TestBed.createComponent(AnnouncementSearchComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    expect(component.dateFormat).toEqual('M/d/yy, h:mm a')
  })
})
