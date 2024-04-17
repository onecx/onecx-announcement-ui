import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RemoteComponentConfig, ocxRemoteComponent } from '@onecx/angular-remote-components'

@Component({
  selector: 'app-announcement-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './announcement-banner.component.html'
})
export class OneCXAnnouncementBannerComponent implements ocxRemoteComponent {
  ocxInitRemoteComponent(config: RemoteComponentConfig): void {
    throw new Error('Method not implemented.')
  }
}
