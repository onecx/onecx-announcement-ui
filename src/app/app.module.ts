import { NgModule } from '@angular/core'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { RouterModule, Routes } from '@angular/router'
import { provideMissingTranslationHandler, provideTranslateLoader, provideTranslateService } from '@ngx-translate/core'

import { AngularAuthModule } from '@onecx/angular-auth'
import { APP_CONFIG } from '@onecx/angular-integration-interface'
import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { StandaloneShellModule, provideStandaloneProviders } from '@onecx/angular-standalone-shell'
import {
  MultiLanguageMissingTranslationHandler,
  OnecxTranslateLoader,
  provideTranslationPathFromMeta
} from '@onecx/angular-utils'
import { provideThemeConfig } from '@onecx/angular-utils/theme/primeng'

import { environment } from 'src/environments/environment'
import { AppComponent } from './app.component'

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./announcement/announcement.module').then((m) => m.AnnouncementModule)
  }
]
@NgModule({
  imports: [
    AppComponent,
    AngularAcceleratorModule,
    AngularAuthModule,
    RouterModule.forRoot(routes, {
      initialNavigation: 'enabledBlocking',
      enableTracing: false
    }),
    StandaloneShellModule
  ],
  providers: [
    { provide: APP_CONFIG, useValue: environment },
    provideTranslateService({
      defaultLanguage: 'en',
      loader: provideTranslateLoader(OnecxTranslateLoader),
      missingTranslationHandler: provideMissingTranslationHandler(MultiLanguageMissingTranslationHandler)
    }),
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
    provideHttpClient(withInterceptorsFromDi()),
    provideStandaloneProviders(),
    provideThemeConfig()
  ]
})
export class AppModule {}
