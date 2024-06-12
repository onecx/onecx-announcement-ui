// import { enableProdMode } from '@angular/core'
// import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

// import { AppModule } from './app/app.module'
// import { environment } from './environments/environment'

// if (environment.production) {
//   enableProdMode()
// }

// platformBrowserDynamic()
//   .bootstrapModule(AppModule)
//   .catch((err) => console.error(err))

import { bootstrap } from '@angular-architects/module-federation-tools'
import { environment } from 'src/environments/environment'
import { OneCXAnnouncementWebcomponentModule } from './app/onecx-announcement-remote-webcomponent.module'

bootstrap(OneCXAnnouncementWebcomponentModule, {
  production: environment.production,
  appType: 'microfrontend'
})
