import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient, HttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'
import { FormControl, FormGroup } from '@angular/forms'

import {
  AppStateService,
  createTranslateLoader,
  PortalMessageService,
  UserService
} from '@onecx/portal-integration-angular'

import {
  Announcement,
  AnnouncementInternalAPIService,
  AnnouncementPriorityType,
  AnnouncementStatus,
  AnnouncementType
} from 'src/app/shared/generated'
import { AnnouncementDetailComponent, dateRangeValidator } from './announcement-detail.component'

const announcement: Announcement = {
  id: 'id',
  modificationCount: 0,
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
    id: new FormControl('id'),
    title: new FormControl('title'),
    workspaceName: new FormControl('workspace name'),
    productName: new FormControl('prod name')
  })
  const mockUserService = {
    lang$: {
      getValue: jasmine.createSpy('getValue')
    }
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AnnouncementDetailComponent],
      imports: [
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: createTranslateLoader,
            deps: [HttpClient, AppStateService]
          }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.warning.calls.reset()
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
    component.displayDetailDialog = true
  })

  afterEach(() => {
    component.formGroup.reset()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should create but not initialize if dialog is not open', () => {
    expect(component).toBeTruthy()
    component.displayDetailDialog = false
    component.ngOnChanges()
  })

  describe('ngOnChange, i.e. opening detail dialog', () => {
    it('should prepare editing/viewing an announcement - successful', () => {
      apiServiceSpy.getAnnouncementById.and.returnValue(of(announcement))
      component.changeMode = 'EDIT'
      component.announcement = announcement

      component.ngOnChanges()

      expect(apiServiceSpy.getAnnouncementById).toHaveBeenCalled()
      expect(component.formGroup.enabled).toBeTrue()
      expect(component.formGroup.controls['id'].value).toEqual(announcement.id)
      expect(component.formGroup.controls['content'].value).toEqual(announcement.content)
      expect(component.formGroup.controls['startDate'].value).not.toBeNull()

      component.changeMode = 'VIEW'
      component.announcement = announcement

      component.ngOnChanges()

      expect(apiServiceSpy.getAnnouncementById).toHaveBeenCalled()
      expect(component.formGroup.disabled).toBeTrue()
      expect(component.formGroup.controls['id'].value).toEqual(announcement.id)
      expect(component.formGroup.controls['title'].value).toEqual(announcement.title)
    })

    it('should prepare editing/viewing an announcement - failed: id missed', () => {
      component.changeMode = 'EDIT'
      component.announcement = { ...announcement, id: undefined }

      component.ngOnChanges()

      expect(apiServiceSpy.getAnnouncementById).not.toHaveBeenCalled()
      expect(component.formGroup.disabled).toBeTrue()
      expect(component.formGroup.controls['id'].value).toBeNull()
    })

    it('should prepare copying an announcement - start with data from other announcement', () => {
      component.changeMode = 'CREATE'
      component.announcement = announcement // stopped, id is filled

      component.ngOnChanges()

      expect(component.formGroup.disabled).toBeTrue()
      expect(component.formGroup.controls['id'].value).toBeNull() // after reset

      component.announcement = { ...announcement, id: undefined } // correct

      component.ngOnChanges()

      expect(component.formGroup.enabled).toBeTrue()
      expect(component.formGroup.controls['id'].value).toBeUndefined()
      expect(component.formGroup.controls['title'].value).toEqual(announcement.title)
    })

    it('should prepare copying an announcement - without date values', () => {
      component.changeMode = 'CREATE'
      component.announcement = { ...announcement, id: undefined, startDate: undefined, endDate: undefined }

      component.ngOnChanges()

      expect(component.formGroup.enabled).toBeTrue()
      expect(component.formGroup.controls['title'].value).toEqual(announcement.title)
      expect(component.formGroup.controls['startDate'].value).toBeNull()
    })

    it('should prepare creating an announcement - start with empty form', () => {
      component.changeMode = 'CREATE'
      spyOn(component.formGroup, 'reset')

      component.ngOnChanges()

      expect(component.formGroup.reset).toHaveBeenCalled()
      // check default values
      expect(component.formGroup.controls['priority'].value).toEqual(AnnouncementPriorityType.Normal)
      expect(component.formGroup.controls['status'].value).toEqual(AnnouncementStatus.Inactive)
      expect(component.formGroup.controls['type'].value).toEqual(AnnouncementType.Info)
    })

    it('should display error if getting the announcement fails', () => {
      const errorResponse = { status: 404, statusText: 'Not Found' }
      apiServiceSpy.getAnnouncementById.and.returnValue(throwError(() => errorResponse))
      component.changeMode = 'EDIT'
      component.announcement = announcement
      spyOn(console, 'error')

      component.ngOnChanges()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.SEARCH.SEARCH_FAILED' })
      expect(console.error).toHaveBeenCalledWith('getAnnouncementById', errorResponse)
    })
  })

  describe('onSave - creating and updating an announcement', () => {
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
      expect(console.error).toHaveBeenCalledWith('createAnnouncement', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.CREATE.MESSAGE.NOK' })
    })

    it('should update an announcement', () => {
      apiServiceSpy.updateAnnouncementById.and.returnValue(of({}))
      component.changeMode = 'EDIT'
      spyOn(component.hideDialogAndChanged, 'emit')
      component.formGroup = formGroup

      component.onSave()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.OK' })
      expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(true)
    })

    it('should display error if update fails', () => {
      const errorResponse = { status: 400, statusText: 'Could not update ...' }
      apiServiceSpy.updateAnnouncementById.and.returnValue(throwError(() => errorResponse))
      spyOn(console, 'error')
      component.changeMode = 'EDIT'
      component.formGroup = formGroup

      component.onSave()

      expect(console.error).toHaveBeenCalledWith('updateAnnouncementById', errorResponse)
      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.EDIT.MESSAGE.NOK' })
    })

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

  /*
   * UI ACTIONS
   */
  it('should close the dialog', () => {
    spyOn(component.hideDialogAndChanged, 'emit')
    component.onDialogHide()

    expect(component.displayDetailDialog).toBeFalse()
    expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(false)
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
})
