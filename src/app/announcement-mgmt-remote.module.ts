import { Inject, NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'

import { MFE_INFO, MfeInfo, PortalCoreModule } from '@onecx/portal-integration-angular'

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./announcement/announcement.module').then((m) => m.AnnouncementModule)
  }
]
@NgModule({
  imports: [PortalCoreModule.forMicroFrontend(), RouterModule.forChild(routes)],
  exports: [],
  providers: [],
  schemas: []
})
export class AnnouncementMgmtModule {
  constructor(@Inject(MFE_INFO) mfeInfo?: MfeInfo) {
    console.info('Announcement Mgmt Module constructor', mfeInfo)
  }
}
