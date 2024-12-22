import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule, Routes } from '@angular/router'

import { InitializeModuleGuard, addInitializeModuleGuard } from '@onecx/angular-integration-interface'
import { PortalCoreModule } from '@onecx/portal-integration-angular'

import { SharedModule } from 'src/app/shared/shared.module'

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
    path: 'list',
    component: OneCXAnnouncementListActiveComponent,
    pathMatch: 'full'
  }
]
@NgModule({
  declarations: [AnnouncementSearchComponent, AnnouncementDetailComponent, AnnouncementCriteriaComponent],
  imports: [
    CommonModule,
    PortalCoreModule.forMicroFrontend(),
    [RouterModule.forChild(addInitializeModuleGuard(routes))],
    SharedModule
  ],
  providers: [InitializeModuleGuard]
})
export class AnnouncementModule {
  constructor() {
    console.info('Announcement Module constructor')
  }
}
