import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormControl, FormGroup } from '@angular/forms'
import { provideRouter } from '@angular/router'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { BehaviorSubject } from 'rxjs'

import { SelectItem } from 'primeng/api'

import { UserService } from '@onecx/angular-integration-interface'

import { AnnouncementPriorityType, AnnouncementStatus, AnnouncementType } from 'src/app/shared/generated'
import { AnnouncementCriteriaComponent, AnnouncementCriteriaForm } from './announcement-criteria.component'
import { AnnouncementSearchComponent } from '../announcement-search.component'

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
  const defaultLang = 'en'
  const langSubject = new BehaviorSubject<string>(defaultLang)

  const mockUserService = {
    lang$: langSubject
  }

  function initializeComponent() {
    fixture = TestBed.createComponent(AnnouncementCriteriaComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage(defaultLang)
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '', component: AnnouncementSearchComponent }]),
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    langSubject.next(defaultLang)
    initializeComponent()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('search criteria', () => {
    it('should search announcements without criteria', () => {
      component.criteriaForm = emptyCriteria
      spyOn(component.searchEmitter, 'emit')

      component.onSearch()

      expect(component.searchEmitter.emit).toHaveBeenCalled()
    })

    it('should search announcements with criteria', () => {
      component.criteriaForm = filledCriteria
      spyOn(component.searchEmitter, 'emit')

      component.onSearch()

      expect(component.searchEmitter.emit).toHaveBeenCalled()
    })

    it('should prevent user from searching for invalid dates', () => {
      component.criteriaForm = filledCriteria
      component.criteriaForm.patchValue({ startDateRange: [new Date('2023-01-02')] })
      spyOn(component.searchEmitter, 'emit')

      component.onSearch()

      expect(component.searchEmitter.emit).toHaveBeenCalled()
    })

    it('should reset search criteria', () => {
      component.criteriaForm = filledCriteria
      spyOn(component.searchEmitter, 'emit')

      component.onSearch()

      expect(component.searchEmitter.emit).toHaveBeenCalled()

      spyOn(component.resetSearchEmitter, 'emit')
      spyOn(component.criteriaForm, 'reset')

      component.onResetCriteria()

      expect(component.criteriaForm.reset).toHaveBeenCalled()
      expect(component.resetSearchEmitter.emit).toHaveBeenCalled()
    })
  })

  /**
   * Translations
   */
  describe('translations', () => {
    it('should load dropdown lists with translations', () => {
      let data2: SelectItem[] = []
      component.typeOptions$?.subscribe((data) => {
        data2 = data
      })
      expect(data2.length).toBeGreaterThanOrEqual(3)

      data2 = []
      component.priorityTypeOptions$?.subscribe((data) => {
        data2 = data
      })
      expect(data2.length).toBeGreaterThanOrEqual(3)

      data2 = []
      component.statusOptions$?.subscribe((data) => {
        data2 = data
      })
      expect(data2.length).toBeGreaterThanOrEqual(2)
    })
  })

  /**
   * Language tests
   */
  describe('lang', () => {
    it('should set a English date format', () => {
      expect(component.dateFormatForRange).toEqual('m/d/yy')
    })

    it('should set default date format', () => {
      langSubject.next('de')

      initializeComponent()

      expect(component.dateFormatForRange).toEqual('dd.mm.yy')
    })
  })
})
