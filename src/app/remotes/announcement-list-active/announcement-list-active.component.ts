import { Component, Inject, Input } from '@angular/core'
import { CommonModule, Location } from '@angular/common'
import { HttpClient } from '@angular/common/http'
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
  ocxRemoteWebcomponent,
  provideTranslateServiceForRoot
} from '@onecx/angular-remote-components'
import {
  AppConfigService,
  UserService,
  createRemoteComponentTranslateLoader,
  PortalCoreModule
} from '@onecx/portal-integration-angular'

import { SharedModule } from 'src/app/shared/shared.module'
import { AnnouncementAbstract, AnnouncementInternalAPIService, Configuration } from 'src/app/shared/generated'
import { limitText } from 'src/app/shared/utils'
import { environment } from 'src/environments/environment'

@Component({
  selector: 'app-announcement-list-active',
  standalone: true,
  imports: [
    AngularRemoteComponentsModule,
    CommonModule,
    TranslateModule,
    SharedModule,
    TagModule,
    TooltipModule,
    PortalCoreModule
  ],
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
  private currentDate = new Date().toISOString()
  private announcementsSubject = new BehaviorSubject<AnnouncementAbstract[] | undefined>([])
  announcements$: Observable<AnnouncementAbstract[] | undefined> = this.announcementsSubject.asObservable()

  limitText = limitText

  constructor(
    @Inject(BASE_URL) private baseUrl: ReplaySubject<string>,
    private announcementApi: AnnouncementInternalAPIService,
    private translateService: TranslateService,
    private appStateService: AppStateService,
    private userService: UserService,
    private appConfigService: AppConfigService
  ) {
    this.userService.lang$.subscribe((lang) => this.translateService.use(lang))
    combineLatest([this.baseUrl.asObservable(), this.appStateService.currentWorkspace$.asObservable()])
      .pipe(
        mergeMap(([_, currentWorkspace]) => {
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

  private prioValue(prio: string | undefined): number {
    return prio === 'IMPORTANT' ? 3 : prio === 'NORMAL' ? 2 : 1
  }

  @Input() set ocxRemoteComponentConfig(config: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(config)
  }

  public ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    this.announcementApi.configuration = new Configuration({
      basePath: Location.joinWithSlash(config.baseUrl, environment.apiPrefix)
    })
    this.appConfigService.init(config['baseUrl'])
    this.baseUrl.next(config.baseUrl)
  }
}
