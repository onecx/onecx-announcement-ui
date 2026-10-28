import { bootstrapModule } from '@onecx/angular-webcomponents'

import { environment } from 'src/environments/environment'
import { OneCXAnnouncementModule } from './app/onecx-announcement-remote.module'

bootstrapModule(OneCXAnnouncementModule, 'microfrontend', environment.production).catch((err) => console.error(err))
