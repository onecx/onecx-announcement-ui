import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { of, throwError } from 'rxjs'
import { FormControl, FormGroup } from '@angular/forms'

import {
  AppStateService,
  createTranslateLoader,
  PortalMessageService,
  UserService
} from '@onecx/portal-integration-angular'
import { Announcement, AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { AnnouncementDetailComponent } from './announcement-detail.component'
import { dateRangeValidator } from './announcement-detail.component'

const workspaceName = 'w1'
const productName = 'app1'

const announcement: Announcement = {
  id: 'id',
  title: 'title',
  productName: productName,
  workspaceName: workspaceName,
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
      providers: [
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
  })

  afterEach(() => {
    component.formGroup.reset()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnChange, i.e. opening detail dialog', () => {
    it('should prepare editing an announcement', () => {
      component.changeMode = 'EDIT'
      component.announcement = announcement

      component.ngOnChanges()

      expect(component.displayDateRangeError).toBeFalse()
      expect(component.announcementId).toEqual(announcement.id)

      component.changeMode = 'VIEW'
      component.announcement = announcement

      component.ngOnChanges()

      expect(component.formGroup.disabled).toBeTrue()
    })

    it('should prepare copying an announcement', () => {
      component.changeMode = 'NEW'
      component.announcement = announcement
      component.ngOnChanges()

      expect(component.announcementId).toBeUndefined()
    })

    it('should prepare creating an announcement', () => {
      component.changeMode = 'NEW'
      spyOn(component.formGroup, 'reset')

      component.ngOnChanges()

      expect(component.formGroup.reset).toHaveBeenCalled()
    })

    it('should display the current announcement', () => {
      apiServiceSpy.getAnnouncementById.and.returnValue(of(announcement))
      component.changeMode = 'EDIT'
      component.announcement = announcement

      component.ngOnChanges()

      expect(component.announcement).toEqual(announcement)
    })

    it('should display error if getting the anncmt fails', () => {
      apiServiceSpy.getAnnouncementById.and.returnValue(throwError(() => new Error()))
      component.changeMode = 'EDIT'
      component.announcement = announcement

      component.ngOnChanges()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'ACTIONS.SEARCH.SEARCH_FAILED'
      })
    })
  })

  describe('onSave - creating and updating an announcement', () => {
    it('should create an announcement', () => {
      apiServiceSpy.createAnnouncement.and.returnValue(of({}))
      component.changeMode = 'NEW'
      spyOn(component.hideDialogAndChanged, 'emit')
      component.formGroup = formGroup

      component.onSave()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({
        summaryKey: 'ACTIONS.CREATE.MESSAGE.OK'
      })
      expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(true)
    })

    it('should display error if creation fails', () => {
      apiServiceSpy.createAnnouncement.and.returnValue(throwError(() => new Error()))
      component.changeMode = 'NEW'
      component.formGroup = formGroup

      component.onSave()

      expect(component.formGroup.valid).toBeTrue()
      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'ACTIONS.CREATE.MESSAGE.NOK'
      })
    })

    it('should update an announcement', () => {
      apiServiceSpy.updateAnnouncementById.and.returnValue(of({}))
      component.changeMode = 'EDIT'
      spyOn(component.hideDialogAndChanged, 'emit')
      component.announcementId = 'id'
      component.formGroup = formGroup

      component.onSave()

      expect(msgServiceSpy.success).toHaveBeenCalledWith({
        summaryKey: 'ACTIONS.EDIT.MESSAGE.OK'
      })
      expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(true)
    })

    it('should display error if update fails', () => {
      apiServiceSpy.updateAnnouncementById.and.returnValue(throwError(() => new Error()))
      component.changeMode = 'EDIT'
      component.announcementId = 'id'
      component.formGroup = formGroup

      component.onSave()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({
        summaryKey: 'ACTIONS.EDIT.MESSAGE.NOK'
      })
    })

    it('should display warning when trying to save an anncmt with invalid dateRange', () => {
      component.formGroup = formGroup
      component.formGroup.setErrors({ dateRange: true })

      component.onSave()

      expect(msgServiceSpy.warning).toHaveBeenCalledWith({
        summaryKey: 'VALIDATION.ERRORS.INVALID_DATE_RANGE'
      })
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
