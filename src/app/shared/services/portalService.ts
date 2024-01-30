import { Observable } from 'rxjs'
import { Portal } from '@onecx/portal-integration-angular'
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'

@Injectable({ providedIn: 'root' })
export class PortalService {
  constructor(private readonly httpClient: HttpClient) {}

  baseUrlInternal = './portal-api/internal/portals'

  getCurrentPortalData(): Observable<Portal[]> {
    return this.httpClient.get<Portal[]>(`${this.baseUrlInternal}`)
  }
}
