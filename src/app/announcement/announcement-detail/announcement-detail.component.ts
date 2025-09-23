import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators, ValidationErrors, ValidatorFn } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { finalize, Observable, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'

import {
  Announcement,
  AnnouncementPriorityType,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementInternalAPIService,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest
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
type Preview = { status: AnnouncementStatus; type: AnnouncementType; priority: AnnouncementPriorityType }

@Component({
  selector: 'app-announcement-detail',
  templateUrl: './announcement-detail.component.html',
  styleUrls: ['./announcement-detail.component.scss']
})
export class AnnouncementDetailComponent implements OnChanges {
  @Input() public displayDialog = false
  @Input() public changeMode: ChangeMode = 'VIEW'
  @Input() public announcement: Announcement | undefined
  @Input() public allWorkspaces: SelectItem[] = []
  @Input() public allProducts: SelectItem[] = []
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()

  public loading = false
  public exceptionKey: string | undefined = undefined
  public datetimeFormat: string
  public dateFormat: string
  public timeFormat: string
  public displayDateRangeError = false
  // form
  public announcementForm: FormGroup
  public typeOptions$: Observable<SelectItem[]> = of([])
  public statusOptions$: Observable<SelectItem[]> = of([])
  public priorityOptions$: Observable<SelectItem[]> = of([])
  public AnnouncementPriorityType = AnnouncementPriorityType
  public AnnouncementType = AnnouncementType
  private readonly previewDefault: Preview = {
    status: AnnouncementStatus.Inactive,
    type: AnnouncementType.Info,
    priority: AnnouncementPriorityType.Normal
  }
  public preview = this.previewDefault

  constructor(
    private readonly user: UserService,
    private readonly announcementApi: AnnouncementInternalAPIService,
    private readonly fb: FormBuilder,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService
  ) {
    this.datetimeFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm:ss' : 'M/d/yy, hh:mm:ss a'
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.mm.yy' : 'mm/dd/yy'
    this.timeFormat = this.user.lang$.getValue() === 'de' ? '24' : '12'
    this.announcementForm = fb.nonNullable.group({
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
    this.announcementForm.controls['startDate'].addValidators([
      Validators.required,
      dateRangeValidator(this.announcementForm)
    ])
    this.announcementForm.controls['endDate'].addValidators([dateRangeValidator(this.announcementForm)])
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
      this.announcementForm.patchValue(data)
      this.announcementForm.controls['startDate'].patchValue(data?.startDate ? new Date(data.startDate) : null)
      this.announcementForm.controls['endDate'].patchValue(data?.endDate ? new Date(data.endDate) : null)
      this.preview = { status: data.status!, type: data.type!, priority: data.priority! }
    } else this.preview = this.previewDefault

    switch (this.changeMode) {
      case 'COPY':
        this.announcementForm.enable()
        break
      case 'CREATE':
        this.announcementForm.reset()
        this.announcementForm.enable()
        break
      case 'EDIT':
        this.announcementForm.enable()
        break
      case 'VIEW':
        this.announcementForm.disable()
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
          this.announcementForm.reset()
          this.announcementForm.disable()
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
    this.announcementForm.reset()
  }
  public onChangeAnnouncementStatus(ev: any) {
    this.preview.status = ev.checked
  }
  public onChangeAnnouncementType(ev: any) {
    this.preview.type = ev.value
  }
  public onChangeAnnouncementPriority(ev: any) {
    this.preview.priority = ev.value
  }

  /**
   * SAVING => create or update
   */
  public onSave(): void {
    if (this.announcementForm.errors?.['dateRange']) {
      this.msgService.warning({ summaryKey: 'VALIDATION.ERRORS.INVALID_DATE_RANGE' })
      return
    }
    if (!this.announcementForm.valid) {
      this.msgService.warning({ summaryKey: 'VALIDATION.ERRORS.INVALID_FORM' })
      return
    }
    const item = { ...this.announcementForm.value } as Announcement
    if (['COPY', 'CREATE'].includes(this.changeMode)) this.createItem(item as CreateAnnouncementRequest)
    else this.updateItem(item?.id, item as UpdateAnnouncementRequest)
  }

  private createItem(item: CreateAnnouncementRequest) {
    this.announcementApi
      .createAnnouncement({
        createAnnouncementRequest: item
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
  private updateItem(id: string | undefined, item: UpdateAnnouncementRequest): void {
    if (id) {
      this.announcementApi
        .updateAnnouncementById({
          id: id,
          updateAnnouncementRequest: item
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
