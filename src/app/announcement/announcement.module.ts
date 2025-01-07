import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule, Routes } from '@angular/router'

import { PortalCoreModule } from '@onecx/portal-integration-angular'
import { addInitializeModuleGuard, InitializeModuleGuard } from '@onecx/angular-integration-interface'

import { SharedModule } from 'src/app/shared/shared.module'
import { LabelResolver } from 'src/app/shared/label.resolver'

import { AnnouncementSearchComponent } from './announcement-search/announcement-search.component'
import { AnnouncementCriteriaComponent } from './announcement-search/announcement-criteria/announcement-criteria.component'
import { AnnouncementDetailComponent } from './announcement-detail/announcement-detail.component'
import { OneCXAnnouncementListActiveComponent } from '../remotes/announcement-list-active/announcement-list-active.component'

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: AnnouncementSearchComponent,
    data: {
      breadcrumb: 'BREADCRUMBS.SEARCH',
      breadcrumbFn: (data: any) => `${data.labeli18n}`
    },
    resolve: {
      labeli18n: LabelResolver
    }
  },
  {
    path: 'list',
    pathMatch: 'full',
    component: OneCXAnnouncementListActiveComponent
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
