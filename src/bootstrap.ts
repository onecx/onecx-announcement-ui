import { bootstrap } from '@angular-architects/module-federation-tools'
import { environment } from 'src/environments/environment'
import { OneCXAnnouncementModule } from './app/onecx-announcement-remote.module'

bootstrap(OneCXAnnouncementModule, {
  production: environment.production,
  appType: 'microfrontend'
})
