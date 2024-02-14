import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { SelectItem } from 'primeng/api'
import { Observable, map, of } from 'rxjs'

import { Action, UserService } from '@onecx/portal-integration-angular'
import {
  AnnouncementPriorityType,
  AnnouncementStatus,
  AnnouncementType,
  SearchAnnouncementsRequestParams
} from 'src/app/shared/generated'

export interface AnnouncementCriteriaForm {
  title: FormControl<string | null>
  workspaceName: FormControl<string | null>
  //appId: FormControl<string | null>
  status: FormControl<AnnouncementStatus[] | null>
  type: FormControl<AnnouncementType[] | null>
  priority: FormControl<AnnouncementPriorityType[] | null>
  startDateRange: FormControl<Date[] | null>
}

@Component({
  selector: 'app-announcement-criteria',
  templateUrl: './announcement-criteria.component.html',
  styleUrls: ['./announcement-criteria.component.scss']
})
export class AnnouncementCriteriaComponent implements OnInit {
  @Input() public actions: Action[] = []
  @Input() public workspaces: SelectItem[] = []
  @Output() public criteriaEmitter = new EventEmitter<SearchAnnouncementsRequestParams>()

  public displayCreateDialog = false
  public announcementCriteriaGroup!: FormGroup<AnnouncementCriteriaForm>
  public dateFormatForRange: string
  public filteredTitles: any[] = []
  public type$: Observable<SelectItem[]> = of([])
  public statusOptions$: Observable<SelectItem[]> = of([])
  public priorityType$: Observable<SelectItem[]> = of([])

  constructor(private user: UserService, public translate: TranslateService) {
    this.dateFormatForRange = this.user.lang$.getValue() === 'de' ? 'dd.mm.yy' : 'm/d/yy'
  }

  ngOnInit(): void {
    this.announcementCriteriaGroup = new FormGroup<AnnouncementCriteriaForm>({
      title: new FormControl<string | null>(null),
      workspaceName: new FormControl<string | null>(null),
      //appId: new FormControl<string | null>(null),
      status: new FormControl<AnnouncementStatus[] | null>(null),
      type: new FormControl<AnnouncementType[] | null>(null),
      priority: new FormControl<AnnouncementPriorityType[] | null>(null),
      startDateRange: new FormControl<Date[] | null>(null)
    })
    this.type$ = this.translate
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
    this.statusOptions$ = this.translate
      .get([
        'ENUMS.ANNOUNCEMENT_STATUS.' + AnnouncementStatus.Active,
        'ENUMS.ANNOUNCEMENT_STATUS.' + AnnouncementStatus.Inactive
      ])
      .pipe(
        map((data) => {
          return [
            {
              label: data['ENUMS.ANNOUNCEMENT_STATUS.' + AnnouncementStatus.Active],
              value: AnnouncementStatus.Active
            },
            {
              label: data['ENUMS.ANNOUNCEMENT_STATUS.' + AnnouncementStatus.Inactive],
              value: AnnouncementStatus.Inactive
            }
          ]
        })
      )
    this.priorityType$ = this.translate
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

  public submitCriteria(): void {
    const criteriaRequest: SearchAnnouncementsRequestParams = {
      announcementSearchCriteria: {
        title:
          this.announcementCriteriaGroup.value.title === null ? undefined : this.announcementCriteriaGroup.value.title,
        //appId:
        //  this.announcementCriteriaGroup.value.appId === null ? undefined : this.announcementCriteriaGroup.value.appId,
        workspaceName:
          this.announcementCriteriaGroup.value.workspaceName === null
            ? undefined
            : this.announcementCriteriaGroup.value.workspaceName,
        priority:
          this.announcementCriteriaGroup.value.priority === null
            ? undefined
            : this.announcementCriteriaGroup.value.priority?.[0],
        status:
          this.announcementCriteriaGroup.value.status === null
            ? undefined
            : this.announcementCriteriaGroup.value.status?.[0],
        type:
          this.announcementCriteriaGroup.value.type === null
            ? undefined
            : this.announcementCriteriaGroup.value.type?.[0]
      }
    }
    if (this.announcementCriteriaGroup.value.startDateRange) {
      const dates = this.mapDateRangeToDateStrings(this.announcementCriteriaGroup.value.startDateRange)
      criteriaRequest.announcementSearchCriteria.startDateFrom = dates[0]
      criteriaRequest.announcementSearchCriteria.startDateTo = dates[1]
    }
    this.criteriaEmitter.emit(criteriaRequest)
  }

  private mapDateRangeToDateStrings(dateRange: Date[]) {
    let dateFrom!: Date
    let dateTo!: Date

    if (dateRange[1] == null || dateRange[0].toDateString() === dateRange[1].toDateString()) {
      dateFrom = dateRange[0]
      dateTo = new Date(dateFrom)
      dateTo.setFullYear(3000)
    } else {
      dateFrom = dateRange[0]
      dateTo = dateRange[1]
    }
    return [dateFrom.toISOString(), dateTo.toISOString()]
  }
}
