import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators, ValidationErrors, ValidatorFn } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { finalize, Observable, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import {
  Announcement,
  AnnouncementPriorityType,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementInternalAPIService
} from 'src/app/shared/generated'
import { ChangeMode } from '../announcement-search/announcement-search.component'

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
  @Input() public displayDialog = false
  @Input() public changeMode: ChangeMode = 'CREATE'
  @Input() public announcement: Announcement | undefined
  @Input() public allWorkspaces: SelectItem[] = []
  @Input() public allProducts: SelectItem[] = []
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()

  public loading = false
  public exceptionKey: string | undefined = undefined
  public dateFormat: string
  public timeFormat: string
  public displayDateRangeError = false
  // form
  public formGroup: FormGroup
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
    this.formGroup = fb.nonNullable.group({
      modificationCount: new FormControl(null),
      title: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(255)]),
      content: new FormControl(null, [Validators.maxLength(1000)]),
      appId: new FormControl(null),
      workspaceName: new FormControl(null),
      productName: new FormControl(null),
      type: new FormControl(AnnouncementType.Info, { nonNullable: true }),
      priority: new FormControl(AnnouncementPriorityType.Normal, { nonNullable: true }),
      status: new FormControl(AnnouncementStatus.Inactive, { nonNullable: true }),
      startDate: new FormControl(null),
      endDate: new FormControl(null)
    })
    this.formGroup.controls['startDate'].addValidators([Validators.required, dateRangeValidator(this.formGroup)])
    this.formGroup.controls['endDate'].addValidators([dateRangeValidator(this.formGroup)])
    // prepare dropdown lists
    this.prepareDropDownOptions()
  }

  public ngOnChanges() {
    if (!this.displayDialog) return
    this.exceptionKey = undefined
    // matching mode and given data?
    if ('CREATE' === this.changeMode && this.announcement) return
    if (['EDIT', 'VIEW'].includes(this.changeMode))
      if (!this.announcement) return
      else this.getData(this.announcement?.id)
    else this.prepareForm(this.announcement)
  }

  private prepareForm(data?: Announcement): void {
    if (data) {
      this.formGroup.patchValue(data)
      this.formGroup.controls['startDate'].patchValue(data?.startDate ? new Date(data.startDate) : null)
      this.formGroup.controls['endDate'].patchValue(data?.endDate ? new Date(data.endDate) : null)
    }
    switch (this.changeMode) {
      case 'COPY':
        this.formGroup.enable()
        break
      case 'CREATE':
        this.formGroup.reset()
        this.formGroup.enable()
        break
      case 'EDIT':
        this.formGroup.enable()
        break
      case 'VIEW':
        this.formGroup.disable()
        break
    }
  }

  /**
   * READING data
   */
  private getData(id?: string): void {
    if (!id) return
    this.loading = true
    this.exceptionKey = undefined
    this.announcementApi
      .getAnnouncementById({ id: id })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => this.prepareForm(data),
        error: (err) => {
          this.formGroup.reset()
          this.formGroup.disable()
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENT'
          this.msgService.error({ summaryKey: this.exceptionKey })
          console.error('getAnnouncementById', err)
        }
      })
  }

  /****************************************************************************
   *  UI Events
   */
  public onDialogHide(changed?: boolean) {
    this.hideDialogAndChanged.emit(changed ?? false)
    this.formGroup.reset()
  }

  /**
   * SAVING => create or update
   */
  public onSave(): void {
    if (this.formGroup.errors?.['dateRange']) {
      this.msgService.warning({ summaryKey: 'VALIDATION.ERRORS.INVALID_DATE_RANGE' })
      return
    }
    if (!this.formGroup.valid) {
      this.msgService.warning({ summaryKey: 'VALIDATION.ERRORS.INVALID_FORM' })
      return
    }
    if (this.changeMode === 'EDIT' && this.announcement?.id) {
      this.announcementApi
        .updateAnnouncementById({
          id: this.announcement?.id,
          updateAnnouncementRequest: this.formGroup.value
        })
        .subscribe({
          next: () => {
            this.msgService.success({ summaryKey: 'ACTIONS.EDIT.MESSAGE.OK' })
            this.onDialogHide(true)
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.EDIT.MESSAGE.NOK' })
            console.error('updateAnnouncementById', err)
          }
        })
    }
    if (['COPY', 'CREATE'].includes(this.changeMode)) {
      this.announcementApi
        .createAnnouncement({
          createAnnouncementRequest: this.formGroup.value
        })
        .subscribe({
          next: () => {
            this.msgService.success({ summaryKey: 'ACTIONS.CREATE.MESSAGE.OK' })
            this.onDialogHide(true)
          },
          error: (err) => {
            this.msgService.error({ summaryKey: 'ACTIONS.CREATE.MESSAGE.NOK' })
            console.error('createAnnouncement', err)
          }
        })
    }
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
