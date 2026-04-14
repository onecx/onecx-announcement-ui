import { importProvidersFrom } from '@angular/core'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { provideRouter } from '@angular/router'
import { MissingTranslationHandler, TranslateLoader } from '@ngx-translate/core'
import { ReplaySubject } from 'rxjs'

import { AngularAuthModule } from '@onecx/angular-auth'
import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import {
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig,
  createTranslateLoader,
  provideThemeConfig,
  provideTranslationPathFromMeta
} from '@onecx/angular-utils'
import { provideTranslateServiceForRoot } from '@onecx/angular-remote-components'

import { environment } from 'src/environments/environment'
import { OneCXAnnouncementBannerComponent } from './announcement-banner.component'
import { AngularAcceleratorMissingTranslationHandler } from '@onecx/angular-accelerator'

bootstrapRemoteComponent(
  OneCXAnnouncementBannerComponent,
  'ocx-announcement-banner-component',
  environment.production,
  [
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: REMOTE_COMPONENT_CONFIG,
      useValue: new ReplaySubject<RemoteComponentConfig>(1)
    },
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
    provideTranslateServiceForRoot({
      isolate: true,
      loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: AngularAcceleratorMissingTranslationHandler
      }
    }),
    importProvidersFrom(AngularAuthModule),
    importProvidersFrom(BrowserModule),
    importProvidersFrom(BrowserAnimationsModule),
    provideRouter([{ path: '**', children: [] }]),
    provideThemeConfig()
  ]
)
