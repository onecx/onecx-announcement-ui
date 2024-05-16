import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Inject } from '@angular/core'
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core'
import { AppStateService } from '@onecx/angular-integration-interface'
import {
  AngularRemoteComponentsModule,
  BASE_URL,
  RemoteComponentConfig,
  ocxRemoteComponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import { AppConfigService, UserService, createRemoteComponentTranslateLoader } from '@onecx/portal-integration-angular'
import { CarouselModule } from 'primeng/carousel'
import { TagModule } from 'primeng/tag'
import { BehaviorSubject, Observable, ReplaySubject, catchError, map, mergeMap, of } from 'rxjs'
import { Announcement, AnnouncementInternalAPIService, Configuration } from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-announcement-banner',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, TranslateModule, SharedModule, CarouselModule, TagModule],
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
  templateUrl: './announcement-banner.component.html'
})
export class OneCXAnnouncementBannerComponent implements ocxRemoteComponent {
  private ignoredAnnouncementsKey = 'onecx_announcement_ignored_ids'
  private currentDate = new Date().toISOString()
  private announcementsSubject = new BehaviorSubject<Announcement[]>([])
  announcements$: Observable<Announcement[]> = this.announcementsSubject.asObservable()

  constructor(
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private translateService: TranslateService,
    private appConfigService: AppConfigService,
    private apiV1: AnnouncementInternalAPIService,
    private appStateService: AppStateService,
    private userService: UserService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))

    this.appStateService.currentPortal$
      .pipe(
        mergeMap((currentWorkspace) =>
          this.apiV1
            .searchActiveAnnouncements({
              activeAnnouncementsSearchCriteria: {
                workspaceName: currentWorkspace.portalName,
                currentDate: this.currentDate
              }
            })
            .pipe(
              map((results) => {
                const ignoredAnnouncements = this.getIgnoredAnnouncementsIds()
                return results.stream!.filter((result) => !ignoredAnnouncements.includes(result.id!))
              }),
              catchError(() => {
                return of([])
              })
            )
        )
      )
      .subscribe((announcements) => this.announcementsSubject.next(announcements))
  }

  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.baseUrl.next(config.baseUrl)
    this.appConfigService.init(config['baseUrl'])
    this.apiV1.configuration = new Configuration({
      basePath: Location.joinWithSlash(config.baseUrl, environment.apiPrefix)
    })
  }

  hide(id: string): void {
    try {
      const ignoredAnnouncements = this.getIgnoredAnnouncementsIds()

      if (!ignoredAnnouncements.includes(id)) {
        ignoredAnnouncements.push(id)
        localStorage.setItem(this.ignoredAnnouncementsKey, JSON.stringify(ignoredAnnouncements))
        const currentAnnouncements = this.announcementsSubject.value
        this.announcementsSubject.next(currentAnnouncements.filter((a) => a.id !== id))
      }
    } catch (error) {
      console.error('Failed to hide the announcement:', error)
    }
  }

  getPriorityClasses(announcement: Announcement, bgOnly: boolean = false) {
    switch (announcement.priority) {
      case 'IMPORTANT':
        return bgOnly ? 'bg-red-800' : 'bg-red-200 text-red-800'
      case 'NORMAL':
        return bgOnly ? 'bg-orange-800' : 'bg-orange-200 text-orange-800'
      default:
        return bgOnly ? 'bg-green-800' : 'bg-green-200 text-green-800'
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
