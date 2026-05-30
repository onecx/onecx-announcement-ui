import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TranslateTestingModule } from 'ngx-translate-testing'
import { of, throwError } from 'rxjs'

import { PortalMessageService } from '@onecx/angular-integration-interface'

import { Announcement, AnnouncementInternalAPIService } from 'src/app/shared/generated'
import { AnnouncementDeleteComponent } from './announcement-delete.component'

const announcement: Announcement = {
  id: 'ann-id',
  title: 'Test Announcement',
  content: 'content',
  productName: 'productName',
  workspaceName: 'workspaceName',
  type: 'EVENT' as any,
  status: 'ACTIVE' as any,
  priority: 'IMPORTANT' as any,
  startDate: '2023-01-02',
  endDate: '2023-01-03'
}

describe('AnnouncementDeleteComponent', () => {
  let component: AnnouncementDeleteComponent
  let fixture: ComponentFixture<AnnouncementDeleteComponent>

  const msgServiceSpy = jasmine.createSpyObj<PortalMessageService>('PortalMessageService', ['success', 'error'])
  const apiServiceSpy = {
    deleteAnnouncementById: jasmine.createSpy('deleteAnnouncementById').and.returnValue(of({}))
  }
  function initTestComponent() {
    fixture = TestBed.createComponent(AnnouncementDeleteComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        AnnouncementDeleteComponent,
        TranslateTestingModule.withTranslations({
          de: require('src/assets/i18n/de.json'),
          en: require('src/assets/i18n/en.json')
        }).withDefaultLanguage('en')
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortalMessageService, useValue: msgServiceSpy },
        { provide: AnnouncementInternalAPIService, useValue: apiServiceSpy }
      ]
    })
      .overrideComponent(AnnouncementDeleteComponent, {
        set: {
          template: '',
          imports: []
        }
      })
      .compileComponents()
  }))

  beforeEach(() => {
    initTestComponent()
  })

  afterEach(() => {
    // to spy data: reset
    msgServiceSpy.success.calls.reset()
    msgServiceSpy.error.calls.reset()
    apiServiceSpy.deleteAnnouncementById.calls.reset()
    // to spy data: refill with neutral data
    apiServiceSpy.deleteAnnouncementById.and.returnValue(of({}))
  })

  describe('construction', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })
  })

  describe('getDisplayName', () => {
    it('should return label from list if name matches', () => {
      const list = [{ label: 'My Workspace', value: 'ws1' }]
      expect(component.getDisplayName('ws1', list)).toBe('My Workspace')
    })

    it('should return undefined if name is not provided', () => {
      expect(component.getDisplayName(undefined, [])).toBeUndefined()
    })

    it('should return undefined if not found in list', () => {
      expect(component.getDisplayName('unknown', [{ label: 'X', value: 'Y' }])).toBeUndefined()
    })

    it('should return undefined if list is undefined', () => {
      expect(component.getDisplayName('ws1', undefined)).toBeUndefined()
    })
  })

  describe('onDeleteConfirmation', () => {
    it('should do nothing if announcement is undefined', () => {
      component.announcement = undefined
      component.onDeleteConfirmation()
      expect(apiServiceSpy.deleteAnnouncementById).not.toHaveBeenCalled()
    })

    it('should do nothing if announcement has no id', () => {
      component.announcement = { title: 'No ID' } as Announcement
      component.onDeleteConfirmation()
      expect(apiServiceSpy.deleteAnnouncementById).not.toHaveBeenCalled()
    })

    it('should delete announcement and emit on success', () => {
      apiServiceSpy.deleteAnnouncementById.and.returnValue(of({}))
      component.announcement = { ...announcement }
      component.visible = true

      const dialogChangeSpy = spyOn(component.visibleChange, 'emit')

      component.onDeleteConfirmation()

      expect(apiServiceSpy.deleteAnnouncementById).toHaveBeenCalledWith({ id: announcement.id })
      expect(msgServiceSpy.success).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
      expect(dialogChangeSpy).toHaveBeenCalledWith(true)
      expect(component.visible).toBeFalse()
    })

    it('should show error message and log on failure', () => {
      const errorResponse = { status: '400', statusText: 'Error on deletion' }
      apiServiceSpy.deleteAnnouncementById.and.returnValue(throwError(() => errorResponse))
      component.announcement = { ...announcement }
      spyOn(console, 'error')

      component.onDeleteConfirmation()

      expect(msgServiceSpy.error).toHaveBeenCalledWith({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
      expect(console.error).toHaveBeenCalledWith('deleteAnnouncementById', errorResponse)
    })
  })
})
