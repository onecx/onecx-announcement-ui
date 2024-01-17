import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { MissingTranslationHandler, TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { MFE_INFO, PortalCoreModule, MyMissingTranslationHandler } from '@onecx/portal-integration-angular'
import { CanActivateGuard } from '../shared/can-active-guard.service'
import { HttpLoaderFactory, SharedModule } from '../shared/shared.module'

import { AnnouncementSearchComponent } from './announcement-search/announcement-search.component'
import { AnnouncementCriteriaComponent } from './announcement-search/announcement-criteria/announcement-criteria.component'
import { AnnouncementDetailComponent } from './announcement-detail/announcement-detail.component'

const routes: Routes = [
  {
    path: '',
    component: AnnouncementSearchComponent,
    canActivate: [CanActivateGuard],
    pathMatch: 'full'
  }
]
@NgModule({
  declarations: [AnnouncementSearchComponent, AnnouncementDetailComponent, AnnouncementCriteriaComponent],
  imports: [
    FormsModule,
    PortalCoreModule.forMicroFrontend(),
    [RouterModule.forChild(routes)],
    SharedModule,
    TranslateModule.forChild({
      isolate: true,
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: MyMissingTranslationHandler
      },
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient, MFE_INFO]
      }
    })
  ],
  providers: [],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class AnnouncementModule {
  constructor() {
    console.info('Announcement Module constructor')
  }
}
