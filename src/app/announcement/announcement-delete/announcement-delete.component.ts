import { Component, EventEmitter, Input, Output } from '@angular/core'
import { SelectItem } from 'primeng/api'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { Announcement, AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'

@Component({
  selector: 'app-announcement-delete',
  templateUrl: './announcement-delete.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class AnnouncementDeleteComponent {
  @Input() announcement: Announcement | undefined
  @Input() allWorkspaces: SelectItem[] = []
  @Input() allProducts: SelectItem[] = []
  @Input() visible = false
  @Output() visibleChange = new EventEmitter<boolean>()

  constructor(
    private readonly msgService: PortalMessageService,
    private readonly announcementApi: AnnouncementInternalAPIService
  ) {}

  public getDisplayName(name: string | undefined, list: SelectItem[] | undefined): string | undefined {
    if (name) return list?.find((item) => item.value === name)?.label
    return undefined
  }

  public onDeleteConfirmation(): void {
    if (!this.announcement?.id) return
    this.announcementApi.deleteAnnouncementById({ id: this.announcement.id }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
        this.visible = false
        this.visibleChange.emit(true)
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
        console.error('deleteAnnouncementById', err)
      }
    })
  }
}
