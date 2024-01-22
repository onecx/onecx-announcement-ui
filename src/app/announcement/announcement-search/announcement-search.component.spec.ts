import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { ActivatedRoute } from '@angular/router'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import { PortalMessageService, ConfigurationService, Column } from '@onecx/portal-integration-angular'
import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { AnnouncementSearchComponent } from './announcement-search.component'
import { Announcement, AnnouncementInternalAPIService } from '../../generated'
import { PortalService } from '../../services/portalService'

describe('AnnouncementSearchComponent', () => {
  let component: AnnouncementSearchComponent
  let fixture: ComponentFixture<AnnouncementSearchComponent>
  let mockActivatedRoute: ActivatedRoute

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error', 'info'])
  const configServiceSpy = {
    getProperty: jasmine.createSpy('getProperty').and.returnValue('123'),
    getPortal: jasmine.createSpy('getPortal').and.returnValue({
      themeId: '1234',
      portalName: 'test',
      baseUrl: '/',
      microfrontendRegistrations: []
    })
  }
  const apiServiceSpy = {
    getAnnouncements: jasmine.createSpy('getAnnouncements').and.returnValue(of({})),
    deleteAnnouncementById: jasmine.createSpy('deleteAnnouncementById').and.returnValue(of({}))
  }
  const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['get'])
  const portalServiceSpy = jasmine.createSpyObj('PortalService', ['getCurrentPortalData'])
  portalServiceSpy.getCurrentPortalData.and.returnValue(of([]))

  const newAnnArr: Announcement[] = [
    {
      id: 'id',
      title: 'new'
    }
  ]
  const resultAllAnnouncements: Announcement[] = [
    {
      id: 'id1',
      title: 'ann1',
      appId: 'app1'
    },
    {
      id: 'id2',
      title: 'ann2',
      appId: 'app2'
    },
    {
      id: 'id3',
      title: 'announcement without appId'
    }
  ]

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AnnouncementSearchComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ConfigurationService, useValue: configServiceSpy },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy },
        { provide: PortalService, useValue: portalServiceSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    apiServiceSpy.getAnnouncements.calls.reset()
    apiServiceSpy.deleteAnnouncementById.calls.reset()
    translateServiceSpy.get.calls.reset()
    portalServiceSpy.getCurrentPortalData.calls.reset()
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
      {
        field: 'title',
        header: 'TITLE',
        active: false
      },
      { field: 'appId', header: 'ASSIGNED_TO', active: true }
    ]
    spyOn(component, 'search')

    component.ngOnInit()

    expect(component.search).toHaveBeenCalled()
    expect(component.filteredColumns[0].field).toEqual('appId')
    expect(component.actions[0].label).toEqual('ACTIONS.CREATE.LABEL')
  })

  it('should correctly assign results if API call returns some data', () => {
    apiServiceSpy.getAnnouncements.and.returnValue(of({ stream: [{ id: 'id', title: 'new' }] }))
    component.announcements = []

    component.search({ announcementSearchCriteria: {} })

    expect(component.announcements[0]).toEqual({ id: 'id', title: 'new' })
  })

  it('should search appId', () => {
    apiServiceSpy.getAnnouncements.and.returnValue(of({ stream: resultAllAnnouncements }))
    component.announcements = []
    component.criteria = {
      appId: 'app1'
    }
    const reuseCriteria = false
    const resultApp1Announcements = { id: 'id1', title: 'ann1', appId: 'app1' }

    component.search({ announcementSearchCriteria: component.criteria }, reuseCriteria)
    expect(component.announcements[0]).toEqual(resultApp1Announcements)
  })

  it('should search all', () => {
    apiServiceSpy.getAnnouncements.and.returnValue(of({ stream: resultAllAnnouncements }))
    component.criteria = {
      appId: 'all'
    }
    const resultCriteria = {
      appId: undefined
    }
    const reuseCriteria = false

    component.search({ announcementSearchCriteria: component.criteria }, reuseCriteria)
    expect(component.criteria).toEqual(resultCriteria)
    expect(component.announcements).toEqual(resultAllAnnouncements)
  })

  it('should handle empty announcements on search', () => {
    msgServiceSpy.info.calls.reset()
    apiServiceSpy.getAnnouncements.and.returnValue(of([]))
    component.announcements = []

    component.search({ announcementSearchCriteria: {} })

    expect(component.announcements.length).toEqual(0)
    expect(msgServiceSpy.info).toHaveBeenCalledOnceWith({ summaryKey: 'GENERAL.SEARCH.MSG_NO_RESULTS' })
  })

  it('should handle API call error', () => {
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.getAnnouncements.and.returnValue(throwError(() => new Error()))

    component.search({ announcementSearchCriteria: {} })

    expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'GENERAL.SEARCH.MSG_SEARCH_FAILED' })
  })

  it('should use new criteria if reuseCriteria is false', () => {
    apiServiceSpy.getAnnouncements.and.returnValue(of([]))
    component.criteria = {
      appId: 'appId',
      title: 'title'
    }
    const newCriteria = {
      appId: '',
      title: 'new title'
    }
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
        field: 'appId',
        header: 'APPLICATION_ID'
      },
      {
        field: 'context',
        header: 'CONTEXT'
      }
    ]
    const expectedColumn = { field: 'appId', header: 'APPLICATION_ID' }
    component.columns = columns

    component.onColumnsChange(['appId'])

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

  it('should getAvailablePortals', () => {
    const portals = [
      {
        portalName: 'Portal',
        id: 'portal'
      }
    ]
    portalServiceSpy.getCurrentPortalData.and.returnValue(of(portals))
    component.availablePortals = []

    component.ngOnInit()

    expect(component.availablePortals).toContain({
      label: 'Portal',
      value: 'portal'
    })
  })

  it('should log error if getAvailablePortals fails', () => {
    portalServiceSpy.getCurrentPortalData.and.returnValue(throwError(() => new Error()))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.WORKSPACES.NOT_FOUND'
    })
  })

  it('should verify portal', () => {
    const portals = [
      {
        label: 'Portal',
        value: 'portal'
      }
    ]
    component.availablePortals = portals

    const result = component.isPortal('portal')

    expect(result).toEqual(true)
  })

  it('should getAppIdTranslationKey: return Every workspace', () => {
    const result = component.getAppIdTranslationKey('all')

    expect(result).toEqual('ANNOUNCEMENT.EVERY_WORKSPACE')
  })

  it('should getAppIdTranslationKey: return Not found', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    const result = component.getAppIdTranslationKey(uuid)

    expect(result).toEqual('ANNOUNCEMENT.WORKSPACE_NOT_FOUND')
  })

  it('should getAppIdTranslationKey: return empty string', () => {
    const result = component.getAppIdTranslationKey('anything')

    expect(result).toEqual('')
  })

  it('should getAppName', () => {
    const portals = [
      {
        label: 'Portal',
        value: 'portal'
      }
    ]
    component.availablePortals = portals
    const result = component.getAppName('portal')
    expect(result).toEqual('Portal')
  })

  it('should isPortal', () => {
    const portals = [
      {
        label: 'Portal',
        value: 'portal'
      }
    ]
    component.availablePortals = portals
    const result = component.isPortal('anything-else')
    expect(result).toEqual(false)
  })
})
