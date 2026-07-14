import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { AsyncPipe, DatePipe } from '@angular/common'
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { finalize, Observable } from 'rxjs'

import { BadgeModule } from 'primeng/badge'
import { ButtonModule } from 'primeng/button'
import { CardModule } from 'primeng/card'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { ConfirmPopupModule } from 'primeng/confirmpopup'
import { DataViewModule } from 'primeng/dataview'
import { DatePicker } from 'primeng/datepicker'
import { DialogModule } from 'primeng/dialog'
import { DynamicDialogModule } from 'primeng/dynamicdialog'
import { FloatLabelModule } from 'primeng/floatlabel'
import { FieldsetModule } from 'primeng/fieldset'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { InputTextModule } from 'primeng/inputtext'
import { InputSwitchModule } from 'primeng/inputswitch'
import { MessageModule } from 'primeng/message'
import { SelectModule } from 'primeng/select'
import { SelectButtonModule } from 'primeng/selectbutton'
import { SelectItem } from 'primeng/api'
import { TableModule } from 'primeng/table'
import { TabsModule } from 'primeng/tabs'
import { TextareaModule } from 'primeng/textarea'
import { ToastModule } from 'primeng/toast'
import { TooltipModule } from 'primeng/tooltip'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
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

import { AnnouncementEnumTranslation } from '../announcement-enum-translation'
import type { ChangeMode } from '../announcement-search/announcement-search.component'

export function dateRangeValidator(fg: FormGroup): ValidatorFn {
  return (): ValidationErrors | null => {
    const startDate = fg.get('startDate')?.value
    const endDate = fg.get('endDate')?.value
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
  standalone: true,
  imports: [
    AngularAcceleratorModule,
    // CommonModule
    AsyncPipe,
    DatePipe,
    // other modules
    BadgeModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DataViewModule,
    DatePicker,
    DialogModule,
    DynamicDialogModule,
    FloatLabelModule,
    FieldsetModule,
    FormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    InputSwitchModule,
    MessageModule,
    ReactiveFormsModule,
    SelectModule,
    SelectButtonModule,
    TableModule,
    TabsModule,
    TextareaModule,
    ToastModule,
    TooltipModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-detail.component.html',
  styleUrl: './announcement-detail.component.scss'
})
export class AnnouncementDetailComponent implements OnChanges {
  @Input() public announcement: Announcement | undefined
  @Input() public changeMode: ChangeMode = 'VIEW'
  @Input() public allWorkspaces: SelectItem[] = []
  @Input() public allProducts: SelectItem[] = []
  @Input() public visible = false
  @Output() public visibleChange = new EventEmitter<boolean>()

  private readonly destroyRef = inject(DestroyRef)
  public loading = false
  public exceptionKey: string | undefined = undefined
  public datetimeFormat = 'M/d/yy, hh:mm:ss a'
  public dateFormat = 'mm/dd/yy'
  public timeFormat = '12'
  // form
  public announcementForm: FormGroup
  public readonly typeOptions$: Observable<SelectItem[]>
  public readonly statusOptions$: Observable<SelectItem[]>
  public readonly priorityTypeOptions$: Observable<SelectItem[]>

  private readonly previewDefault: Preview = {
    status: AnnouncementStatus.Inactive,
    type: AnnouncementType.Info,
    priority: AnnouncementPriorityType.Normal
  }
  public preview: Preview = this.previewDefault

  constructor(
    private readonly user: UserService,
    private readonly announcementApi: AnnouncementInternalAPIService,
    private readonly fb: FormBuilder,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService
  ) {
    this.user.lang$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lang) => {
      this.datetimeFormat = lang === 'de' ? 'dd.MM.yyyy HH:mm:ss' : this.datetimeFormat
      this.dateFormat = lang === 'de' ? 'dd.mm.yy' : this.dateFormat
      this.timeFormat = lang === 'de' ? '24' : this.timeFormat
    })
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
    this.announcementForm
      .get('startDate')!
      .addValidators([Validators.required, dateRangeValidator(this.announcementForm)])
    this.announcementForm.get('endDate')!.addValidators([dateRangeValidator(this.announcementForm)])
    // prepare dropdown lists
    this.typeOptions$ = AnnouncementEnumTranslation.announcementType(this.translate)
    this.statusOptions$ = AnnouncementEnumTranslation.announcementStatus(this.translate)
    this.priorityTypeOptions$ = AnnouncementEnumTranslation.announcementPriorityType(this.translate)
  }

  public ngOnChanges() {
    if (!this.visible) return
    this.exceptionKey = undefined
    // matching mode and given data?
    switch (this.changeMode) {
      case 'CREATE':
        this.prepareForm()
        break
      case 'COPY':
        this.prepareForm(this.announcement)
        break
      case 'EDIT':
      case 'VIEW':
        this.getData(this.announcement?.id)
        break
    }
  }

  private prepareForm(data?: Announcement): void {
    if (data) {
      this.announcementForm.patchValue(data)
      this.announcementForm.get('startDate')!.patchValue(data?.startDate ? new Date(data.startDate) : null)
      this.announcementForm.get('endDate')!.patchValue(data?.endDate ? new Date(data.endDate) : null)
      this.preview = { status: data.status!, type: data.type!, priority: data.priority! }
    } else this.preview = this.previewDefault // for create mode

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
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
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
    this.visibleChange.emit(changed ?? false)
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
    else this.updateItem(this.announcement?.id, item as UpdateAnnouncementRequest)
  }

  private createItem(item: CreateAnnouncementRequest) {
    this.announcementApi
      .createAnnouncement({
        createAnnouncementRequest: item
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
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
        .pipe(takeUntilDestroyed(this.destroyRef))
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
}
