import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { FormControl, FormGroup } from '@angular/forms'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { SelectItem } from 'primeng/api'

import { AppStateService, UserService, createTranslateLoader } from '@onecx/portal-integration-angular'
import { AnnouncementPriorityType, AnnouncementStatus, AnnouncementType } from 'src/app/shared/generated'
import { AnnouncementCriteriaComponent, AnnouncementCriteriaForm } from './announcement-criteria.component'

const filledCriteria = new FormGroup<AnnouncementCriteriaForm>({
  title: new FormControl<string | null>('title'),
  workspaceName: new FormControl<string | null>('workspaceName'),
  productName: new FormControl<string | null>('productName'),
  status: new FormControl<AnnouncementStatus[] | null>([AnnouncementStatus.Active]),
  type: new FormControl<AnnouncementType[] | null>([AnnouncementType.Event]),
  priority: new FormControl<AnnouncementPriorityType[] | null>([AnnouncementPriorityType.Low]),
  startDateRange: new FormControl<Date[] | null>([new Date('2023-01-02'), new Date('2023-01-03')])
})

const emptyCriteria = new FormGroup<AnnouncementCriteriaForm>({
  title: new FormControl<string | null>(null),
  workspaceName: new FormControl<string | null>(null),
  productName: new FormControl<string | null>(null),
  status: new FormControl<AnnouncementStatus[] | null>(null),
  type: new FormControl<AnnouncementType[] | null>(null),
  priority: new FormControl<AnnouncementPriorityType[] | null>(null),
  startDateRange: new FormControl<Date[] | null>([new Date('2023-01-02'), new Date('2023-01-03')])
})

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

  describe('submitCriteria & resetCriteria', () => {
    it('should search announcements without criteria', () => {
      component.announcementCriteria = emptyCriteria
      spyOn(component.criteriaEmitter, 'emit')

      component.submitCriteria()

      expect(component.criteriaEmitter.emit).toHaveBeenCalled()
    })

    it('should search announcements with criteria', () => {
      component.announcementCriteria = filledCriteria
      spyOn(component.criteriaEmitter, 'emit')

      component.submitCriteria()

      expect(component.criteriaEmitter.emit).toHaveBeenCalled()
    })

    it('should prevent user from searching for invalid dates', () => {
      component.announcementCriteria = filledCriteria
      component.announcementCriteria.patchValue({ startDateRange: [new Date('2023-01-02')] })
      spyOn(component.criteriaEmitter, 'emit')

      component.submitCriteria()

      expect(component.criteriaEmitter.emit).toHaveBeenCalled()
    })

    it('should reset search criteria', () => {
      component.announcementCriteria = filledCriteria
      spyOn(component.criteriaEmitter, 'emit')

      component.submitCriteria()

      expect(component.criteriaEmitter.emit).toHaveBeenCalled()

      spyOn(component.resetSearchEmitter, 'emit')
      spyOn(component.announcementCriteria, 'reset')

      component.resetCriteria()

      expect(component.announcementCriteria.reset).toHaveBeenCalled()
      expect(component.resetSearchEmitter.emit).toHaveBeenCalled()
    })
  })

  /**
   * Translations
   */
  it('should load dropdown lists with translations', () => {
    let data2: SelectItem[] = []
    component.type$?.subscribe((data) => {
      data2 = data
    })
    expect(data2.length).toBeGreaterThanOrEqual(3)

    data2 = []
    component.priorityType$?.subscribe((data) => {
      data2 = data
    })
    expect(data2.length).toBeGreaterThanOrEqual(3)

    data2 = []
    component.statusOptions$?.subscribe((data) => {
      data2 = data
    })
    expect(data2.length).toBeGreaterThanOrEqual(2)
  })

  /**
   * Language tests
   */
  it('should set a German date format', () => {
    expect(component.dateFormatForRange).toEqual('dd.mm.yy')
  })

  it('should set default date format', () => {
    mockUserService.lang$.getValue.and.returnValue('en')
    fixture = TestBed.createComponent(AnnouncementCriteriaComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    expect(component.dateFormatForRange).toEqual('m/d/yy')
  })
})
