import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { ReplaySubject, of, throwError } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { CarouselModule } from 'primeng/carousel'
import { TagModule } from 'primeng/tag'

import { BASE_URL, RemoteComponentConfig } from '@onecx/angular-remote-components'
import { AppConfigService, AppStateService } from '@onecx/angular-integration-interface'
import {
  Announcement,
  AnnouncementInternalAPIService,
  AnnouncementPriorityType,
  AnnouncementStatus
} from 'src/app/shared/generated'
import { OneCXAnnouncementBannerComponent } from './announcement-banner.component'

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

  const apiServiceSpy = {
    searchAnnouncementBanners: jasmine
      .createSpy('searchAnnouncementBanners')
      .and.returnValue(of({ stream: [normalAnnouncement] }))
  }

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(() => {
    mockAppStateService = new MockAppStateService()
    baseUrlSubject = new ReplaySubject<any>(1)

    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        TranslateTestingModule.withTranslations({
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppStateService, useValue: mockAppStateService },
        { provide: BASE_URL, useValue: baseUrlSubject }
      ]
    })
      .overrideComponent(OneCXAnnouncementBannerComponent, {
        set: {
          imports: [TranslateTestingModule, CarouselModule, TagModule],
          providers: [
            { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy },
            { provide: AppConfigService },
            { provide: AppStateService, useValue: mockAppStateService }
          ]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')

    apiServiceSpy.searchAnnouncementBanners.calls.reset()
  })

  function initializeComponent() {
    fixture = TestBed.createComponent(OneCXAnnouncementBannerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  it('should create', () => {
    initializeComponent()
    expect(component).toBeTruthy()
  })

  it('should load announcements when the component starts', () => {
    apiServiceSpy.searchAnnouncementBanners.and.returnValue(
      of({ stream: [normalAnnouncement, lowPrioAnnouncement, importantAnnouncement] })
    )

    initializeComponent()

    expect(component).toBeTruthy()
    component.announcementsSubject.subscribe((anncmts) => {
      expect(anncmts).toEqual([importantAnnouncement, normalAnnouncement, lowPrioAnnouncement])
    })
  })

  it('should catch an error if loading announcements fails', () => {
    apiServiceSpy.searchAnnouncementBanners.and.returnValue(throwError(() => new Error()))

    initializeComponent()

    expect(component).toBeTruthy()
    component['announcementsSubject'].subscribe((anncmts) => {
      expect(anncmts).toEqual([])
    })
  })

  describe('RemoteComponent initialization', () => {
    it('should call ocxInitRemoteComponent with the correct config', () => {
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
        expect(item).toEqual('base_url')
        done()
      })
    })
  })

  describe('hide - ignored announcements are not displayed', () => {
    it('should hide the announcement', () => {
      const mockAnnouncementsSubject = {
        value: [{ id: 'announcement1' }, { id: 'announcement2' }],
        next: jasmine.createSpy('next')
      }
      component['announcementsSubject'] = mockAnnouncementsSubject as any
      spyOn(localStorage, 'setItem').and.callFake(() => {})
      spyOn(component as any, 'getIgnoredAnnouncementsIds').and.returnValue([])

      const id = 'announcement1'
      component.hide(id)

      expect(localStorage.setItem).toHaveBeenCalledWith(component['ignoredAnnouncementsKey'], JSON.stringify([id]))
      expect(mockAnnouncementsSubject.next).toHaveBeenCalledWith([{ id: 'announcement2' }])
    })

    it('should log an error if an anncmt could not be hidden (an exception is thrown in the try block)', () => {
      const error = new Error('test error')
      spyOn(localStorage, 'setItem').and.throwError(error.message)
      spyOn(console, 'error')

      component.hide('some id')

      expect(console.error).toHaveBeenCalledWith('Failed to hide the announcement:', error)
    })

    describe('getIgnoredAnnouncementIds', () => {
      it('should return ignored anncmt id', () => {
        const ignoredIds = ['id1', 'id2', 'id3']
        spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(ignoredIds))

        const result = component['getIgnoredAnnouncementsIds']()

        expect(result).toEqual(ignoredIds)
      })

      it('should return an empty array on error', () => {
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

  const apiServiceSpy = {
    searchAnnouncementBanners: jasmine
      .createSpy('searchAnnouncementBanners')
      .and.returnValue(of({ stream: [normalAnnouncement] }))
  }

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(() => {
    mockAppStateService = new MockAppStateServiceWelcome()
    baseUrlSubject = new ReplaySubject<any>(1)

    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        TranslateTestingModule.withTranslations({
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
        { provide: AppStateService, useValue: MockAppStateServiceWelcome },
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BASE_URL,
          useValue: baseUrlSubject
        }
      ]
    })
      .overrideComponent(OneCXAnnouncementBannerComponent, {
        set: {
          imports: [TranslateTestingModule, CarouselModule, TagModule],
          providers: [
            { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy },
            { provide: AppConfigService },
            { provide: AppStateService, useValue: mockAppStateService }
          ]
        }
      })
      .compileComponents()

    baseUrlSubject.next('base_url_mock')

    apiServiceSpy.searchAnnouncementBanners.calls.reset()
  })

  function initializeComponent() {
    fixture = TestBed.createComponent(OneCXAnnouncementBannerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  it('should load announcements when the component starts', () => {
    initializeComponent()

    expect(component).toBeTruthy()
    component['announcementsSubject'].subscribe((anncmts) => {
      expect(anncmts).toEqual([])
    })
  })
})
