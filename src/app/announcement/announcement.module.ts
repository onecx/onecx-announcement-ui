import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { PortalPageComponent } from '@onecx/angular-utils'

import { LabelResolver } from 'src/app/shared/label.resolver'

import { AnnouncementSearchComponent } from './announcement-search/announcement-search.component'
import { AnnouncementDeleteComponent } from './announcement-delete/announcement-delete.component'
import { OneCXAnnouncementListActiveComponent } from 'src/app/remotes/announcement-list-active/announcement-list-active.component'

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
  imports: [
    AngularAcceleratorModule,
    PortalPageComponent,
    RouterModule.forChild(routes),
    AnnouncementSearchComponent,
    AnnouncementDeleteComponent
  ]
})
export class AnnouncementModule {
  constructor() {}
}
