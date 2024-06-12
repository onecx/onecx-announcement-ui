import { HttpClient, HttpClientModule } from '@angular/common/http'
import { APP_INITIALIZER, DoBootstrap, Injector, NgModule } from '@angular/core'
import { provideRouter, Router, Routes } from '@angular/router'
import { MissingTranslationHandler, TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { createCustomElement } from '@angular/elements'

import {
  AppStateService,
  ConfigurationService,
  createTranslateLoader,
  PortalCoreModule,
  PortalMissingTranslationHandler
} from '@onecx/portal-integration-angular'
import { AppEntrypointComponent } from './app-entrypoint.component'
import { BrowserModule } from '@angular/platform-browser'
import { firstValueFrom, map } from 'rxjs'
import { match } from './router.utils'

function initializeRouter(router: Router, appStateService: AppStateService) {
  return () =>
    firstValueFrom(
      appStateService.currentMfe$.asObservable().pipe(
        map((mfeInfo) => {
          const routes = router.config
          routes.forEach((route) => {
            route.data = {
              ...route.data,
              mfeInfo: mfeInfo
            }
          })
          router.resetConfig(routes)
        })
      )
    )
}

const routes: Routes = [
  {
    matcher: match(''),
    loadChildren: () => import('./announcement/announcement.module').then((m) => m.AnnouncementModule)
  }
]
@NgModule({
  declarations: [AppEntrypointComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    PortalCoreModule.forMicroFrontend(),
    // RouterModule.forChild(addInitializeModuleGuard(routes)),
    TranslateModule.forRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient, AppStateService]
      },
      missingTranslationHandler: { provide: MissingTranslationHandler, useClass: PortalMissingTranslationHandler }
    })
  ],
  exports: [],
  providers: [
    ConfigurationService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeRouter,
      multi: true,
      deps: [Router, AppStateService]
    },
    provideRouter(routes)
  ],
  schemas: []
})
export class OneCXAnnouncementWebcomponentModule implements DoBootstrap {
  constructor(private injector: Injector) {
    console.info('OneCX Announcement Webcomponent Module constructor')
  }

  ngDoBootstrap(): void {
    const appEntrypoint = createCustomElement(AppEntrypointComponent, {
      injector: this.injector
    })
    customElements.define('ocx-announcement-component', appEntrypoint)
  }
}
