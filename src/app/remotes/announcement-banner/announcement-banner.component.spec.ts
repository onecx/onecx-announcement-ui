import { ComponentFixture, TestBed } from '@angular/core/testing'

import { OneCXAnnouncementBannerComponent } from './announcement-banner.component'
import { HttpClientTestingModule } from '@angular/common/http/testing'

describe('AnnouncementBannerComponent', () => {
  let component: OneCXAnnouncementBannerComponent
  let fixture: ComponentFixture<OneCXAnnouncementBannerComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OneCXAnnouncementBannerComponent, HttpClientTestingModule]
    }).compileComponents()

    fixture = TestBed.createComponent(OneCXAnnouncementBannerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
