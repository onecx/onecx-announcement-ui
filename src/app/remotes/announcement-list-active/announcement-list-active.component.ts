import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject, Input } from '@angular/core'
import { BehaviorSubject, Observable, ReplaySubject, catchError, combineLatest, map, mergeMap, of } from 'rxjs'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'

import { TagModule } from 'primeng/tag'
import { TooltipModule } from 'primeng/tooltip'

import { AppStateService } from '@onecx/angular-integration-interface'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  provideTranslateServiceForRoot,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { AppConfigService, UserService, createRemoteComponentTranslateLoader } from '@onecx/portal-integration-angular'
import {
  Announcement,
  AnnouncementAbstract,
  AnnouncementInternalAPIService,
  Configuration
} from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-announcement-list-active',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, TranslateModule, SharedModule, TagModule, TooltipModule],
  providers: [
    {
      provide: BASE_URL,
      useValue: new ReplaySubject<string>(1)
    },
    provideTranslateServiceForRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createRemoteComponentTranslateLoader,
        deps: [HttpClient, BASE_URL]
      }
    })
  ],
  templateUrl: './announcement-list-active.component.html',
  styleUrls: ['./announcement-list-active.component.scss']
})
export class OneCXAnnouncementListActiveComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  private ignoredAnnouncementsKey = 'onecx_announcement_banner_ignored_ids'
  private currentDate = new Date().toISOString()
  private announcementsSubject = new BehaviorSubject<AnnouncementAbstract[] | undefined>([])
  announcements$: Observable<AnnouncementAbstract[] | undefined> = this.announcementsSubject.asObservable()

  constructor(
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private translateService: TranslateService,
    private apiV1: AnnouncementInternalAPIService,
    private appStateService: AppStateService,
    private userService: UserService,
    private appConfigService: AppConfigService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
    combineLatest([
      this.baseUrl.asObservable(),
      this.appStateService.currentPortal$.asObservable(),
      this.appStateService.currentMfe$.asObservable()
    ])
      .pipe(
        mergeMap(([_, currentWorkspace, currentMfe]) => {
          return this.apiV1
            .searchAnnouncementBanners({
              announcementBannerSearchCriteria: {
                workspaceName: currentWorkspace.workspaceName,
                currentDate: this.currentDate
              }
            })
            .pipe(
              map((results) => {
                const ignoredAnnouncements = this.getIgnoredAnnouncementsIds()
                return results.stream?.filter((result: Announcement) => !ignoredAnnouncements.includes(result.id!))
              }),
              catchError(() => {
                return of([])
              })
            )
        })
      )
      .subscribe((announcements) => this.announcementsSubject.next(announcements))
  }

  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.apiV1.configuration = new Configuration({
      basePath: Location.joinWithSlash(config.baseUrl, environment.apiPrefix)
    })
    this.baseUrl.next(config.baseUrl)
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
