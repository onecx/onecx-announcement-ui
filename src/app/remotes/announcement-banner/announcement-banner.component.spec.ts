import { ComponentFixture, TestBed } from '@angular/core/testing'

import { OneCXAnnouncementBannerComponent } from './announcement-banner.component'

describe('AnnouncementBannerComponent', () => {
  let component: OneCXAnnouncementBannerComponent
  let fixture: ComponentFixture<OneCXAnnouncementBannerComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OneCXAnnouncementBannerComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(OneCXAnnouncementBannerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
