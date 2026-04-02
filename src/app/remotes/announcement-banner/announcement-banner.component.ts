import { Component, Inject, Input, NO_ERRORS_SCHEMA } from '@angular/core'
import { Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { TranslateLoader, TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, Observable, ReplaySubject, catchError, combineLatest, map, mergeMap, of } from 'rxjs'
import { CarouselModule } from 'primeng/carousel'

import {
  AngularRemoteComponentsModule,
  ocxRemoteComponent,
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'
import { AppConfigService, AppStateService, UserService } from '@onecx/angular-integration-interface'
import { createTranslateLoader } from '@onecx/angular-utils'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'

import {
  Announcement,
  AnnouncementAbstract,
  AnnouncementInternalAPIService,
  Configuration
} from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'
import { convertLineBreaks } from 'src/app/shared/utils'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-announcement-banner',
  templateUrl: './announcement-banner.component.html',
  styleUrls: ['./announcement-banner.component.scss'],
  standalone: true,
  imports: [AngularRemoteComponentsModule, CarouselModule, AngularAcceleratorModule, SharedModule],
  schemas: [NO_ERRORS_SCHEMA],
  providers: [
    {
      provide: REMOTE_COMPONENT_CONFIG,
      useValue: new ReplaySubject<RemoteComponentConfig>(1)
    },
    provideTranslateServiceForRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient, REMOTE_COMPONENT_CONFIG]
      }
    })
  ]
})
export class OneCXAnnouncementBannerComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }
  private readonly ignoredAnnouncementsKey = 'onecx_announcement_banner_ignored_ids'
  private readonly currentDate = new Date().toISOString()
  public announcementsSubject = new BehaviorSubject<AnnouncementAbstract[] | undefined>([])
  public announcements$: Observable<AnnouncementAbstract[] | undefined> = this.announcementsSubject.asObservable()
  public convertLineBreaks = convertLineBreaks

  constructor(
    @Inject(REMOTE_COMPONENT_CONFIG) private readonly remoteComponentConfig: ReplaySubject<RemoteComponentConfig>,
    private readonly appConfigService: AppConfigService,
    private readonly appStateService: AppStateService,
    private readonly translateService: TranslateService,
    private readonly userService: UserService,
    private readonly announcementApi: AnnouncementInternalAPIService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
    combineLatest([
      this.remoteComponentConfig.asObservable(),
      this.appStateService.currentWorkspace$.asObservable(),
      this.appStateService.currentMfe$.asObservable()
    ])
      .pipe(
        mergeMap(([_, currentWorkspace, currentMfe]) => {
          return currentMfe.productName === 'onecx-welcome'
            ? of([]) // exclude onecx-welcome
            : this.announcementApi
                .searchAnnouncementBanners({
                  announcementBannerSearchCriteria: {
                    workspaceName: currentWorkspace.workspaceName,
                    productName: currentMfe.productName,
                    currentDate: this.currentDate
                  }
                })
                .pipe(
                  map((results) => {
                    const ignoredAnnouncements = this.getIgnoredAnnouncementsIds()
                    return (
                      results.stream
                        // exclude already seen items
                        ?.filter((result: Announcement) => !ignoredAnnouncements.includes(result.id!))
                        // high prio first, low prio last
                        .sort((a, b) => this.prioValue(b.priority) - this.prioValue(a.priority))
                    )
                  }),
                  catchError(() => {
                    return of([])
                  })
                )
        })
      )
      .subscribe((announcements) => this.announcementsSubject.next(announcements))
  }

  private prioValue(prio: string | undefined): number {
    if (prio === 'IMPORTANT') return 3
    if (prio === 'NORMAL') return 2
    else return 1
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.announcementApi.configuration = new Configuration({
      basePath: Location.joinWithSlash(config.baseUrl, environment.apiPrefix)
    })
    this.remoteComponentConfig.next(config)
    this.appConfigService.init(config['baseUrl'])
  }

  hide(id: string): void {
    try {
      const ignoredAnnouncements = this.getIgnoredAnnouncementsIds()

      if (!ignoredAnnouncements.includes(id)) {
        ignoredAnnouncements.push(id)
        localStorage.setItem(this.ignoredAnnouncementsKey, JSON.stringify(ignoredAnnouncements))
        const currentAnnouncements = this.announcementsSubject.value
        this.announcementsSubject.next(currentAnnouncements?.filter((a) => a.id !== id))
      }
    } catch (error) {
      console.error('Failed to hide the announcement:', error)
    }
  }
  private getIgnoredAnnouncementsIds(): string[] {
    try {
      const ignored = localStorage.getItem(this.ignoredAnnouncementsKey)
      return ignored ? JSON.parse(ignored) : []
    } catch {
      return []
    }
  }
}
