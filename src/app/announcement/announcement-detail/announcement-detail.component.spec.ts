import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient, HttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { FormControl, FormGroup } from '@angular/forms'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { createTranslateLoader } from '@onecx/angular-utils'

import {
  Announcement,
  AnnouncementInternalAPIService,
  AnnouncementPriorityType,
  AnnouncementStatus,
  AnnouncementType
} from 'src/app/shared/generated'
import { AnnouncementDetailComponent, dateRangeValidator } from './announcement-detail.component'

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

describe('AnnouncementDetailComponent', () => {
  let component: AnnouncementDetailComponent
  let fixture: ComponentFixture<AnnouncementDetailComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', [
    'success',
    'error',
    'info',
    'warning'
  ])
  const apiServiceSpy = {
    getAnnouncementById: jasmine.createSpy('getAnnouncementById').and.returnValue(of({})),
    createAnnouncement: jasmine.createSpy('createAnnouncement').and.returnValue(of({})),
    updateAnnouncementById: jasmine.createSpy('updateAnnouncementById').and.returnValue(of({})),
    getAllWorkspaceNames: jasmine.createSpy('getAllWorkspaceNames').and.returnValue(of([])),
    searchProductsByCriteria: jasmine.createSpy('searchProductsByCriteria').and.returnValue(of([]))
  }
  const formGroup = new FormGroup({
    title: new FormControl('title'),
    workspaceName: new FormControl('workspace name'),
    productName: new FormControl('prod name')
  })
  const mockUserService = { lang$: { getValue: jasmine.createSpy('getValue') } }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AnnouncementDetailComponent],
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] }
        })
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
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.warning.calls.reset()
    // to spy data: reset
    apiServiceSpy.getAnnouncementById.calls.reset()
    apiServiceSpy.createAnnouncement.calls.reset()
    apiServiceSpy.updateAnnouncementById.calls.reset()
    apiServiceSpy.getAllWorkspaceNames.calls.reset()
    apiServiceSpy.searchProductsByCriteria.calls.reset()
    mockUserService.lang$.getValue.and.returnValue('de')
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnouncementDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    component.displayDialog = true
  })

  afterEach(() => {
    component.formGroup.reset()
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
        expect(component.formGroup.disabled).toBeTrue()
        expect(component.formGroup.controls['title'].value).toBe(announcement.title)
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
        spyOn(component.formGroup, 'reset')
        spyOn(console, 'error')

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).toHaveBeenCalled()
        expect(component.formGroup.reset).toHaveBeenCalled()
        expect(component.formGroup.disabled).toBeTrue()
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
        expect(component.formGroup.enabled).toBeTrue()
        expect(component.formGroup.controls['title'].value).toEqual(announcement.title)
        expect(component.formGroup.controls['content'].value).toEqual(announcement.content)
        expect(component.formGroup.controls['startDate'].value).not.toBeNull()
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

        expect(component.formGroup.enabled).toBeTrue()
        expect(component.formGroup.controls['title'].value).toEqual(null)
      })

      it('should prepare creating an announcement - start with empty form', () => {
        component.changeMode = 'CREATE'
        spyOn(component.formGroup, 'reset')

        component.ngOnChanges()

        expect(component.formGroup.reset).toHaveBeenCalled()
        expect(component.formGroup.enabled).toBeTrue()
        expect(component.formGroup.controls['title'].value).toBe(null)
        // check default values
        expect(component.formGroup.controls['priority'].value).toEqual(AnnouncementPriorityType.Normal)
        expect(component.formGroup.controls['status'].value).toEqual(AnnouncementStatus.Inactive)
        expect(component.formGroup.controls['type'].value).toEqual(AnnouncementType.Info)
      })
    })

    describe('COPY', () => {
      it('should prepare copying an announcement - use data from other announcement', () => {
        component.changeMode = 'COPY'
        component.announcement = announcement

        component.ngOnChanges()

        expect(apiServiceSpy.getAnnouncementById).not.toHaveBeenCalled()
        expect(component.formGroup.enabled).toBeTrue()
        expect(component.formGroup.controls['title'].value).toBe(announcement.title)
      })

      it('should prepare copying an announcement - without date values', () => {
        component.changeMode = 'COPY'
        component.announcement = { ...announcement, startDate: undefined, endDate: undefined }

        component.ngOnChanges()

        expect(component.formGroup.enabled).toBeTrue()
        expect(component.formGroup.controls['title'].value).toEqual(announcement.title)
        expect(component.formGroup.controls['startDate'].value).toBeNull()
      })
    })
  })

  describe('onSave - creating and updating a parameter', () => {
    describe('CREATE', () => {
      it('should create an announcement', () => {
        apiServiceSpy.createAnnouncement.and.returnValue(of({}))
        component.changeMode = 'CREATE'
        spyOn(component.hideDialogAndChanged, 'emit')
        component.formGroup = formGroup

        component.onSave()

        expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.OK' })
        expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(true)
      })

      it('should display error if creation fails', () => {
        const errorResponse = { status: 400, statusText: 'Could not create ...' }
        apiServiceSpy.createAnnouncement.and.returnValue(throwError(() => errorResponse))
        spyOn(console, 'error')
        component.changeMode = 'CREATE'
        component.formGroup = formGroup

        component.onSave()

        expect(component.formGroup.valid).toBeTrue()
        expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.NOK' })
        expect(console.error).toHaveBeenCalledWith('createAnnouncement', errorResponse)
      })
    })

    describe('COPY', () => {
      it('should create a parameter based on another', () => {
        apiServiceSpy.createAnnouncement.and.returnValue(of({}))
        component.changeMode = 'COPY'
        spyOn(component.hideDialogAndChanged, 'emit')
        component.formGroup = formGroup

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
        component.formGroup = formGroup

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
        component.formGroup = formGroup

        component.onSave()

        expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.NOK' })
        expect(console.error).toHaveBeenCalledWith('updateAnnouncementById', errorResponse)
      })
    })
  })

  /*
   * UI ACTIONS
   */
  describe('Extra UI actions', () => {
    describe('Closing dialog', () => {
      it('should close the dialog if user triggers hiding', () => {
        spyOn(component.hideDialogAndChanged, 'emit')
        component.onDialogHide()

        expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(false)
      })
    })
  })

  /**
   * Language tests
   */
  it('should set a German date format', () => {
    expect(component.dateFormat).toEqual('dd.mm.yy')
  })

  it('should set default date format', () => {
    mockUserService.lang$.getValue.and.returnValue('en')
    fixture = TestBed.createComponent(AnnouncementDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    expect(component.dateFormat).toEqual('mm/dd/yy')
  })

  /**
   * Extras
   */
  describe('form invalid', () => {
    it('should display warning when trying to save an invalid announcement', () => {
      component.formGroup = formGroup
      component.formGroup.setErrors({ title: true })

      component.onSave()

      expect(msgServiceSpy.warning).toHaveBeenCalledWith({ summaryKey: 'VALIDATION.ERRORS.INVALID_FORM' })
    })

    it('should display warning when trying to save an announcement with invalid dateRange', () => {
      component.formGroup = formGroup
      component.formGroup.setErrors({ dateRange: true })

      component.onSave()

      expect(msgServiceSpy.warning).toHaveBeenCalledWith({ summaryKey: 'VALIDATION.ERRORS.INVALID_DATE_RANGE' })
    })
  })

  describe('dateFormGroup', () => {
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
})
