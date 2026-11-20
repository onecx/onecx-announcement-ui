import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core'
import { AsyncPipe, Location } from '@angular/common'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, Observable, ReplaySubject, catchError, map, mergeMap, of } from 'rxjs'

import { MessageModule } from 'primeng/message'
import { PopoverModule } from 'primeng/popover'

import { AppConfigService, AppStateService, UserService } from '@onecx/angular-integration-interface'
import {
  AngularRemoteComponentsModule,
  ocxRemoteComponent,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'

import { AnnouncementAbstract, AnnouncementInternalAPIService, Configuration } from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-announcement-list-active',
  standalone: true,
  imports: [
    AngularAcceleratorModule,
    AngularRemoteComponentsModule,
    AsyncPipe,
    MessageModule,
    PopoverModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-list-active.component.html',
  styleUrl: './announcement-list-active.component.scss'
})
export class OneCXAnnouncementListActiveComponent implements ocxRemoteComponent, ocxRemoteWebcomponent {
  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }
  private readonly currentDate = new Date().toISOString()
  private readonly announcementsSubject = new BehaviorSubject<AnnouncementAbstract[] | undefined>([])
  public announcements$: Observable<AnnouncementAbstract[] | undefined> = this.announcementsSubject.asObservable()
  public convertLineBreaks = Utils.convertLineBreaks
  public displayDetailDialog = false

  private readonly remoteComponentConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly appConfigService = inject(AppConfigService)
  private readonly appStateService = inject(AppStateService)
  private readonly translateService = inject(TranslateService)
  private readonly userService = inject(UserService)
  private readonly announcementApi = inject(AnnouncementInternalAPIService)

  constructor() {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
  }

  public ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.announcementApi.configuration = new Configuration({
      basePath: Location.joinWithSlash(config.baseUrl, environment.apiPrefix)
    })
    this.appConfigService.init(config['baseUrl']).catch((err) => console.error(err))
    this.remoteComponentConfig.next(config)
    this.searchWorkspaceAnnouncements()
  }

  private prioValue(prio: string | undefined): number {
    if (prio === 'IMPORTANT') return 3
    if (prio === 'NORMAL') return 2
    else return 1
  }

  private searchWorkspaceAnnouncements() {
    this.appStateService.currentWorkspace$
      .asObservable()
      .pipe(
        mergeMap((currentWorkspace) => {
          return this.announcementApi
            .searchAnnouncementBanners({
              announcementBannerSearchCriteria: {
                workspaceName: currentWorkspace.workspaceName,
                currentDate: this.currentDate
              }
            })
            .pipe(
              map((results) => {
                return (
                  results.stream
                    // exclude product specific announcements
                    ?.filter((ann) => !ann.productName)
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
}
