import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { FormBuilder, FormControl, FormGroup, Validators, ValidationErrors, ValidatorFn } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { finalize, Observable, map, of } from 'rxjs'
import { SelectItem } from 'primeng/api'

import { Action, ConfigurationService, PortalMessageService } from '@onecx/portal-integration-angular'
import { PortalService } from '../../services/portalService'
import {
  AnnouncementCreateDTO,
  AnnouncementDetailItemDTO,
  AnnouncementPriorityType,
  AnnouncementStatus,
  AnnouncementType,
  AnnouncementInternalAPIService
} from '../../generated'

export function dateRangeValidator(fg: FormGroup): ValidatorFn {
  return (): ValidationErrors | null => {
    const startDate = fg.controls['startDate']?.value
    const endDate = fg.controls['endDate']?.value
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      return !(start < end) ? { invalidDateRange: true } : null
    } else return null
  }
}

@Component({
  selector: 'am-announcement-detail',
  templateUrl: './announcement-detail.component.html',
  styleUrls: ['./announcement-detail.component.scss']
})
export class AnnouncementDetailComponent implements OnInit, OnChanges {
  @Input() public changeMode = 'NEW'
  @Input() public displayDetailDialog = false
  @Input() public announcement: AnnouncementDetailItemDTO | undefined
  @Output() public hideDialogAndChanged = new EventEmitter<boolean>()

  announcementId: string | undefined
  announcementDeleteVisible = false
  availablePortals: SelectItem[] = []
  actions: Action[] = []
  public dateFormat: string
  isLoading = false
  displayDateRangeError = false
  // form
  formGroup: FormGroup
  autoResize!: boolean
  assignedToOption: SelectItem[] = []
  public typeOptions$: Observable<SelectItem[]> = of([])
  public statusOptions$: Observable<SelectItem[]> = of([])
  public priorityOptions$: Observable<SelectItem[]> = of([])
  originallyAssignedTo = 'Workspace'

  console = console
  constructor(
    private portalApi: PortalService,
    private announcementApi: AnnouncementInternalAPIService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    public config: ConfigurationService,
    private translate: TranslateService,
    private msgService: PortalMessageService
  ) {
    this.dateFormat = this.config.lang === 'de' ? 'dd.MM.yyyy HH:mm' : 'short'
    this.prepareDropDownOptions()
    this.formGroup = fb.nonNullable.group({
      id: new FormControl(null),
      title: new FormControl(null, [Validators.required, Validators.minLength(2), Validators.maxLength(255)]),
      appId: new FormControl(null),
      portalId: new FormControl(null),
      type: new FormControl(null),
      priority: new FormControl(null),
      status: new FormControl(null),
      startDate: new FormControl(null),
      endDate: new FormControl(null),
      content: new FormControl(null),
      // helper
      assignedTo: new FormControl(null)
    })
    this.formGroup.controls['startDate'].addValidators([Validators.required, dateRangeValidator(this.formGroup)])
    this.autoResize = true
  }

  ngOnInit() {
    this.translate.get(['ANNOUNCEMENT.EVERY_WORKSPACE']).subscribe((data) => {
      this.getAllWorkspaces(data['ANNOUNCEMENT.EVERY_WORKSPACE'])
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
        this.formGroup.controls['assignedTo'].setValue('Workspace')
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
    //if appId is null, or "" or has the structure of a uuid, then we assume, that it is assigned to a workspace.
    if (
      !this.announcement?.appId ||
      /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi.test(
        this.announcement.appId
      )
    ) {
      console.log('APP ID', this.announcement?.appId)
      this.formGroup.controls['portalId'].setValue(
        this.announcement?.appId === undefined ? null : this.announcement?.appId
      )
      this.originallyAssignedTo = 'Workspace'
    } else {
      console.log('APP ID 2', this.announcement?.appId)
      this.originallyAssignedTo = 'App'
    }
    this.formGroup.controls['assignedTo'].setValue(this.originallyAssignedTo)
  }

  public assignedToChange(event: any): void {
    //if we 'return' to the originally assigned type, then we restore the original value
    if (event.value === this.originallyAssignedTo) {
      if (event.value === 'App') {
        this.formGroup.controls['appId'].setValue(this.announcement?.appId)
      } else if (event.value === 'Workspace') {
        this.formGroup.controls['portalId'].setValue(this.announcement?.appId)
      }
    }
    //if we switch the assigned-to-type, then we clear the value.
    else {
      this.formGroup.controls['appId'].setValue(null)
    }
  }

  private getAllWorkspaces(dropdownDefault: string): void {
    this.availablePortals.push({
      label: dropdownDefault,
      value: null
    })
    this.portalApi.getCurrentPortalData().subscribe({
      next: (portals) => {
        for (let i = 0; i < portals.length; i++) {
          this.availablePortals.push({ label: portals[i].portalName, value: portals[i].id })
        }
      },
      error: (err) => console.error('Fetching Portals failed', err)
    })
  }

  /* public getPortalName(appId?: string): string | undefined {
    // if no appId, then announcement is assigned to every workspace
    if (!appId || appId === 'all') {
      return this.translate.instant('ANNOUNCEMENT.EVERY_WORKSPACE')
    }
    // if appId matches in the list, then we return the workspace name
    else if (this.availablePortals.find(({ value }) => value === appId)?.label) {
      return this.availablePortals.find(({ value }) => value === appId)?.label
    }
    // if no portalId matches anything in the list, then we return:
    return this.translate.instant('ANNOUNCEMENT.WORKSPACE_NOT_FOUND')
  } */

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
            announcementDetailItemDTO: this.submitFormGroupValues()
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
          .addAnnouncement({
            announcementCreateDTO: this.submitFormGroupValues() as AnnouncementCreateDTO
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

  private submitFormGroupValues(): AnnouncementCreateDTO {
    if (this.formGroup.controls['assignedTo'].value === 'Workspace') {
      if (this.formGroup.controls['portalId'].value === 'all') {
        this.formGroup.controls['appId'].setValue(null)
      } else {
        this.formGroup.controls['appId'].setValue(this.formGroup.controls['portalId'].value)
      }
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
    this.assignedToOption = [
      { label: 'Workspace', value: 'Workspace' },
      { label: 'App', value: 'App' }
    ]
  }
}
