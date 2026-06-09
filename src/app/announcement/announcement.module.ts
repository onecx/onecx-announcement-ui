import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule, Routes } from '@angular/router'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { PortalPageComponent, providePermissionService } from '@onecx/angular-utils'

import { SharedModule } from 'src/app/shared/shared.module'
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
    CommonModule,
    AngularAcceleratorModule,
    PortalPageComponent,
    RouterModule.forChild(routes),
    SharedModule,
    AnnouncementSearchComponent,
    AnnouncementDeleteComponent
  ],
  providers: [...providePermissionService()]
})
export class AnnouncementModule {
  constructor() {
    console.info('Announcement Module constructor')
  }
}
