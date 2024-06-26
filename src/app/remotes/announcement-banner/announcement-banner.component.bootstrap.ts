import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { importProvidersFrom } from '@angular/core'
import { OneCXAnnouncementBannerComponent } from './announcement-banner.component'
import { bootstrapRemoteComponent } from '@onecx/angular-webcomponents'
import { AngularAuthModule } from '@onecx/angular-auth'

bootstrapRemoteComponent(OneCXAnnouncementBannerComponent, 'ocx-announcement-banner-component', [
  provideHttpClient(withInterceptorsFromDi()),
  importProvidersFrom(AngularAuthModule)
])
