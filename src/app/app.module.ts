import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { RouterModule, Routes } from '@angular/router'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { AngularAuthModule } from '@onecx/angular-auth'
import {
  createTranslateLoader,
  provideThemeConfig,
  provideTranslationConnectionService,
  provideTranslationPathFromMeta
} from '@onecx/angular-utils'
import { APP_CONFIG } from '@onecx/angular-integration-interface'
import { AngularAcceleratorMissingTranslationHandler, AngularAcceleratorModule } from '@onecx/angular-accelerator'

import { environment } from 'src/environments/environment'
import { AppComponent } from './app.component'

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./announcement/announcement.module').then((m) => m.AnnouncementModule)
  }
]
@NgModule({
  bootstrap: [AppComponent],
  declarations: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    AngularAuthModule,
    AngularAcceleratorModule,
    RouterModule.forRoot(routes, {
      initialNavigation: 'enabledBlocking',
      enableTracing: true
    }),
    TranslateModule.forRoot({
      isolate: true,
      loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] }
    })
  ],
  providers: [
    { provide: APP_CONFIG, useValue: environment },
    provideTranslationPathFromMeta(import.meta.url, 'assets/i18n/'),
    provideHttpClient(withInterceptorsFromDi()),
    provideThemeConfig(),
    provideAnimations()
  ]
})
export class AppModule {
  constructor() {
    console.info('OneCX Announcement Module constructor')
  }
}
