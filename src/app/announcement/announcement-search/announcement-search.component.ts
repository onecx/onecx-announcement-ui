import { Component, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { Observable, finalize, map } from 'rxjs'
import { Table } from 'primeng/table'
import { SelectItem } from 'primeng/api'

import { Action, Column, PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import {
  Announcement,
  AnnouncementInternalAPIService,
  SearchAnnouncementsRequestParams,
  AnnouncementSearchCriteria
} from 'src/app/shared/generated'
import { limitText } from 'src/app/shared/utils'

type ExtendedColumn = Column & {
  hasFilter?: boolean
  isDate?: boolean
  isDropdown?: true
  css?: string
  limit?: boolean
}
type ChangeMode = 'VIEW' | 'NEW' | 'EDIT'

@Component({
  selector: 'app-announcement-search',
  templateUrl: './announcement-search.component.html',
  styleUrls: ['./announcement-search.component.scss']
})
export class AnnouncementSearchComponent implements OnInit {
  @ViewChild('announcementTable', { static: false }) announcementTable: Table | undefined

  public changeMode: ChangeMode = 'NEW'
  public actions: Action[] = []
  public actions$: Observable<Action[]> | undefined
  public criteria: AnnouncementSearchCriteria = {}
  public announcement: Announcement | undefined
  public announcements: Announcement[] = []
  public displayDeleteDialog = false
  public displayDetailDialog = false
  public appsChanged = false
  public searching = false
  public loading = false
  public dateFormat: string
  public workspaces: SelectItem[] = []
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
      field: 'workspaceName',
      header: 'WORKSPACE',
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
      hasFilter: true,
      isDate: true
    },
    {
      field: 'endDate',
      header: 'END_DATE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center hidden sm:table-cell',
      hasFilter: true,
      isDate: true
    }
  ]

  constructor(
    private user: UserService,
    private announcementApi: AnnouncementInternalAPIService,
    private msgService: PortalMessageService,
    private translate: TranslateService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'M/d/yy, h:mm a'
  }

  ngOnInit(): void {
    this.prepareDialogTranslations()
    this.prepareActionButtons()
    this.search({ announcementSearchCriteria: {} })
    this.filteredColumns = this.columns.filter((a) => {
      return a.active === true
    })
  }

  private prepareDialogTranslations(): void {
    this.translate.get(['ANNOUNCEMENT.EVERY_WORKSPACE']).subscribe((data) => {
      this.getWorkspaces(data['ANNOUNCEMENT.EVERY_WORKSPACE'])
    })
  }

  private prepareActionButtons(): void {
    this.actions$ = this.translate.get(['ACTIONS.CREATE.LABEL', 'ACTIONS.CREATE.ANNOUNCEMENT.TOOLTIP']).pipe(
      map((data) => {
        return [
          {
            label: data['ACTIONS.CREATE.LABEL'],
            title: data['ACTIONS.CREATE.ANNOUNCEMENT.TOOLTIP'],
            actionCallback: () => this.onCreate(),
            icon: 'pi pi-plus',
            show: 'always',
            permission: 'ANNOUNCEMENT#EDIT'
          }
        ]
      })
    )
  }

  public onCloseDetail(refresh: boolean): void {
    this.displayDetailDialog = false
    if (refresh) this.search({ announcementSearchCriteria: {} }, true)
  }

  public onSearch(): void {
    this.changeMode = 'NEW'
    this.appsChanged = true
    this.search({ announcementSearchCriteria: {} }, true)
  }

  public reset(): void {
    this.criteria = {}
    this.announcements = []
  }

  public search(criteria: SearchAnnouncementsRequestParams, reuseCriteria: boolean = false): void {
    if (criteria.announcementSearchCriteria.workspaceName === 'all') {
      criteria.announcementSearchCriteria.workspaceName = undefined
    }
    if (!reuseCriteria) {
      if (criteria.announcementSearchCriteria.workspaceName === '')
        criteria.announcementSearchCriteria.workspaceName = undefined
      this.criteria = criteria.announcementSearchCriteria
    }
    this.searching = true
    this.announcementApi
      .searchAnnouncements(criteria)
      .pipe(finalize(() => (this.searching = false)))
      .subscribe({
        next: (data) => {
          this.announcements = data.stream || []
          if (this.announcements.length === 0) {
            this.msgService.info({ summaryKey: 'ACTIONS.SEARCH.NO_RESULTS' })
          }
        },
        error: () => this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.SEARCH_FAILED' })
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
  public onDetail(ev: MouseEvent, item: Announcement, mode: ChangeMode): void {
    ev.stopPropagation()
    this.changeMode = mode
    this.appsChanged = false
    this.announcement = item
    this.displayDetailDialog = true
  }
  public onCopy(ev: MouseEvent, item: Announcement) {
    ev.stopPropagation()
    this.changeMode = 'NEW'
    this.appsChanged = false
    this.announcement = item
    this.announcement.id = undefined
    this.displayDetailDialog = true
  }
  public onDelete(ev: MouseEvent, item: Announcement): void {
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
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
        },
        error: () => this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
      })
    }
  }

  private getWorkspaces(dropdownDefault?: string) {
    this.workspaces.push({
      label: dropdownDefault,
      value: 'all'
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

  // in list of workspaces?
  public isWorkspace(workspaceName?: string): boolean {
    if (workspaceName && this.workspaces.find(({ value }) => value === workspaceName)) {
      return true
    }
    return false
  }

  // if not in list of workspaces then get the suitable translation key
  public getTranslationKeyForNonExistingWorkspaces(workspaceName?: string): string {
    if (workspaceName && workspaceName?.length > 0) {
      return 'ANNOUNCEMENT.WORKSPACE_NOT_FOUND'
    }
    return 'ANNOUNCEMENT.EVERY_WORKSPACE'
  }
}
