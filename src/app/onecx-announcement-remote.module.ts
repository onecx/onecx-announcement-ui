import { HttpClient, HttpClientModule } from '@angular/common/http'
import { APP_INITIALIZER, DoBootstrap, Injector, NgModule } from '@angular/core'
import { Router, RouterModule, Routes } from '@angular/router'
import { createCustomElement } from '@angular/elements'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { MissingTranslationHandler, TranslateLoader, TranslateModule } from '@ngx-translate/core'
import {
  AppStateService,
  ConfigurationService,
  createTranslateLoader,
  PortalApiConfiguration,
  PortalCoreModule,
  PortalMissingTranslationHandler
} from '@onecx/portal-integration-angular'
import { addInitializeModuleGuard } from '@onecx/angular-integration-interface'
import { initializeRouter, startsWith } from '@onecx/angular-webcomponents'
import { AngularAuthModule } from '@onecx/angular-auth'
import { AppEntrypointComponent } from './app-entrypoint.component'
import { Configuration } from './shared/generated'
import { environment } from 'src/environments/environment'

function apiConfigProvider(configService: ConfigurationService, appStateService: AppStateService) {
  return new PortalApiConfiguration(Configuration, environment.apiPrefix, configService, appStateService)
}

const routes: Routes = [
  {
    matcher: startsWith(''),
    loadChildren: () => import('./announcement/announcement.module').then((m) => m.AnnouncementModule)
  }
]

@NgModule({
  declarations: [AppEntrypointComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(addInitializeModuleGuard(routes)),
    PortalCoreModule.forMicroFrontend(),
    TranslateModule.forRoot({
      isolate: true,
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient, AppStateService]
      },
      missingTranslationHandler: { provide: MissingTranslationHandler, useClass: PortalMissingTranslationHandler }
    }),
    AngularAuthModule
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
    { provide: Configuration, useFactory: apiConfigProvider, deps: [ConfigurationService, AppStateService] }
  ],
  schemas: []
})
export class OneCXAnnouncementModule implements DoBootstrap {
  constructor(private injector: Injector) {
    console.info('OneCX Announcement Module constructor')
  }

  ngDoBootstrap(): void {
    const appEntrypoint = createCustomElement(AppEntrypointComponent, {
      injector: this.injector
    })
    customElements.define('ocx-announcement-component', appEntrypoint)
  }
}
