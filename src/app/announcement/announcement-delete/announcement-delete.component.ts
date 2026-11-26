import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'

import { ButtonModule } from 'primeng/button'
import { DialogModule } from 'primeng/dialog'
import { SelectItem } from 'primeng/api'
import { TooltipModule } from 'primeng/tooltip'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { Announcement, AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'

@Component({
  selector: 'app-announcement-delete',
  standalone: true,
  imports: [ButtonModule, DialogModule, TooltipModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-delete.component.html'
})
export class AnnouncementDeleteComponent {
  @Input() announcement: Announcement | undefined
  @Input() allWorkspaces: SelectItem[] = []
  @Input() allProducts: SelectItem[] = []
  @Input() visible = false
  @Output() visibleChange = new EventEmitter<boolean>()

  public Utils = Utils

  private readonly msgService = inject(PortalMessageService)
  private readonly announcementApi = inject(AnnouncementInternalAPIService)

  public onDeleteConfirmation(): void {
    if (!this.announcement?.id) return
    this.announcementApi.deleteAnnouncementById({ id: this.announcement.id }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
        this.visibleChange.emit(true)
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
        console.error('deleteAnnouncementById', err)
      }
    })
  }
}
