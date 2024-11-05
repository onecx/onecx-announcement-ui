import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators, ValidationErrors, ValidatorFn } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { finalize, Observable, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'
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
export class AnnouncementDetailComponent implements OnChanges {
  @Input() public changeMode = 'NEW'
  @Input() public displayDetailDialog = false
  @Input() public announcement: Announcement | undefined
  @Input() public allWorkspaces: SelectItem[] = []
  @Input() public allProducts: SelectItem[] = []
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()

  announcementId: string | undefined
  announcementDeleteVisible = false
  public dateFormat: string
  public timeFormat: string
  public isLoading = false
  public displayDateRangeError = false
  // form
  formGroup: FormGroup
  public typeOptions$: Observable<SelectItem[]> = of([])
  public statusOptions$: Observable<SelectItem[]> = of([])
  public priorityOptions$: Observable<SelectItem[]> = of([])

  constructor(
    private readonly user: UserService,
    private readonly announcementApi: AnnouncementInternalAPIService,
    private readonly fb: FormBuilder,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.mm.yy' : 'mm/dd/yy'
    this.timeFormat = this.user.lang$.getValue() === 'de' ? '24' : '12'
    this.prepareDropDownOptions()
    this.formGroup = fb.nonNullable.group({
      id: new FormControl(null),
      modificationCount: new FormControl(null),
      title: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(255)]),
      content: new FormControl(null, [Validators.maxLength(1000)]),
      appId: new FormControl(null),
      workspaceName: new FormControl(null),
      productName: new FormControl(null),
      type: new FormControl(null),
      priority: new FormControl(null),
      status: new FormControl(null),
      startDate: new FormControl(null, [Validators.required]),
      endDate: new FormControl(null)
    })
    this.formGroup.controls['startDate'].addValidators([Validators.required, dateRangeValidator(this.formGroup)])
    this.formGroup.controls['endDate'].addValidators([dateRangeValidator(this.formGroup)])
  }

  ngOnChanges() {
    this.displayDateRangeError = false
    if (this.changeMode === 'EDIT' || this.changeMode === 'VIEW') {
      this.announcementId = this.announcement?.id
      this.getAnnouncement()
      if (this.changeMode === 'VIEW') this.formGroup.disable()
    }
    if (this.changeMode === 'NEW') {
      this.announcementId = undefined
      if (this.announcement) {
        this.fillForm() // on COPY
      } else {
        this.formGroup.reset()
        this.formGroup.controls['type'].setValue(AnnouncementType.Info)
        this.formGroup.controls['status'].setValue(AnnouncementStatus.Inactive)
        this.formGroup.controls['priority'].setValue(AnnouncementPriorityType.Normal)
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
          error: () => this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.SEARCH_FAILED' })
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

  /**
   * SAVING => create or update
   */
  public onSave(): void {
    if (this.formGroup.errors?.['dateRange']) {
      this.msgService.warning({
        summaryKey: 'VALIDATION.ERRORS.INVALID_DATE_RANGE'
      })
    } else if (this.formGroup.valid) {
      if (this.changeMode === 'EDIT' && this.announcementId) {
        this.announcementApi
          .updateAnnouncementById({
            id: this.announcementId,
            updateAnnouncementRequest: this.submitFormValues() as UpdateAnnouncementRequest
          })
          .subscribe({
            next: () => {
              this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.OK' })
              this.hideDialogAndChanged.emit(true)
            },
            error: () => this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.NOK' })
          })
      } else if (this.changeMode === 'NEW') {
        this.announcementApi
          .createAnnouncement({
            createAnnouncementRequest: this.submitFormValues() as CreateAnnouncementRequest
          })
          .subscribe({
            next: () => {
              this.msgService.success({ summaryKey: 'ACTIONS.CREATE.MESSAGE.OK' })
              this.hideDialogAndChanged.emit(true)
            },
            error: () => this.msgService.error({ summaryKey: 'ACTIONS.CREATE.MESSAGE.NOK' })
          })
      }
    }
  }

  private submitFormValues(): any {
    const announcement: Announcement = { ...this.formGroup.value }
    return announcement
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
