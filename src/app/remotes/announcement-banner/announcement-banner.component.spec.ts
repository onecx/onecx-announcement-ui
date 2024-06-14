import { ComponentFixture, TestBed } from '@angular/core/testing'

import { ReplaySubject, of } from 'rxjs'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { CarouselModule } from 'primeng/carousel'
import { TagModule } from 'primeng/tag'
// import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'

import { BASE_URL /* , RemoteComponentConfig */ } from '@onecx/angular-remote-components'
import { AppConfigService, AppStateService } from '@onecx/portal-integration-angular'
import { OneCXAnnouncementBannerComponent } from './announcement-banner.component'
import { AnnouncementInternalAPIService } from 'src/app/shared/generated'

class MockAppStateService {
  currentPortal$ = of({
    workspaceName: 'wsName'
  })
}

describe('AnnouncementBannerComponent', () => {
  let component: OneCXAnnouncementBannerComponent
  let fixture: ComponentFixture<OneCXAnnouncementBannerComponent>
  let mockAppStateService: MockAppStateService

  const apiServiceSpy = {
    searchActiveAnnouncements: jasmine.createSpy('searchActiveAnnouncements').and.returnValue(of({}))
  }

  let baseUrlSubject: ReplaySubject<any>
  beforeEach(() => {
    mockAppStateService = new MockAppStateService()
    baseUrlSubject = new ReplaySubject<any>(1)

    TestBed.configureTestingModule({
      declarations: [],
      imports: [
        TranslateTestingModule.withTranslations({
          en: require('../../../assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      providers: [
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

    apiServiceSpy.searchActiveAnnouncements.calls.reset()
  })

  it('should create', () => {
    fixture = TestBed.createComponent(OneCXAnnouncementBannerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })
})
