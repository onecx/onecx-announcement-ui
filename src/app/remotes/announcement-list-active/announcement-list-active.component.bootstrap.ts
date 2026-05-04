import { importProvidersFrom } from '@angular/core'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { TranslateLoader } from '@ngx-translate/core'
import { ReplaySubject } from 'rxjs'

import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import { AngularAuthModule } from '@onecx/angular-auth'
import { provideTranslateServiceForRoot } from '@onecx/angular-remote-components'
import {
  REMOTE_COMPONENT_CONFIG,
  RemoteComponentConfig,
  createTranslateLoader,
  provideThemeConfig,
  provideTranslationPathFromMeta
} from '@onecx/angular-utils'

import { environment } from 'src/environments/environment'
import { OneCXAnnouncementListActiveComponent } from './announcement-list-active.component'

bootstrapRemoteComponent(
  OneCXAnnouncementListActiveComponent,
  'ocx-announcement-list-active-component',
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
      }
    }),
    importProvidersFrom(AngularAuthModule),
    importProvidersFrom(BrowserModule),
    importProvidersFrom(BrowserAnimationsModule),
    provideThemeConfig()
  ]
)
