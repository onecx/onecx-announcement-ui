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
import { AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { AnnouncementDetailComponent } from './announcement-detail.component'
import { dateRangeValidator } from './announcement-detail.component'

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
    getAllWorkspaceNames: jasmine.createSpy('getAllWorkspaceNames').and.returnValue(of([]))
  }
  const formGroup = new FormGroup({
    id: new FormControl('id'),
    title: new FormControl('title'),
    workspaceName: new FormControl('workspace name'),
    appId: new FormControl('app id')
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

  it('should getWorkspaces onInit', () => {
    const workspaces = ['w1']
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(of(workspaces))
    component.workspaces = []

    component.ngOnInit()

    expect(component.workspaces).toContain({ label: 'w1', value: 'w1' })
  })

  it('should log error if getWorkspaces fails', () => {
    apiServiceSpy.getAllWorkspaceNames.and.returnValue(throwError(() => new Error()))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.WORKSPACES.NOT_FOUND'
    })
  })

  it('should fill the form with Announcement', () => {
    const workspaceName = 'w1'
    const appId = 'app1'
    component.changeMode = 'VIEW'
    component.announcementId = 'id'
    component.announcement = {
      id: 'id',
      title: 'title',
      appId: appId,
      workspaceName: workspaceName,
      startDate: '2023-01-02',
      endDate: '2023-01-03'
    }
    const result = (component as any).fillForm()

    expect(component.formGroup.value['appId']).toEqual(appId)
    expect(component.formGroup.value['workspaceName']).toEqual(workspaceName)
    expect(result).not.toBeDefined()
  })

  it('should behave correctly onChanges in edit mode', () => {
    component.changeMode = 'EDIT'
    const testId = 'test id'
    component.announcement = { id: testId }

    component.ngOnChanges()

    expect(component.displayDateRangeError).toBeFalse()
    expect(component.announcementId).toEqual(testId)
  })

  it('should behave correctly onChanges in new mode', () => {
    component.changeMode = 'NEW'
    const testId = 'test id'
    component.announcement = { id: testId }

    component.ngOnChanges()

    expect(component.announcementId).toBeUndefined()
  })

  it('should behave correctly onChanges in new mode if no announcement', () => {
    component.changeMode = 'NEW'
    spyOn(component.formGroup, 'reset')

    component.ngOnChanges()

    expect(component.formGroup.reset).toHaveBeenCalled()
  })

  it('should update data if getAnnouncementById call succeeds', () => {
    apiServiceSpy.getAnnouncementById.and.returnValue(of({ id: 'new id' }))
    component.changeMode = 'EDIT'
    component.announcement = { id: 'test id' }
    const newAnnouncement = { id: 'new id' }

    component.ngOnChanges()

    expect(component.announcement).toEqual(newAnnouncement)
  })

  it('should display error if getAnnouncementById call fails', () => {
    apiServiceSpy.getAnnouncementById.and.returnValue(throwError(() => new Error()))
    component.changeMode = 'EDIT'
    component.announcement = { id: 'test id' }

    component.ngOnChanges()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.SEARCH.SEARCH_FAILED'
    })
  })

  it('should create an announcement onSave in new mode', () => {
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

  it('should handle api call error in new mode', () => {
    apiServiceSpy.createAnnouncement.and.returnValue(throwError(() => new Error()))
    component.changeMode = 'NEW'
    component.formGroup = formGroup

    component.onSave()

    expect(component.formGroup.valid).toBeTrue()
    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.CREATE.MESSAGE.NOK'
    })
  })

  it('should update an announcement onSave in edit mode', () => {
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

  it('should handle api call error in edit mode', () => {
    apiServiceSpy.updateAnnouncementById.and.returnValue(throwError(() => new Error()))
    component.changeMode = 'EDIT'
    component.announcementId = 'id'
    component.formGroup = formGroup

    component.onSave()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ACTIONS.EDIT.MESSAGE.NOK'
    })
  })

  it('should handle formGroup values in submitFormGroupValues: workspaceName is "all"', () => {
    component.formGroup = formGroup
    component.formGroup.patchValue({ workspaceName: 'all' })

    const result = (component as any).submitFormGroupValues()

    expect(result.workspaceName).toBeNull()
  })

  it('should handle formGroup values in submitFormGroupValues: workspaceName is not "all"', () => {
    component.formGroup = formGroup
    component.formGroup.patchValue({ workspaceName: 'workspace name' })

    const result = (component as any).submitFormGroupValues()

    expect(result.workspaceName).toEqual('workspace name')
  })

  it('should display warning onSave if dateRange invalid', () => {
    component.formGroup = formGroup
    component.formGroup.setErrors({ dateRange: true })

    component.onSave()

    expect(msgServiceSpy.warning).toHaveBeenCalledWith({
      summaryKey: 'VALIDATION.ERRORS.INVALID_DATE_RANGE'
    })
  })

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

  it('should set correct values onDialogHide', () => {
    spyOn(component.hideDialogAndChanged, 'emit')
    component.onDialogHide()

    expect(component.displayDetailDialog).toBeFalse()
    expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(false)
  })

  it('should call this.user.lang$ from the constructor and set this.dateFormat to a german date format', () => {
    expect(component.dateFormat).toEqual('dd.MM.yyyy HH:mm:ss')
  })

  it('should call this.user.lang$ from the constructor and set this.dateFormat to the default format if user.lang$ is not de', () => {
    mockUserService.lang$.getValue.and.returnValue('en')
    fixture = TestBed.createComponent(AnnouncementDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    expect(component.dateFormat).toEqual('medium')
  })
})
