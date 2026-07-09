import { importProvidersFrom } from '@angular/core'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { MissingTranslationHandler, TranslateLoader } from '@ngx-translate/core'
import { ReplaySubject } from 'rxjs'

import { AngularAuthModule } from '@onecx/angular-auth'
import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import { provideTranslateServiceForRoot } from '@onecx/angular-remote-components'
import { AngularAcceleratorModule, AngularAcceleratorMissingTranslationHandler } from '@onecx/angular-accelerator'
import {
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig,
  createTranslateLoader,
  provideThemeConfig,
  provideTranslationPathFromMeta
} from '@onecx/angular-utils'

import { environment } from 'src/environments/environment'
import { OneCXAnnouncementBannerComponent } from './announcement-banner.component'

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
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: AngularAcceleratorMissingTranslationHandler
      }
    }),
    importProvidersFrom(AngularAcceleratorModule, AngularAuthModule, BrowserAnimationsModule),
    provideThemeConfig()
  ]
)
