import { TestBed } from '@angular/core/testing'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { PortalService } from './portalService'
import { Portal } from '@onecx/portal-integration-angular'

describe('PortalService', () => {
  let service: PortalService
  let httpTestingController: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PortalService]
    })

    service = TestBed.inject(PortalService)
    httpTestingController = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    httpTestingController.verify()
  })

  it('should retrieve current portal data', () => {
    const mockPortals: Portal[] = [
      {
        portalName: 'AH_MGMT',
        id: 'help-mgmt',
        baseUrl: '',
        microfrontendRegistrations: [{ mfeId: 'hm', baseUrl: 'ahm' }]
      }
    ]

    service.getCurrentPortalData().subscribe((portals) => {
      expect(portals).toEqual(mockPortals)
    })

    const req = httpTestingController.expectOne('./portal-api/internal/portals')
    expect(req.request.method).toEqual('GET')
    req.flush(mockPortals)
  })
})
