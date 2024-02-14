import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators, ValidationErrors, ValidatorFn } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { finalize, Observable, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'

import { Action, PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import {
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  Announcement,
  AnnouncementPriorityType,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementInternalAPIService
} from 'src/app/shared/generated'

export function dateRangeValidator(fg: FormGroup): ValidatorFn {
  return (): ValidationErrors | null => {
    const startDate = fg.controls['startDate']?.value
    const endDate = fg.controls['endDate']?.value
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      return start >= end ? { invalidDateRange: true } : null
    } else return null
  }
}

@Component({
  selector: 'app-announcement-detail',
  templateUrl: './announcement-detail.component.html',
  styleUrls: ['./announcement-detail.component.scss']
})
export class AnnouncementDetailComponent implements OnInit, OnChanges {
  @Input() public changeMode = 'NEW'
  @Input() public displayDetailDialog = false
  @Input() public announcement: Announcement | undefined
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()

  announcementId: string | undefined
  announcementDeleteVisible = false
  workspaces: SelectItem[] = []
  actions: Action[] = []
  public dateFormat: string
  isLoading = false
  displayDateRangeError = false
  // form
  formGroup: FormGroup
  autoResize!: boolean
  public typeOptions$: Observable<SelectItem[]> = of([])
  public statusOptions$: Observable<SelectItem[]> = of([])
  public priorityOptions$: Observable<SelectItem[]> = of([])

  constructor(
    private user: UserService,
    private announcementApi: AnnouncementInternalAPIService,
    private fb: FormBuilder,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm:ss' : 'medium'
    this.prepareDropDownOptions()
    this.formGroup = fb.nonNullable.group({
      id: new FormControl(null),
      modificationCount: new FormControl(null),
      title: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(255)]),
      content: new FormControl(null),
      appId: new FormControl(null),
      workspaceName: new FormControl(null),
      type: new FormControl(null),
      priority: new FormControl(null),
      status: new FormControl(null),
      startDate: new FormControl(null, [Validators.required]),
      endDate: new FormControl(null)
    })
    this.formGroup.controls['startDate'].addValidators([Validators.required, dateRangeValidator(this.formGroup)])
    this.autoResize = true
  }

  ngOnInit() {
    this.translate.get(['ANNOUNCEMENT.EVERY_WORKSPACE']).subscribe((data) => {
      this.getWorkspaces(data['ANNOUNCEMENT.EVERY_WORKSPACE'])
    })
  }

  ngOnChanges() {
    this.displayDateRangeError = false
    if (this.changeMode === 'EDIT') {
      this.announcementId = this.announcement?.id
      this.getAnnouncement()
    }
    if (this.changeMode === 'NEW') {
      this.announcementId = undefined
      if (this.announcement) {
        this.fillForm() // on COPY
      } else {
        this.formGroup.reset()
        this.formGroup.controls['type'].setValue(AnnouncementType.Info)
        this.formGroup.controls['priority'].setValue(AnnouncementPriorityType.Normal)
        this.formGroup.controls['status'].setValue(AnnouncementStatus.Inactive)
      }
    }
  }

  public onDialogHide() {
    this.displayDetailDialog = false
    this.hideDialogAndChanged.emit(false)
  }

  /**
   * READING data
   */
  private getAnnouncement(): void {
    if (this.announcementId) {
      this.isLoading = true
      this.announcement = undefined
      this.announcementApi
        .getAnnouncementById({ id: this.announcementId })
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (item) => {
            this.announcement = item
            this.fillForm()
          },
          error: () => this.msgService.error({ summaryKey: 'SEARCH.MSG_SEARCH_FAILED' })
        })
    }
  }

  private fillForm(): void {
    this.formGroup.patchValue({
      ...this.announcement,
      startDate: this.announcement?.startDate ? new Date(this.announcement.startDate) : null,
      endDate: this.announcement?.endDate ? new Date(this.announcement.endDate) : null
    })
  }

  private getWorkspaces(dropdownDefault: string): void {
    this.workspaces.push({
      label: dropdownDefault,
      value: null
    })
    this.announcementApi.getAllWorkspaceNames().subscribe({
      next: (workspaces) => {
        for (let workspace of workspaces) {
          this.workspaces.push({ label: workspace, value: workspace })
        }
      },
      error: () => this.msgService.error({ summaryKey: 'GENERAL.WORKSPACES.NOT_FOUND' })
    })
  }

  /**
   * SAVING => create or update
   */
  public onSave(): void {
    if (this.formGroup.errors?.['dateRange']) {
      this.msgService.warning({
        summaryKey: 'ANNOUNCEMENT_DETAIL.ANNOUNCEMENT_DATE_ERROR',
        detailKey: 'ANNOUNCEMENT_DETAIL.ANNOUNCEMENT_DATE_HINT'
      })
    } else if (this.formGroup.valid) {
      if (this.changeMode === 'EDIT' && this.announcementId) {
        this.announcementApi
          .updateAnnouncementById({
            id: this.announcementId,
            updateAnnouncementRequest: this.submitFormGroupValues() as UpdateAnnouncementRequest
          })
          .subscribe({
            next: () => {
              this.msgService.success({ summaryKey: 'ANNOUNCEMENT_DETAIL.SUCCESSFUL_ANNOUNCEMENT_UPDATE' })
              this.hideDialogAndChanged.emit(true)
            },
            error: () => this.msgService.error({ summaryKey: 'ANNOUNCEMENT_DETAIL.ANNOUNCEMENT_UPDATE_ERROR' })
          })
      } else if (this.changeMode === 'NEW') {
        this.announcementApi
          .createAnnouncement({
            createAnnouncementRequest: this.submitFormGroupValues() as CreateAnnouncementRequest
          })
          .subscribe({
            next: () => {
              this.msgService.success({ summaryKey: 'ANNOUNCEMENT_DETAIL.SUCCESSFUL_ANNOUNCEMENT_CREATED' })
              this.hideDialogAndChanged.emit(true)
            },
            error: () => this.msgService.error({ summaryKey: 'ANNOUNCEMENT_DETAIL.ANNOUNCEMENT_CREATE_ERROR' })
          })
      }
    }
  }

  private submitFormGroupValues(): any {
    if (this.formGroup.controls['workspaceName'].value === 'all') {
      this.formGroup.controls['workspaceName'].setValue(null)
      //} else {
      //  this.formGroup.controls['appId'].setValue(this.formGroup.controls['portalId'].value)
    }
    return this.formGroup.value
  }

  /****************************************************************************
   *  SERVER responses & internal
   */
  private prepareDropDownOptions() {
    this.typeOptions$ = this.translate
      .get([
        'ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.Event,
        'ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.Info,
        'ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.SystemMaintenance
      ])
      .pipe(
        map((data) => {
          return [
            { label: data['ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.Event], value: AnnouncementType.Event },
            { label: data['ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.Info], value: AnnouncementType.Info },
            {
              label: data['ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.SystemMaintenance],
              value: AnnouncementType.SystemMaintenance
            }
          ]
        })
      )
    this.priorityOptions$ = this.translate
      .get([
        'ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Important,
        'ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Low,
        'ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Normal
      ])
      .pipe(
        map((data) => {
          return [
            {
              label: data['ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Important],
              value: AnnouncementPriorityType.Important
            },
            {
              label: data['ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Normal],
              value: AnnouncementPriorityType.Normal
            },
            {
              label: data['ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Low],
              value: AnnouncementPriorityType.Low
            }
          ]
        })
      )
  }
}
