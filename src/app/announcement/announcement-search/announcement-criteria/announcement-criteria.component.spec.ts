import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { FormControl, FormGroup } from '@angular/forms'

import { ConfigurationService } from '@onecx/portal-integration-angular'
import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { AnnouncementPriorityType, AnnouncementStatus, AnnouncementType } from 'src/app/shared/generated'
import { AnnouncementCriteriaComponent, AnnouncementCriteriaForm } from './announcement-criteria.component'

describe('AnnouncementCriteriaComponent', () => {
  let component: AnnouncementCriteriaComponent
  let fixture: ComponentFixture<AnnouncementCriteriaComponent>

  const configServiceSpy = {
    getProperty: jasmine.createSpy('getProperty').and.returnValue('123'),
    getPortal: jasmine.createSpy('getPortal').and.returnValue({
      themeId: '1234',
      portalName: 'test',
      baseUrl: '/',
      microfrontendRegistrations: []
    })
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AnnouncementCriteriaComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: ConfigurationService, useValue: configServiceSpy }]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnouncementCriteriaComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should handle criteria on submitCriteria if formGroup values empty', () => {
    const newCriteriaGroup = new FormGroup<AnnouncementCriteriaForm>({
      title: new FormControl<string | null>(null),
      appId: new FormControl<string | null>(null),
      status: new FormControl<AnnouncementStatus[] | null>(null),
      type: new FormControl<AnnouncementType[] | null>(null),
      priority: new FormControl<AnnouncementPriorityType[] | null>(null),
      startDateRange: new FormControl<Date[] | null>([new Date('2023-01-02'), new Date('2023-01-03')])
    })
    component.announcementCriteriaGroup = newCriteriaGroup
    spyOn(component.criteriaEmitter, 'emit')

    component.submitCriteria()

    expect(component.criteriaEmitter.emit).toHaveBeenCalled()
  })

  it('should handle criteria on submitCriteria if formGroup values exist', () => {
    const newCriteriaGroup = new FormGroup<AnnouncementCriteriaForm>({
      title: new FormControl<string | null>('title'),
      appId: new FormControl<string | null>('appId'),
      status: new FormControl<AnnouncementStatus[] | null>([AnnouncementStatus.Active]),
      type: new FormControl<AnnouncementType[] | null>([AnnouncementType.Event]),
      priority: new FormControl<AnnouncementPriorityType[] | null>([AnnouncementPriorityType.Low]),
      startDateRange: new FormControl<Date[] | null>([new Date('2023-01-02'), new Date('2023-01-03')])
    })
    component.announcementCriteriaGroup = newCriteriaGroup
    spyOn(component.criteriaEmitter, 'emit')

    component.submitCriteria()

    expect(component.criteriaEmitter.emit).toHaveBeenCalled()
  })

  it('should handle criteria on submitCriteria with empty dateTo or equal dateFrom, dateTo', () => {
    const newCriteriaGroup = new FormGroup<AnnouncementCriteriaForm>({
      title: new FormControl<string | null>(null),
      appId: new FormControl<string | null>(null),
      status: new FormControl<AnnouncementStatus[] | null>(null),
      type: new FormControl<AnnouncementType[] | null>(null),
      priority: new FormControl<AnnouncementPriorityType[] | null>(null),
      startDateRange: new FormControl<Date[] | null>([new Date('2023-01-02')])
    })
    component.announcementCriteriaGroup = newCriteriaGroup
    spyOn(component.criteriaEmitter, 'emit')

    component.submitCriteria()

    expect(component.criteriaEmitter.emit).toHaveBeenCalled()
  })
})
