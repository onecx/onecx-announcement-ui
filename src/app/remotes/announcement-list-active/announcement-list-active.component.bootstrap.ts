import { importProvidersFrom } from '@angular/core'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { provideMissingTranslationHandler, provideTranslateLoader, provideTranslateService } from '@ngx-translate/core'
import { ReplaySubject } from 'rxjs'

import { AngularAuthModule } from '@onecx/angular-auth'
import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import {
  MultiLanguageMissingTranslationHandler,
  OnecxTranslateLoader,
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig,
  provideTranslationPathFromMeta
} from '@onecx/angular-utils'
import { provideThemeConfig } from '@onecx/angular-utils/theme/primeng'

import { environment } from 'src/environments/environment'
import { OneCXAnnouncementListActiveComponent } from './announcement-list-active.component'

bootstrapRemoteComponent(
  OneCXAnnouncementListActiveComponent,
  'ocx-announcement-list-active-component',
  environment.production,
  [
    {
      provide: REMOTE_COMPONENT_CONFIG,
      useValue: new ReplaySubject<RemoteComponentConfig>(1)
    },
    importProvidersFrom(AngularAcceleratorModule, AngularAuthModule, BrowserAnimationsModule),
    provideHttpClient(withInterceptorsFromDi()),
    provideThemeConfig(),
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
    provideTranslateService({
      defaultLanguage: 'en',
      loader: provideTranslateLoader(OnecxTranslateLoader),
      missingTranslationHandler: provideMissingTranslationHandler(MultiLanguageMissingTranslationHandler)
    })
  ]
).catch((err) => console.error(err))
