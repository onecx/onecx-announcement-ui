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
//import { SelectItem } from 'primeng/api'

describe('AnnouncementSearchComponent', () => {
  let component: AnnouncementSearchComponent
  let fixture: ComponentFixture<AnnouncementSearchComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error', 'info'])
  const apiServiceSpy = {
    searchAnnouncements: jasmine.createSpy('searchAnnouncements').and.returnValue(of({})),
    deleteAnnouncementById: jasmine.createSpy('deleteAnnouncementById').and.returnValue(of({})),
    getAllWorkspaceNames: jasmine.createSpy('getAllWorkspaceNames').and.returnValue(of([]))
  }
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])

  const newAnnArr: Announcement[] = [{ id: 'id', title: 'new' }]
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
    apiServiceSpy.getAllWorkspaceNames.calls.reset()
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
    translateServiceSpy.get.and.returnValue(of({ 'ACTIONS.CREATE.LABEL': 'Create' }))
    component.columns = [
      { field: 'title', header: 'TITLE', active: false },
      { field: 'workspaceName', header: 'WORKSPACE', active: true }
    ]
    spyOn(component, 'search')

    component.ngOnInit()

    expect(component.search).toHaveBeenCalled()
    expect(component.filteredColumns[0].field).toEqual('workspaceName')
    expect(component.actions[0].label).toEqual('ACTIONS.CREATE.LABEL')
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
    const resultw1Announcements = { id: 'id1', title: 'ann1', workspaceName: 'w1' }

    component.search({ announcementSearchCriteria: component.criteria }, reuseCriteria)
    expect(component.announcements[0]).toEqual(resultw1Announcements)
  })

  it('should search all', () => {
    apiServiceSpy.searchAnnouncements.and.returnValue(of({ stream: resultAllAnnouncements }))
    component.criteria = { workspaceName: 'all' }
    const resultCriteria = {
      workspaceName: undefined
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
    expect(msgServiceSpy.info).toHaveBeenCalledOnceWith({ summaryKey: 'GENERAL.SEARCH.MSG_NO_RESULTS' })
  })

  it('should handle API call error', () => {
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.searchAnnouncements.and.returnValue(throwError(() => new Error()))

    component.search({ announcementSearchCriteria: {} })

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'GENERAL.SEARCH.MSG_SEARCH_FAILED' })
  })

  it('should use new criteria if reuseCriteria is false', () => {
    apiServiceSpy.searchAnnouncements.and.returnValue(of([]))
    component.criteria = { workspaceName: 'workspaceName', title: 'title' }
    const newCriteria = { workspaceName: '', title: 'new title' }
    const reuseCriteria = false

    component.search({ announcementSearchCriteria: newCriteria }, reuseCriteria)

    expect(component.criteria).toEqual(newCriteria)
  })

  it('should set correct values onSearch', () => {
    spyOn(component, 'search')

    component.onSearch()

    expect(component.changeMode).toEqual('NEW')
    expect(component.appsChanged).toBeTrue()
    expect(component.search).toHaveBeenCalled()
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

    component.onDetail(ev, newAnnArr[0], mode)

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.changeMode).toEqual(mode)
    expect(component.appsChanged).toBeFalse()
    expect(component.announcement).toBe(newAnnArr[0])
    expect(component.displayDetailDialog).toBeTrue()
  })

  it('should set correct values onCopy', () => {
    const ev: MouseEvent = new MouseEvent('type')
    spyOn(ev, 'stopPropagation')

    component.onCopy(ev, newAnnArr[0])

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.changeMode).toEqual('NEW')
    expect(component.appsChanged).toBeFalse()
    expect(component.announcement).toBe(newAnnArr[0])
    expect(component.displayDetailDialog).toBeTrue()
  })

  it('should set correct values onDelete', () => {
    const ev: MouseEvent = new MouseEvent('type')
    spyOn(ev, 'stopPropagation')

    component.onDelete(ev, newAnnArr[0])

    expect(ev.stopPropagation).toHaveBeenCalled()
    expect(component.appsChanged).toBeFalse()
    expect(component.announcement).toBe(newAnnArr[0])
    expect(component.displayDeleteDialog).toBeTrue()
  })

  it('should delete announcement item', () => {
    apiServiceSpy.deleteAnnouncementById.and.returnValue(of({}))
    component.announcement = {
      id: 'definedHere'
    }
    component.announcements = newAnnArr

    component.onDeleteConfirmation()

    // expect(component.announcements.length).toBe(0)
    expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.ANNOUNCEMENT_OK' })
  })

  it('should display error on delete announcement failure', () => {
    apiServiceSpy.deleteAnnouncementById.and.returnValue(throwError(() => new Error()))
    component.announcement = {
      id: 'definedHere'
    }
    component.announcements = newAnnArr

    component.onDeleteConfirmation()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.ANNOUNCEMENT_NOK' })
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
    const action = component.actions[0]
    action.actionCallback()

    expect(component.onCreate).toHaveBeenCalled()
  })

  it('should getWorkspaces', () => {
    const workspaces = ['w1']
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(of(workspaces))
    component.workspaces = []

    component.ngOnInit()

    expect(component.workspaces).toContain({ label: 'w1', value: 'w1' })
  })

  it('should log error if getWorkspaces fails', () => {
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(throwError(() => new Error()))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.WORKSPACES.NOT_FOUND'
    })
  })

  it('should verify workspace', () => {
    const workspaces = [{ label: 'w1', value: 'w1' }]
    component.workspaces = workspaces

    const result = component.isWorkspace('w1')

    expect(result).toEqual(true)
  })

  it('should verify unknown workspace', () => {
    const workspaces = [{ label: 'w1', value: 'w1' }]
    component.workspaces = workspaces

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

  it('should call this.user.lang$ from the constructor and set this.dateFormat to a german date format', () => {
    expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm:ss')
  })

  it('should call this.user.lang$ from the constructor and set this.dateFormat to the default format if user.lang$ is not de', () => {
    mockUserService.lang$.getValue.and.returnValue('en')
    fixture = TestBed.createComponent(AnnouncementSearchComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    expect(component.dateFormat).toEqual('medium')
  })
})
