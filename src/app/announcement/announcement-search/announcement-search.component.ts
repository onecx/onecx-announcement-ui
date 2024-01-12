import { Component, OnInit, ViewChild } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslateService } from '@ngx-translate/core'
import { finalize } from 'rxjs'
import { Table } from 'primeng/table'
import { SelectItem } from 'primeng/api'

import {
  AnnouncementListItemDTO,
  AnnouncementInternalAPIService,
  GetAnnouncementsRequestParams,
  GetAnnouncementsByCriteriaV1RequestParams
} from '../../generated'
import { Action, Column, ConfigurationService, PortalMessageService } from '@onecx/portal-integration-angular'
import { PortalService } from '../../services/portalService'
import { limitText } from '../../shared/utils'

type ExtendedColumn = Column & { isDate?: boolean; isDropdown?: true; css?: string; limit?: boolean }
type ChangeMode = 'VIEW' | 'NEW' | 'EDIT'

@Component({
  selector: 'am-announcement-search',
  templateUrl: './announcement-search.component.html',
  styleUrls: ['./announcement-search.component.scss']
})
export class AnnouncementSearchComponent implements OnInit {
  @ViewChild('announcementTable', { static: false }) announcementTable: Table | undefined

  public changeMode: ChangeMode = 'NEW'
  public actions: Action[] = []
  public criteria: GetAnnouncementsByCriteriaV1RequestParams = {}
  public announcement: AnnouncementListItemDTO | undefined
  public announcements: AnnouncementListItemDTO[] = []
  public displayDeleteDialog = false
  public displayDetailDialog = false
  public appsChanged = false
  public searching = false
  public loading = false
  public dateFormat: string
  public availablePortals: SelectItem[] = []
  public nonExistingPortalIds = ['all', 'ANNOUNCEMENT.EVERY_WORKSPACE', 'ANNOUNCEMENT.WORKSPACE_NOT_FOUND']
  public filteredColumns: Column[] = []

  public limitText = limitText

  public columns: ExtendedColumn[] = [
    {
      field: 'title',
      header: 'TITLE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      limit: true
    },
    {
      field: 'appId',
      header: 'ASSIGNED_TO',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center hidden xl:table-cell'
    },
    {
      field: 'type',
      header: 'TYPE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center hidden xl:table-cell',
      isDropdown: true
    },
    {
      field: 'status',
      header: 'STATUS',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center hidden lg:table-cell',
      isDropdown: true
    },
    {
      field: 'priority',
      header: 'PRIORITY',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center hidden lg:table-cell',
      isDropdown: true
    },
    {
      field: 'startDate',
      header: 'START_DATE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center hidden sm:table-cell',
      isDate: true
    },
    {
      field: 'endDate',
      header: 'END_DATE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center hidden sm:table-cell',
      isDate: true
    }
  ]

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private portalApi: PortalService,
    private announcementApi: AnnouncementInternalAPIService,
    private config: ConfigurationService,
    private msgService: PortalMessageService,
    private translate: TranslateService
  ) {
    this.dateFormat = this.config.lang === 'de' ? 'dd.MM.yyyy HH:mm' : 'short'
  }

  ngOnInit(): void {
    this.search({})
    this.filteredColumns = this.columns.filter((a) => {
      return a.active === true
    })
    this.translate
      .get(['ACTIONS.CREATE.LABEL', 'ACTIONS.CREATE.ANNOUNCEMENT.TOOLTIP', 'ANNOUNCEMENT.EVERY_WORKSPACE'])
      .subscribe((data) => {
        this.actions.push({
          label: data['ACTIONS.CREATE.LABEL'],
          title: data['ACTIONS.CREATE.ANNOUNCEMENT.TOOLTIP'],
          actionCallback: () => this.onCreate(),
          icon: 'pi pi-plus',
          show: 'always',
          permission: 'ANNOUNCEMENT#EDIT'
        })
        this.getAvailabePortals(data['ANNOUNCEMENT.EVERY_WORKSPACE'])
      })
  }

  public onCloseDetail(refresh: boolean): void {
    this.displayDetailDialog = false
    if (refresh) this.search({}, true)
  }

  public onSearch(): void {
    this.changeMode = 'NEW'
    this.appsChanged = true
    this.search({}, true)
  }

  public search(criteria: GetAnnouncementsRequestParams, reuseCriteria: boolean = false): void {
    if (!reuseCriteria) {
      if (criteria.appId === '') criteria.appId = undefined
      this.criteria = criteria
    }
    this.searching = true
    this.announcementApi
      .getAnnouncements(criteria)
      .pipe(finalize(() => (this.searching = false)))
      .subscribe({
        next: (data) => {
          this.announcements = data
          if (this.announcements.length === 0) {
            this.msgService.info({ summaryKey: 'GENERAL.SEARCH.MSG_NO_RESULTS' })
          }
        },
        error: () => this.msgService.error({ summaryKey: 'GENERAL.SEARCH.MSG_SEARCH_FAILED' })
      })
  }

  onColumnsChange(activeIds: string[]) {
    this.filteredColumns = activeIds.map((id) => this.columns.find((col) => col.field === id)) as Column[]
  }
  onFilterChange(event: string): void {
    this.announcementTable?.filterGlobal(event, 'contains')
  }

  /****************************************************************************
   *  CHANGES
   */
  public onCreate() {
    this.changeMode = 'NEW'
    this.appsChanged = false
    this.announcement = undefined
    this.displayDetailDialog = true
  }
  public onDetail(ev: MouseEvent, item: AnnouncementListItemDTO, mode: ChangeMode): void {
    ev.stopPropagation()
    this.changeMode = mode
    this.appsChanged = false
    this.announcement = item
    this.displayDetailDialog = true
  }
  public onCopy(ev: MouseEvent, item: AnnouncementListItemDTO) {
    ev.stopPropagation()
    this.changeMode = 'NEW'
    this.appsChanged = false
    this.announcement = item
    this.announcement.id = undefined
    this.displayDetailDialog = true
  }
  public onDelete(ev: MouseEvent, item: AnnouncementListItemDTO): void {
    ev.stopPropagation()
    this.announcement = item
    this.appsChanged = false
    this.displayDeleteDialog = true
  }
  public onDeleteConfirmation(): void {
    if (this.announcement?.id) {
      this.announcementApi.deleteAnnouncementById({ id: this.announcement?.id }).subscribe({
        next: () => {
          this.displayDeleteDialog = false
          this.announcements = this.announcements.filter((a) => a.id !== this.announcement?.id)
          this.announcement = undefined
          this.appsChanged = true
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.ANNOUNCEMENT_OK' })
        },
        error: () => this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE.ANNOUNCEMENT_NOK' })
      })
    }
  }

  // get available portals
  private getAvailabePortals(dropdownDefault?: string) {
    this.availablePortals.push({
      label: dropdownDefault,
      value: 'all'
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

  // is app in list of available portals?
  public isPortal(appId?: string) {
    return appId && this.availablePortals.find(({ value }) => value === appId)?.label ? true : false
  }

  // if not in list of available portals then get the suitable translation key
  public getAppIdTranslationKey(appId?: string): string {
    if (!appId || appId === 'all') {
      return 'ANNOUNCEMENT.EVERY_WORKSPACE'
    }
    // if appId has UUID structure, but is not in the available-portals List
    else if (/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi.test(appId)) {
      return 'ANNOUNCEMENT.WORKSPACE_NOT_FOUND'
    }
    return ''
  }

  public getAppName(appId?: string): string {
    return this.availablePortals.find(({ value }) => value === appId)?.label || ''
  }
}
