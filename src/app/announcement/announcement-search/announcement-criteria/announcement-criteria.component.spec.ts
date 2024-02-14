import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { FormControl, FormGroup } from '@angular/forms'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'

import { AppStateService, UserService, createTranslateLoader } from '@onecx/portal-integration-angular'
import { AnnouncementPriorityType, AnnouncementStatus, AnnouncementType } from 'src/app/shared/generated'
import { AnnouncementCriteriaComponent, AnnouncementCriteriaForm } from './announcement-criteria.component'

describe('AnnouncementCriteriaComponent', () => {
  let component: AnnouncementCriteriaComponent
  let fixture: ComponentFixture<AnnouncementCriteriaComponent>

  const mockUserService = {
    lang$: {
      getValue: jasmine.createSpy('getValue')
    }
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AnnouncementCriteriaComponent],
      imports: [
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: UserService, useValue: mockUserService }]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnouncementCriteriaComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    mockUserService.lang$.getValue.and.returnValue('de')
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should handle criteria on submitCriteria if formGroup values empty', () => {
    const newCriteriaGroup = new FormGroup<AnnouncementCriteriaForm>({
      title: new FormControl<string | null>(null),
      workspaceName: new FormControl<string | null>(null),
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
      workspaceName: new FormControl<string | null>('workspaceName'),
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
      workspaceName: new FormControl<string | null>(null),
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

  it('should call this.user.lang$ from the constructor and set this.dateFormat to a german date format', () => {
    expect(component.dateFormatForRange).toEqual('dd.mm.yy')
  })

  it('should call this.user.lang$ from the constructor and set this.dateFormat to the default format if user.lang$ is not de', () => {
    mockUserService.lang$.getValue.and.returnValue('en')
    fixture = TestBed.createComponent(AnnouncementCriteriaComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    expect(component.dateFormatForRange).toEqual('m/d/yy')
  })
})
