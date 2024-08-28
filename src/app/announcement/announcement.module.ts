import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'

import { PortalCoreModule } from '@onecx/portal-integration-angular'
import { InitializeModuleGuard, addInitializeModuleGuard } from '@onecx/angular-integration-interface'
import { SharedModule } from '../shared/shared.module'
import { AnnouncementSearchComponent } from './announcement-search/announcement-search.component'
import { AnnouncementCriteriaComponent } from './announcement-search/announcement-criteria/announcement-criteria.component'
import { AnnouncementDetailComponent } from './announcement-detail/announcement-detail.component'
import { OneCXAnnouncementListActiveComponent } from '../remotes/announcement-list-active/announcement-list-active.component'

const routes: Routes = [
  {
    path: '',
    component: AnnouncementSearchComponent,
    pathMatch: 'full'
  },
  {
    path: 'list-active',
    component: OneCXAnnouncementListActiveComponent,
    pathMatch: 'full'
  }
]
@NgModule({
  declarations: [AnnouncementSearchComponent, AnnouncementDetailComponent, AnnouncementCriteriaComponent],
  imports: [
    CommonModule,
    FormsModule,
    PortalCoreModule.forMicroFrontend(),
    [RouterModule.forChild(addInitializeModuleGuard(routes))],
    SharedModule
  ],
  providers: [InitializeModuleGuard],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class AnnouncementModule {
  constructor() {
    console.info('Announcement Module constructor')
  }
}
