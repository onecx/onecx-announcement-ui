import { importProvidersFrom } from '@angular/core'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { provideAnimations } from '@angular/platform-browser/animations'

import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import { AngularAuthModule } from '@onecx/angular-auth'

import { environment } from 'src/environments/environment'
import { OneCXAnnouncementListActiveComponent } from './announcement-list-active.component'

bootstrapRemoteComponent(
  OneCXAnnouncementListActiveComponent,
  'ocx-announcement-list-active-component',
  environment.production,
  [provideHttpClient(withInterceptorsFromDi()), importProvidersFrom(AngularAuthModule), provideAnimations()]
)
