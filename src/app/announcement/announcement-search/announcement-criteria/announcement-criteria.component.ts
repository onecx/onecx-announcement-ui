import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { Observable } from 'rxjs'

import { ButtonModule } from 'primeng/button'
import { DatePickerModule } from 'primeng/datepicker'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputTextModule } from 'primeng/inputtext'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { SelectModule } from 'primeng/select'
import { SelectItem } from 'primeng/api'
import { TooltipModule } from 'primeng/tooltip'

import { UserService } from '@onecx/angular-integration-interface'
import { Action, AngularAcceleratorModule } from '@onecx/angular-accelerator'

import {
  AnnouncementPriorityType,
  AnnouncementSearchCriteria,
  AnnouncementStatus,
  AnnouncementType
} from 'src/app/shared/generated'
import { Utils } from 'src/app/shared/utils'
import { AnnouncementEnumTranslation } from '../../announcement-enum-translation'

export interface AnnouncementCriteriaForm {
  title: FormControl<string | null>
  workspaceName: FormControl<string | null>
  productName: FormControl<string | null>
  status: FormControl<AnnouncementStatus | null>
  type: FormControl<AnnouncementType | null>
  priority: FormControl<AnnouncementPriorityType | null>
  startDateRange: FormControl<Date[] | null>
}

@Component({
  selector: 'app-announcement-criteria',
  standalone: true,
  imports: [
    AngularAcceleratorModule,
    AsyncPipe,
    FloatLabelModule,
    DatePickerModule,
    FormsModule,
    ReactiveFormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    ButtonModule,
    SelectModule,
    TooltipModule,
    TranslateModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './announcement-criteria.component.html',
  styleUrl: './announcement-criteria.component.scss'
})
export class AnnouncementCriteriaComponent implements OnChanges {
  @Input() public criteria: AnnouncementSearchCriteria | undefined
  @Input() public actions: Action[] = []
  @Input() public usedWorkspaces: SelectItem[] = []
  @Input() public usedProducts: SelectItem[] = []
  @Output() public searchEmitter = new EventEmitter<AnnouncementSearchCriteria>()
  @Output() public resetSearchEmitter = new EventEmitter<boolean>()

  public criteriaForm!: FormGroup<AnnouncementCriteriaForm>
  public dateFormatForRange: string
  public filteredTitles = []
  public typeOptions$: Observable<SelectItem[]>
  public statusOptions$: Observable<SelectItem[]>
  public priorityTypeOptions$: Observable<SelectItem[]>

  constructor(
    private readonly user: UserService,
    public readonly translate: TranslateService
  ) {
    this.dateFormatForRange = this.user.lang$.getValue() === 'de' ? 'dd.mm.yy' : 'm/d/yy'
    this.criteriaForm = new FormGroup<AnnouncementCriteriaForm>({
      title: new FormControl<string | null>(null),
      workspaceName: new FormControl<string | null>(null),
      productName: new FormControl<string | null>(null),
      status: new FormControl<AnnouncementStatus | null>(null),
      type: new FormControl<AnnouncementType | null>(null),
      priority: new FormControl<AnnouncementPriorityType | null>(null),
      startDateRange: new FormControl<Date[] | null>(null)
    })
    this.typeOptions$ = AnnouncementEnumTranslation.announcementType(this.translate)
    this.statusOptions$ = AnnouncementEnumTranslation.announcementStatus(this.translate)
    this.priorityTypeOptions$ = AnnouncementEnumTranslation.announcementPriorityType(this.translate)
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['criteria']) {
      this.applyCriteria(this.criteria)
    }
  }

  public onSearch(): void {
    const criteria: AnnouncementSearchCriteria = {
      title: this.criteriaForm.value.title === null ? undefined : this.criteriaForm.value.title,
      workspaceName: this.criteriaForm.value.workspaceName === null ? undefined : this.criteriaForm.value.workspaceName,
      productName: this.criteriaForm.value.productName === null ? undefined : this.criteriaForm.value.productName,
      priority: this.criteriaForm.value.priority === null ? undefined : this.criteriaForm.value.priority,
      status: this.criteriaForm.value.status === null ? undefined : this.criteriaForm.value.status,
      type: this.criteriaForm.value.type === null ? undefined : this.criteriaForm.value.type
    }
    if (this.criteriaForm.value.startDateRange) {
      const dates = Utils.mapDateRangeToDateStrings(this.criteriaForm.value.startDateRange)
      criteria.startDateFrom = dates[0]
      criteria.startDateTo = dates[1]
    }
    this.searchEmitter.emit(criteria)
  }

  public onResetCriteria(): void {
    this.criteriaForm.reset()
    this.resetSearchEmitter.emit(true)
  }

  private applyCriteria(criteria: AnnouncementSearchCriteria | undefined): void {
    if (!criteria) {
      this.criteriaForm.reset()
      return
    }

    this.criteriaForm.patchValue({
      title: criteria.title ?? null,
      workspaceName: criteria.workspaceName ?? null,
      productName: criteria.productName ?? null,
      status: criteria.status ?? null,
      type: criteria.type ?? null,
      priority: criteria.priority ?? null,
      startDateRange: Utils.mapDateStringsToDateRange(criteria.startDateFrom, criteria.startDateTo)
    })
  }
}
