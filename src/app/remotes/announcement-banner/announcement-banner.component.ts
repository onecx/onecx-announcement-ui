import { Component, Inject, Input } from '@angular/core'
import { AsyncPipe, Location, NgClass } from '@angular/common'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, Observable, ReplaySubject, catchError, combineLatest, map, mergeMap, of } from 'rxjs'

import { CarouselModule } from 'primeng/carousel'
import { ButtonModule } from 'primeng/button'
import { TooltipModule } from 'primeng/tooltip'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { AppConfigService, AppStateService, UserService } from '@onecx/angular-integration-interface'
import {
  AngularRemoteComponentsModule,
  ocxRemoteComponent,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'

import { AnnouncementAbstract, AnnouncementInternalAPIService, Configuration } from 'src/app/shared/generated'
import { environment } from 'src/environments/environment'
import { Utils } from 'src/app/shared/utils'

@Component({
  selector: 'app-announcement-banner',
  standalone: true,
  imports: [
    AngularAcceleratorModule,
    AngularRemoteComponentsModule,
    // Common Module
    AsyncPipe,
    NgClass,
    // PrimeNG Modules
    CarouselModule,
    ButtonModule,
    TooltipModule,
    TranslateModule
  ],
  templateUrl: './announcement-banner.component.html'
})
export class OneCXAnnouncementBannerComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }
  private readonly ignoredAnnouncementsKey = 'onecx_announcement_banner_ignored_ids'
  private readonly currentDate = new Date().toISOString()
  private readonly announcementsSubject = new BehaviorSubject<AnnouncementAbstract[] | undefined>([])
  public announcements$: Observable<AnnouncementAbstract[] | undefined> = this.announcementsSubject.asObservable()
  public Utils = Utils

  constructor(
    @Inject(REMOTE_COMPONENT_CONFIG)
    private readonly remoteComponentConfig: ReplaySubject<RemoteComponentConfig>,
    private readonly appConfigService: AppConfigService,
    private readonly appStateService: AppStateService,
    private readonly translateService: TranslateService,
    private readonly userService: UserService,
    private readonly announcementApi: AnnouncementInternalAPIService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  // initialize this component as remote
  public ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.announcementApi.configuration = new Configuration({
      basePath: Location.joinWithSlash(config.baseUrl, environment.apiPrefix)
    })
    this.appConfigService.init(config['baseUrl'])
    this.remoteComponentConfig.next(config)
    this.searchWorkspaceAnnouncements()
  }

  private prioValue(prio: string | undefined): number {
    if (prio === 'IMPORTANT') return 3
    if (prio === 'NORMAL') return 2
    else return 1
  }

  private searchWorkspaceAnnouncements() {
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
                        ?.filter((result) => !ignoredAnnouncements.includes(result.id!))
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

  public hide(id: string): void {
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
