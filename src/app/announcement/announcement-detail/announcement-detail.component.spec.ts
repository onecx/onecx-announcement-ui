import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { HttpClient } from '@angular/common/http'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { ActivatedRoute } from '@angular/router'
import { of, throwError } from 'rxjs'
import { FormControl, FormGroup } from '@angular/forms'

import { PortalMessageService, ConfigurationService } from '@onecx/portal-integration-angular'
import { HttpLoaderFactory } from 'src/app/shared/shared.module'
import { AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { PortalService } from 'src/app/shared/services/portalService'
import { AnnouncementDetailComponent } from './announcement-detail.component'
import { dateRangeValidator } from './announcement-detail.component'

describe('AnnouncementDetailComponent', () => {
  let component: AnnouncementDetailComponent
  let fixture: ComponentFixture<AnnouncementDetailComponent>
  let mockActivatedRoute: ActivatedRoute

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', [
    'success',
    'error',
    'info',
    'warning'
  ])
  const configServiceSpy = {
    lang: 'de',
    getProperty: jasmine.createSpy('getProperty').and.returnValue('123'),
    getPortal: jasmine.createSpy('getPortal').and.returnValue({
      themeId: '1234',
      portalName: 'test',
      baseUrl: '/',
      microfrontendRegistrations: []
    })
  }
  const apiServiceSpy = {
    getAnnouncementById: jasmine.createSpy('getAnnouncementById').and.returnValue(of({})),
    addAnnouncement: jasmine.createSpy('addAnnouncement').and.returnValue(of({})),
    updateAnnouncementById: jasmine.createSpy('updateAnnouncementById').and.returnValue(of({}))
  }
  const portalServiceSpy = jasmine.createSpyObj('PortalService', ['getCurrentPortalData'])
  portalServiceSpy.getCurrentPortalData.and.returnValue(of([]))

  const formGroup = new FormGroup({
    id: new FormControl('id'),
    title: new FormControl('title'),
    assignedTo: new FormControl('Workspace'),
    portalId: new FormControl('portal id'),
    appId: new FormControl('AH_MGMT')
  })

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AnnouncementDetailComponent],
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
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ConfigurationService, useValue: configServiceSpy },
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy },
        { provide: PortalService, useValue: portalServiceSpy }
      ]
    }).compileComponents()
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    msgServiceSpy.info.calls.reset()
    msgServiceSpy.warning.calls.reset()
    apiServiceSpy.getAnnouncementById.calls.reset()
    apiServiceSpy.addAnnouncement.calls.reset()
    apiServiceSpy.updateAnnouncementById.calls.reset()
    portalServiceSpy.getCurrentPortalData.calls.reset()
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

  it('should getAllWorkspaces onInit', () => {
    const portals = [
      {
        portalName: 'portal',
        id: 'id'
      }
    ]
    portalServiceSpy.getCurrentPortalData.and.returnValue(of(portals))
    component.availablePortals = []

    component.ngOnInit()

    expect(component.availablePortals).toContain({
      label: 'portal',
      value: 'id'
    })
  })

  it('should log error if getAvailablePortals fails', () => {
    portalServiceSpy.getCurrentPortalData.and.returnValue(throwError(() => new Error()))
    spyOn(console, 'error')

    component.ngOnInit()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'GENERAL.WORKSPACES.NOT_FOUND'
    })
  })

  it('should fill the form with Announcement related to an App', () => {
    component.changeMode = 'VIEW'
    component.announcementId = 'id'
    component.announcement = {
      id: 'id',
      appId: 'appId',
      title: 'title',
      startDate: '2023-01-02',
      endDate: '2023-01-03'
    }
    const result = (component as any).fillForm()

    expect(component.formGroup.value['appId']).toEqual(component.announcement.appId)
    expect(component.formGroup.value['portalId']).toBeNull()
    expect(component.originallyAssignedTo).toEqual('App')
    expect(result).not.toBeDefined()
  })

  it('should fill the form with Announcement related to an Workspace', () => {
    const workspaceId = '9147e1b3-32c2-424c-9f05-6260fb023a71'
    component.changeMode = 'VIEW'
    component.announcementId = 'id'
    component.announcement = {
      id: 'id',
      appId: workspaceId,
      title: 'title',
      startDate: '2023-01-02',
      endDate: '2023-01-03'
    }
    const result = (component as any).fillForm()

    expect(component.formGroup.value['portalId']).toEqual(workspaceId)
    expect(component.originallyAssignedTo).toEqual('Workspace')
    expect(result).not.toBeDefined()
  })

  it('should behave correctly onChanges in edit mode', () => {
    component.changeMode = 'EDIT'
    const testId = 'test id'
    component.announcement = {
      id: testId
    }

    component.ngOnChanges()

    expect(component.displayDateRangeError).toBeFalse()
    expect(component.announcementId).toEqual(testId)
  })

  it('should behave correctly onChanges in new mode', () => {
    component.changeMode = 'NEW'
    const testId = 'test id'
    component.announcement = {
      id: testId
    }

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
    component.announcement = {
      id: 'test id'
    }
    const newAnnouncement = {
      id: 'new id'
    }

    component.ngOnChanges()

    expect(component.announcement).toEqual(newAnnouncement)
  })

  it('should display error if getAnnouncementById call fails', () => {
    apiServiceSpy.getAnnouncementById.and.returnValue(throwError(() => new Error()))
    component.changeMode = 'EDIT'
    component.announcement = {
      id: 'test id'
    }

    component.ngOnChanges()

    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'SEARCH.MSG_SEARCH_FAILED'
    })
  })

  it('should set originallyAssignedTo to "App" if announcement has certain appId', () => {
    component.changeMode = 'NEW'
    component.announcement = {
      id: 'test id',
      appId: 'non-uuid-app-id'
    }

    component.ngOnChanges()

    expect(component.originallyAssignedTo).toEqual('App')
  })

  it('should restore the original value in assignedToChange if no change and value is "App"', () => {
    component.formGroup = formGroup
    component.announcement = {
      id: 'test id',
      appId: 'app id'
    }
    const event = {
      value: 'App'
    }
    component.originallyAssignedTo = 'App'

    component.assignedToChange(event)

    expect(component.formGroup.value['appId']).toEqual(component.announcement.appId)
  })

  it('should restore the original value in assignedToChange if no change and value is "Workspace"', () => {
    component.formGroup = formGroup
    component.announcement = {
      id: 'test id',
      appId: 'app id'
    }
    const event = {
      value: 'Workspace'
    }
    component.originallyAssignedTo = 'Workspace'

    component.assignedToChange(event)

    expect(component.formGroup.value['portalId']).toEqual(component.announcement.appId)
  })

  it('should clear the appId value in assignedToChange if change is made', () => {
    component.formGroup = formGroup
    component.announcement = {
      id: 'test id',
      appId: 'app id'
    }
    const event = {
      value: 'Workspace'
    }
    component.originallyAssignedTo = 'other'

    component.assignedToChange(event)

    expect(component.formGroup.value['appId']).toBeNull()
  })

  it('should create an announcement onSave in new mode', () => {
    apiServiceSpy.addAnnouncement.and.returnValue(of({}))
    component.changeMode = 'NEW'
    spyOn(component.hideDialogAndChanged, 'emit')
    component.formGroup = formGroup

    component.onSave()

    expect(msgServiceSpy.success).toHaveBeenCalledWith({
      summaryKey: 'ANNOUNCEMENT_DETAIL.SUCCESSFUL_ANNOUNCEMENT_CREATED'
    })
    expect(component.hideDialogAndChanged.emit).toHaveBeenCalledWith(true)
  })

  it('should handle api call error in new mode', () => {
    apiServiceSpy.addAnnouncement.and.returnValue(throwError(() => new Error()))
    component.changeMode = 'NEW'
    component.formGroup = formGroup

    component.onSave()

    expect(component.formGroup.valid).toBeTrue()
    expect(msgServiceSpy.error).toHaveBeenCalledWith({
      summaryKey: 'ANNOUNCEMENT_DETAIL.ANNOUNCEMENT_CREATE_ERROR'
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
      summaryKey: 'ANNOUNCEMENT_DETAIL.SUCCESSFUL_ANNOUNCEMENT_UPDATE'
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
      summaryKey: 'ANNOUNCEMENT_DETAIL.ANNOUNCEMENT_UPDATE_ERROR'
    })
  })

  it('should handle formGroup values in submitFormGroupValues: portalId is "all"', () => {
    component.formGroup = formGroup
    component.formGroup.patchValue({ assignedTo: 'Workspace' })
    component.formGroup.patchValue({ portalId: 'all' })

    const result = (component as any).submitFormGroupValues()

    expect(result.appId).toBeNull()
  })

  it('should handle formGroup values in submitFormGroupValues: portalId is not "all"', () => {
    component.formGroup = formGroup
    component.formGroup.patchValue({ assignedTo: 'Workspace' })
    component.formGroup.patchValue({ portalId: 'portal id' })

    const result = (component as any).submitFormGroupValues()

    expect(result.appId).toEqual('portal id')
  })

  it('should display warning onSave if dateRange invalid', () => {
    component.formGroup = formGroup
    component.formGroup.setErrors({ dateRange: true })

    component.onSave()

    expect(msgServiceSpy.warning).toHaveBeenCalledWith({
      summaryKey: 'ANNOUNCEMENT_DETAIL.ANNOUNCEMENT_DATE_ERROR',
      detailKey: 'ANNOUNCEMENT_DETAIL.ANNOUNCEMENT_DATE_HINT'
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
})
