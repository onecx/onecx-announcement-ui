import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { ReplaySubject, of, throwError } from 'rxjs'

import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'
import { AppConfigService, AppStateService } from '@onecx/angular-integration-interface'
import {
  Announcement,
  AnnouncementInternalAPIService,
  AnnouncementPriorityType,
  AnnouncementStatus
} from 'src/app/shared/generated'
import { OneCXAnnouncementBannerComponent } from './announcement-banner.component'
import { AsyncPipe } from '@angular/common'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

class MockAppStateService {
  currentWorkspace$ = { asObservable: () => of({ workspaceName: 'wsName' }) }
  currentMfe$ = { asObservable: () => of({ productName: 'productName' }) }
}

class MockAppStateServiceWelcome {
  currentWorkspace$ = { asObservable: () => of({}) }
  currentMfe$ = { asObservable: () => of({ productName: 'onecx-welcome' }) }
}

const importantAnnouncement: Announcement = {
  id: 'importantAnncmtId',
  priority: AnnouncementPriorityType.Important,
  status: AnnouncementStatus.Active
}
const normalAnnouncement: Announcement = {
  priority: AnnouncementPriorityType.Normal,
  status: AnnouncementStatus.Active
}
const lowPrioAnnouncement: Announcement = {
  priority: AnnouncementPriorityType.Low
}

describe('AnnouncementBannerComponent - common case', () => {
  let component: OneCXAnnouncementBannerComponent
  let fixture: ComponentFixture<OneCXAnnouncementBannerComponent>

  let mockAppStateService: MockAppStateService
  let baseUrlSubject: ReplaySubject<any>
  const announcementApiSpy = {
    searchAnnouncementBanners: jasmine
      .createSpy('searchAnnouncementBanners')
      .and.returnValue(of({ stream: [normalAnnouncement] }))
  }

  function initializeComponent() {
    fixture = TestBed.createComponent(OneCXAnnouncementBannerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(() => {
    mockAppStateService = new MockAppStateService()
    baseUrlSubject = new ReplaySubject<any>(1)

    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        AngularAcceleratorModule,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: REMOTE_COMPONENT_CONFIG, useValue: baseUrlSubject },
        { provide: AppStateService, useValue: mockAppStateService }
      ]
    })
      .overrideComponent(OneCXAnnouncementBannerComponent, {
        add: {
          providers: [{ provide: AnnouncementInternalAPIService, useValue: announcementApiSpy }]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')
  })

  afterEach(() => {
    announcementApiSpy.searchAnnouncementBanners.calls.reset()
  })

  it('should create', () => {
    initializeComponent()
    expect(component).toBeTruthy()
  })

  describe('get data', () => {
    it('should load announcements when the component starts', () => {
      announcementApiSpy.searchAnnouncementBanners.and.returnValue(
        of({ stream: [normalAnnouncement, lowPrioAnnouncement, importantAnnouncement] })
      )

      initializeComponent()
      component['searchWorkspaceAnnouncements']()

      expect(component).toBeTruthy()
      component['announcementsSubject'].subscribe((anncmts) => {
        expect(anncmts).toEqual([importantAnnouncement, normalAnnouncement, lowPrioAnnouncement])
      })
    })

    it('should catch an error if loading announcements fails', () => {
      announcementApiSpy.searchAnnouncementBanners.and.returnValue(throwError(() => new Error()))

      initializeComponent()

      expect(component).toBeTruthy()
      component['announcementsSubject'].subscribe((anncmts) => {
        expect(anncmts).toEqual([])
      })
    })
  })

  describe('RemoteComponent initialization', () => {
    it('should call ocxInitRemoteComponent with the correct config', () => {
      initializeComponent()

      const mockConfig: RemoteComponentConfig = {
        appId: 'appId',
        productName: 'prodName',
        permissions: ['permission'],
        baseUrl: 'base'
      }
      spyOn(component, 'ocxInitRemoteComponent')

      component.ocxRemoteComponentConfig = mockConfig

      expect(component.ocxInitRemoteComponent).toHaveBeenCalledWith(mockConfig)
    })

    it('should initialize the remote component', (done: DoneFn) => {
      initializeComponent()

      component.ocxInitRemoteComponent({
        baseUrl: 'base_url'
      } as RemoteComponentConfig)

      baseUrlSubject.asObservable().subscribe((item) => {
        expect(item).toEqual(jasmine.objectContaining({ baseUrl: 'base_url' }))
        done()
      })
    })
  })

  describe('hide - ignored announcements are not displayed', () => {
    it('should hide the announcement', () => {
      initializeComponent()

      component['announcementsSubject'].next([{ id: 'announcement1' }, { id: 'announcement2' }])
      spyOn(localStorage, 'setItem').and.callFake(() => {})
      spyOn(component as any, 'getIgnoredAnnouncementsIds').and.returnValue([])

      const id = 'announcement1'
      component.hide(id)

      expect(localStorage.setItem).toHaveBeenCalledWith(component['ignoredAnnouncementsKey'], JSON.stringify([id]))
    })

    it('should log an error if an anncmt could not be hidden (an exception is thrown in the try block)', () => {
      initializeComponent()

      const error = new Error('test error')
      spyOn(localStorage, 'setItem').and.throwError(error.message)
      spyOn(console, 'error')

      component.hide('some id')

      expect(console.error).toHaveBeenCalledWith('Failed to hide the announcement:', error)
    })

    describe('getIgnoredAnnouncementIds', () => {
      it('should return ignored anncmt id', () => {
        initializeComponent()

        const ignoredIds = ['id1', 'id2', 'id3']
        spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(ignoredIds))

        const result = component['getIgnoredAnnouncementsIds']()

        expect(result).toEqual(ignoredIds)
      })

      it('should return an empty array on error', () => {
        initializeComponent()

        const error = new Error('test error')
        spyOn(localStorage, 'getItem').and.throwError(error.message)

        const result = component['getIgnoredAnnouncementsIds']()

        expect(result).toEqual([])
      })
    })
  })
})

describe('AnnouncementBannerComponent - on welcome product', () => {
  let component: OneCXAnnouncementBannerComponent
  let fixture: ComponentFixture<OneCXAnnouncementBannerComponent>
  let mockAppStateService: MockAppStateServiceWelcome
  let baseUrlSubject: ReplaySubject<any>

  const announcementApiSpy = {
    searchAnnouncementBanners: jasmine
      .createSpy('searchAnnouncementBanners')
      .and.returnValue(of({ stream: [normalAnnouncement] }))
  }

  beforeEach(() => {
    baseUrlSubject = new ReplaySubject<any>(1)
    mockAppStateService = new MockAppStateServiceWelcome()

    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: REMOTE_COMPONENT_CONFIG, useValue: baseUrlSubject }
      ]
    })
      .overrideComponent(OneCXAnnouncementBannerComponent, {
        set: {
          imports: [TranslateTestingModule, AsyncPipe],
          providers: [
            { provide: AnnouncementInternalAPIService, useValue: announcementApiSpy },
            { provide: AppConfigService },
            { provide: AppStateService, useValue: mockAppStateService }
          ]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')

    announcementApiSpy.searchAnnouncementBanners.calls.reset()
  })

  function initializeComponent() {
    fixture = TestBed.createComponent(OneCXAnnouncementBannerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  it('should load announcements when the component starts', () => {
    initializeComponent()
    component['searchWorkspaceAnnouncements']()

    expect(component).toBeTruthy()
    component['announcementsSubject'].subscribe((anncmts) => {
      expect(anncmts).toEqual([])
    })
  })
})
