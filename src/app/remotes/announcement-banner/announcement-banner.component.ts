import { ChangeDetectionStrategy, Component, Inject, Input, signal } from '@angular/core'
import { AsyncPipe, Location } from '@angular/common'
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

export type DisplayType = 'full' | 'title'
@Component({
  selector: 'app-announcement-banner',
  standalone: true,
  imports: [
    AngularAcceleratorModule,
    AngularRemoteComponentsModule,
    // Common Module
    AsyncPipe,
    // PrimeNG Modules
    CarouselModule,
    ButtonModule,
    TooltipModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-banner.component.html',
  styleUrl: './announcement-banner.component.scss',
  host: { style: 'width: 100%;' }
})
export class OneCXAnnouncementBannerComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }
  private readonly ignoredAnnouncementsKey = 'onecx_announcement_banner_ignored_ids' // list of ignored announcement IDs
  private readonly displayAnnouncementsKey = 'onecx_announcement_banner_display_type' // type of display: full or title
  private readonly currentDate = new Date().toISOString()
  private readonly announcementsSubject = new BehaviorSubject<AnnouncementAbstract[] | undefined>([])
  public announcements$: Observable<AnnouncementAbstract[] | undefined> = this.announcementsSubject.asObservable()
  public Utils = Utils
  public displayType = signal<DisplayType>('full')

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
    this.displayType.set(this.getAnnouncementDisplayType())
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

  private getIgnoredAnnouncementsIds(): string[] {
    try {
      const ignored = localStorage.getItem(this.ignoredAnnouncementsKey)
      return ignored ? JSON.parse(ignored) : []
    } catch {
      return []
    }
  }

  private getAnnouncementDisplayType(): DisplayType {
    try {
      const type = localStorage.getItem(this.displayAnnouncementsKey)
      return type ? (JSON.parse(type) as DisplayType) : 'full'
    } catch {
      return 'full'
    }
  }

  /**
   * UI ACTIONs
   */
  public onHideItem(id: string): void {
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

  // remove all stored announcements from local storage and refresh the list
  public onRestoreAllItems(): void {
    try {
      localStorage.removeItem(this.ignoredAnnouncementsKey)
      const currentAnnouncements = this.announcementsSubject.value
      this.announcementsSubject.next(currentAnnouncements)
      this.searchWorkspaceAnnouncements()
    } catch (error) {
      console.error('Failed to restore the announcement:', error)
    }
  }

  public onToggleDisplayFull(): void {
    localStorage.removeItem(this.displayAnnouncementsKey)
    this.displayType.set('full')
    console.log('Toggled full view of the announcement banner')
  }

  public onToggleDisplayTitle(): void {
    localStorage.setItem(this.displayAnnouncementsKey, JSON.stringify('title'))
    this.displayType.set('title')
    console.log('Toggled title view of the announcement banner')
  }
}
