import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormControl, FormGroup } from '@angular/forms'
import { of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import {
  Announcement,
  AnnouncementInternalAPIService,
  AnnouncementPriorityType,
  AnnouncementStatus,
  AnnouncementType
} from 'src/app/shared/generated'
import { AnnouncementDetailComponent, dateRangeValidator } from './announcement-detail.component'
import { TranslateTestingModule } from 'ngx-translate-testing'

const announcement: Announcement = {
  modificationCount: 0,
  id: 'id',
  title: 'title',
  content: 'content',
  productName: 'productName',
  workspaceName: 'workspaceName',
  type: AnnouncementType.Event,
  status: AnnouncementStatus.Active,
  priority: AnnouncementPriorityType.Important,
  startDate: '2023-01-02',
  endDate: '2023-01-03'
}
const announcementForm = new FormGroup({
  title: new FormControl(announcement.title),
  workspaceName: new FormControl(announcement.workspaceName),
  productName: new FormControl(announcement.productName),
  startDate: new FormControl(announcement.startDate),
  endDate: new FormControl(announcement.endDate)
})

describe('AnnouncementDetailComponent', () => {
  let component: AnnouncementDetailComponent
  let fixture: ComponentFixture<AnnouncementDetailComponent>

  const defaultLang = 'en'
  const mockUserService = { lang$: { getValue: jasmine.createSpy('getValue') } }
  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', [
    'success',
    'error',
    'warning'
  ])
  const apiServiceSpy = {
    getAnnouncementById: jasmine.createSpy('getAnnouncementById').and.returnValue(of({})),
    createAnnouncement: jasmine.createSpy('createAnnouncement').and.returnValue(of({})),
    updateAnnouncementById: jasmine.createSpy('updateAnnouncementById').and.returnValue(of({})),
    searchProductsByCriteria: jasmine.createSpy('searchProductsByCriteria').and.returnValue(of([]))
  }

  function initTestComponent() {
    fixture = TestBed.createComponent(AnnouncementDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AnnouncementDetailComponent],
      imports: [
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage(defaultLang)
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: mockUserService },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()
    component.displayDialog = true
  })

  afterEach(() => {
    component.announcementForm.reset()
    mockUserService.lang$.getValue.and.returnValue(defaultLang)
    // to spy data: reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.warning.calls.reset()
    apiServiceSpy.getAnnouncementById.calls.reset()
    apiServiceSpy.createAnnouncement.calls.reset()
    apiServiceSpy.updateAnnouncementById.calls.reset()
    apiServiceSpy.searchProductsByCriteria.calls.reset()
  })

  describe('construction', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })
  })

  describe('ngOnChange - init form', () => {
    it('should create but not initialize if dialog is not open', () => {
      expect(component).toBeTruthy()
      component.displayDialog = false
      component.ngOnChanges()
    })

    describe('VIEW', () => {
      it('should reject initializing if dialog is not open', () => {
        apiServiceSpy.getAnnouncementById.and.returnValue(of(announcement))
        component.announcement = announcement
        component.changeMode = 'VIEW'
        component.displayDialog = false

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).not.toHaveBeenCalled()
      })

      it('should reject initializing if data is missed', () => {
        apiServiceSpy.getAnnouncementById.and.returnValue(of(announcement))
        component.announcement = undefined
        component.changeMode = 'VIEW'

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).not.toHaveBeenCalled()
      })

      it('should prepare viewing an announcement - successful', () => {
        apiServiceSpy.getAnnouncementById.and.returnValue(of(announcement))
        component.announcement = announcement
        component.changeMode = 'VIEW'

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).toHaveBeenCalled()
        expect(component.loading).toBeFalse()
        expect(component.announcementForm.disabled).toBeTrue()
        expect(component.announcementForm.controls['title'].value).toBe(announcement.title)
      })

      it('should prepare viewing an announcement - failed: missing id', () => {
        apiServiceSpy.getAnnouncementById.and.returnValue(of(announcement))
        component.announcement = { ...announcement, id: undefined }
        component.changeMode = 'VIEW'

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).not.toHaveBeenCalled()
      })

      it('should prepare viewing an announcement - failed: missing permissions', () => {
        const errorResponse = { status: 403, statusText: 'No permissions' }
        apiServiceSpy.getAnnouncementById.and.returnValue(throwError(() => errorResponse))
        component.announcement = announcement
        component.changeMode = 'VIEW'
        spyOn(component.announcementForm, 'reset')
        spyOn(console, 'error')

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).toHaveBeenCalled()
        expect(component.announcementForm.reset).toHaveBeenCalled()
        expect(component.announcementForm.disabled).toBeTrue()
        expect(component.exceptionKey).toBe('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.ANNOUNCEMENT')
        expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: component.exceptionKey })
        expect(console.error).toHaveBeenCalledWith('getAnnouncementById', errorResponse)
      })
    })

    describe('EDIT', () => {
      it('should prepare editing an announcement - successful', () => {
        apiServiceSpy.getAnnouncementById.and.returnValue(of(announcement))
        component.changeMode = 'EDIT'
        component.announcement = announcement

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).toHaveBeenCalled()
        expect(component.loading).toBeFalse()
        expect(component.announcementForm.enabled).toBeTrue()
        expect(component.announcementForm.controls['title'].value).toEqual(announcement.title)
        expect(component.announcementForm.controls['content'].value).toEqual(announcement.content)
        expect(component.announcementForm.controls['startDate'].value).not.toBeNull()
      })

      it('should prepare editing an announcement - failed: id missed', () => {
        component.changeMode = 'EDIT'
        component.announcement = { ...announcement, id: undefined }

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).not.toHaveBeenCalled()
      })

      it('should display error if getting the announcement fails', () => {
        const errorResponse = { status: 404, statusText: 'Not Found' }
        apiServiceSpy.getAnnouncementById.and.returnValue(throwError(() => errorResponse))
        component.changeMode = 'EDIT'
        component.announcement = announcement
        spyOn(console, 'error')

        component.ngOnChanges()

        expect(component.exceptionKey).toEqual('EXCEPTIONS.HTTP_STATUS_' + errorResponse.status + '.ANNOUNCEMENT')
        expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: component.exceptionKey })
        expect(console.error).toHaveBeenCalledWith('getAnnouncementById', errorResponse)
      })
    })

    describe('CREATE', () => {
      it('should prepare copying an announcement - start with data from other announcement', () => {
        component.changeMode = 'CREATE'
        component.announcement = announcement // will be rejected due to filled

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).not.toHaveBeenCalled()

        component.announcement = undefined // correct

        component.ngOnChanges()

        expect(component.announcementForm.enabled).toBeTrue()
        expect(component.announcementForm.controls['title'].value).toEqual(null)
      })

      it('should prepare creating an announcement - start with empty form', () => {
        component.changeMode = 'CREATE'
        spyOn(component.announcementForm, 'reset')

        component.ngOnChanges()

        expect(component.announcementForm.reset).toHaveBeenCalled()
        expect(component.announcementForm.enabled).toBeTrue()
        expect(component.announcementForm.controls['title'].value).toBe(null)
        // check default values
        expect(component.announcementForm.controls['priority'].value).toEqual(AnnouncementPriorityType.Normal)
        expect(component.announcementForm.controls['status'].value).toEqual(AnnouncementStatus.Inactive)
        expect(component.announcementForm.controls['type'].value).toEqual(AnnouncementType.Info)
      })
    })

    describe('COPY', () => {
      it('should prepare copying an announcement - use data from other announcement', () => {
        component.changeMode = 'COPY'
        component.announcement = announcement

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).not.toHaveBeenCalled()
        expect(component.announcementForm.enabled).toBeTrue()
        expect(component.announcementForm.controls['title'].value).toBe(announcement.title)
      })

      it('should prepare copying an announcement - without date values', () => {
        component.changeMode = 'COPY'
        component.announcement = { ...announcement, startDate: undefined, endDate: undefined }

        component.ngOnChanges()

        expect(component.announcementForm.enabled).toBeTrue()
        expect(component.announcementForm.controls['title'].value).toEqual(announcement.title)
        expect(component.announcementForm.controls['startDate'].value).toBeNull()
      })
    })
  })

  describe('onSave', () => {
    describe('CREATE', () => {
      it('should create an announcement', () => {
        apiServiceSpy.createAnnouncement.and.returnValue(of({}))
        component.changeMode = 'CREATE'
        spyOn(component.hideDialogAndChanged, 'emit')
        component.announcementForm = announcementForm

        component.onSave()

        expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.OK' })
        expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(true)
      })

      it('should display error if creation fails', () => {
        const errorResponse = { status: 400, statusText: 'Could not create ...' }
        apiServiceSpy.createAnnouncement.and.returnValue(throwError(() => errorResponse))
        spyOn(console, 'error')
        component.changeMode = 'CREATE'
        component.announcementForm = announcementForm

        component.onSave()

        expect(component.announcementForm.valid).toBeTrue()
        expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.NOK' })
        expect(console.error).toHaveBeenCalledWith('createAnnouncement', errorResponse)
      })
    })

    describe('COPY', () => {
      it('should create an item based on another', () => {
        apiServiceSpy.createAnnouncement.and.returnValue(of({}))
        component.changeMode = 'COPY'
        spyOn(component.hideDialogAndChanged, 'emit')
        component.announcementForm = announcementForm

        component.onSave()

        expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.OK' })
        expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(true)
      })
    })

    describe('EDIT', () => {
      it('should update an announcement - successful', () => {
        apiServiceSpy.updateAnnouncementById.and.returnValue(of({}))
        component.changeMode = 'EDIT'
        component.announcement = announcement
        component.announcementForm = announcementForm

        spyOn(component.hideDialogAndChanged, 'emit')

        component.onSave()

        expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.OK' })
        expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(true)
      })

      it('should display error if update fails', () => {
        const errorResponse = { status: 400, statusText: 'Could not update ...' }
        apiServiceSpy.updateAnnouncementById.and.returnValue(throwError(() => errorResponse))
        spyOn(console, 'error')
        component.changeMode = 'EDIT'
        component.announcement = announcement
        component.announcementForm = announcementForm

        component.onSave()

        expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.NOK' })
        expect(console.error).toHaveBeenCalledWith('updateAnnouncementById', errorResponse)
      })
    })
  })

  describe('UI actions', () => {
    describe('Closing dialog', () => {
      it('should close the dialog if user triggers hiding', () => {
        spyOn(component.hideDialogAndChanged, 'emit')
        component.onDialogHide()

        expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(false)
      })
    })

    describe('Preview', () => {
      it('should change preview status', () => {
        component.onChangeAnnouncementStatus({ checked: 'ACTIVE' })

        expect(component.preview.status).toBe('ACTIVE')
      })
      it('should change preview type', () => {
        component.onChangeAnnouncementType({ value: 'INFO' })

        expect(component.preview.type).toBe('INFO')
      })
      it('should change preview priority', () => {
        component.onChangeAnnouncementPriority({ value: 'IMPORTANT' })

        expect(component.preview.priority).toBe('IMPORTANT')
      })
    })
  })

  describe('date range validation', () => {
    it('should correct dateRange using validator fn', () => {
      const dateFormGroup = new FormGroup({
        startDate: new FormControl('2023-01-01'),
        endDate: new FormControl('2023-01-02')
      })

      dateFormGroup.setValidators(dateRangeValidator(dateFormGroup))
      dateFormGroup.updateValueAndValidity()

      expect(dateFormGroup.valid).toBeTrue()
      expect(dateFormGroup.errors).toBeNull()
    })

    it('should catch dateRange error using validator fn', () => {
      const dateFormGroup = new FormGroup({
        startDate: new FormControl('2023-01-02'),
        endDate: new FormControl('2023-01-01')
      })

      dateFormGroup.setValidators(dateRangeValidator(dateFormGroup))
      dateFormGroup.updateValueAndValidity()

      expect(dateFormGroup.valid).toBeFalse()
      expect(dateFormGroup.errors).toEqual({ invalidDateRange: true })
    })

    it('should return null from validator fn if no endDate is present', () => {
      const dateFormGroup = new FormGroup({
        startDate: new FormControl('2023-01-02')
      })

      dateFormGroup.setValidators(dateRangeValidator(dateFormGroup))
      dateFormGroup.updateValueAndValidity()

      expect(dateFormGroup.errors).toEqual(null)
    })
  })

  describe('form invalid', () => {
    it('should display warning when trying to save an invalid announcement', () => {
      component.announcementForm = announcementForm
      component.announcementForm.setErrors({ title: true })

      component.onSave()

      expect(msgServiceSpy.warning).toHaveBeenCalledWith({ summaryKey: 'VALIDATION.ERRORS.INVALID_FORM' })
    })

    it('should display warning when trying to save an announcement with invalid dateRange', () => {
      component.announcementForm = announcementForm
      component.announcementForm.setErrors({ dateRange: true })

      component.onSave()

      expect(msgServiceSpy.warning).toHaveBeenCalledWith({ summaryKey: 'VALIDATION.ERRORS.INVALID_DATE_RANGE' })
    })
  })

  describe('Language tests', () => {
    it('should use default format: English', () => {
      expect(component.datetimeFormat).toEqual('M/d/yy, hh:mm:ss a')
    })

    it('should set German date format', () => {
      mockUserService.lang$.getValue.and.returnValue('de')
      initTestComponent()
      expect(component.datetimeFormat).toEqual('dd.MM.yyyy HH:mm:ss')
    })
  })
})
