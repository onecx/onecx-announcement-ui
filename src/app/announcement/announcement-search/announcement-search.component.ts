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
  public usedWorkspaces: SelectItem[] = []
  public allWorkspaces: string[] = []
  public usedProducts: SelectItem[] = []
  public allProducts: string[] = []
  public nonExistingWorkspaceIds = ['all', 'All Workspaces', 'Alle Workspaces']
  public nonExistingApplicationIds = ['all', 'All Applications', 'Alle Applikationen']
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
      field: 'productName',
      header: 'APPLICATION',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'hidden sm:table-cell'
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
    this.getUsedWorkspaces()
    this.getAllWorkspaces()
    this.getUsedProducts()
    this.getAllProducts()
    this.prepareActionButtons()
    this.search({ announcementSearchCriteria: {} })
    this.filteredColumns = this.columns.filter((a) => {
      return a.active === true
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

  public onCloseDetail(refresh: any): void {
    this.displayDetailDialog = false
    if (refresh) {
      this.search({ announcementSearchCriteria: {} }, true)
      this.getUsedWorkspaces()
      this.getUsedProducts()
    }
  }

  public reset(): void {
    this.criteria = {}
    this.announcements = []
  }

  public search(criteria: SearchAnnouncementsRequestParams, reuseCriteria: boolean = false): void {
    if (criteria.announcementSearchCriteria.workspaceName === 'all') {
      criteria.announcementSearchCriteria.workspaceName = undefined
    }
    if (criteria.announcementSearchCriteria.productName === 'all') {
      criteria.announcementSearchCriteria.productName = undefined
    }
    if (!reuseCriteria) {
      if (criteria.announcementSearchCriteria.workspaceName === '')
        criteria.announcementSearchCriteria.workspaceName = undefined
      if (criteria.announcementSearchCriteria.productName === '')
        criteria.announcementSearchCriteria.productName = undefined
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
        error: (err) =>
          this.msgService.error({
            summaryKey: 'ACTIONS.SEARCH.SEARCH_FAILED',
            detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENTS'
          })
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
      const workspaceUsed = this.announcement?.workspaceName !== undefined
      this.announcementApi.deleteAnnouncementById({ id: this.announcement?.id }).subscribe({
        next: () => {
          this.displayDeleteDialog = false
          this.announcements = this.announcements.filter((a) => a.id !== this.announcement?.id)
          this.announcement = undefined
          this.appsChanged = true
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
          if (workspaceUsed) this.getUsedWorkspaces()
        },
        error: () => this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
      })
    }
  }

  // used in search criteria
  private getUsedWorkspaces(): void {
    this.usedWorkspaces = []
    this.translate.get(['ANNOUNCEMENT.EVERY_WORKSPACE']).subscribe((data) => {
      this.usedWorkspaces.push({
        label: data['ANNOUNCEMENT.EVERY_WORKSPACE'],
        value: 'all'
      })
      this.announcementApi.getAllProductsWithAnnouncements().subscribe({
        next: (data) => {
          if (data.workspaceNames)
            for (let workspace of data.workspaceNames) {
              if (!this.nonExistingWorkspaceIds.includes(workspace)) {
                this.usedWorkspaces.push({ label: workspace, value: workspace })
              }
            }
        },
        error: (err) =>
          this.msgService.error({
            summaryKey: 'GENERAL.WORKSPACES.NOT_FOUND',
            detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.WORKSPACES'
          })
      })
    })
  }

  // used in search results
  private getAllWorkspaces() {
    this.allWorkspaces = []
    this.translate.get(['ANNOUNCEMENT.EVERY_WORKSPACE']).subscribe((data) => {
      this.allWorkspaces.push(data['ANNOUNCEMENT.EVERY_WORKSPACE'])
      this.announcementApi.getAllWorkspaceNames().subscribe({
        next: (workspaces) => {
          for (let workspace of workspaces) {
            if (workspace.displayName) this.allWorkspaces.push(workspace.displayName)
          }
        },
        error: (err) =>
          this.msgService.error({
            summaryKey: 'GENERAL.WORKSPACES.NOT_FOUND',
            detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.WORKSPACES'
          })
      })
    })
  }

  // workspace in list of all workspaces?
  public isWorkspace(workspaceName?: string): boolean {
    if (workspaceName && this.allWorkspaces.includes(workspaceName)) {
      return true
    }
    return false
  }

  // if not in list of all workspaces then get the suitable translation key
  public getTranslationKeyForNonExistingWorkspaces(workspaceName?: string): string {
    if (workspaceName && workspaceName?.length > 0) {
      return 'ANNOUNCEMENT.WORKSPACE_NOT_FOUND'
    }
    return 'ANNOUNCEMENT.EVERY_WORKSPACE'
  }

  // used in search criteria
  private getUsedProducts(): void {
    this.usedProducts = []
    this.translate.get(['ANNOUNCEMENT.EVERY_PRODUCT']).subscribe((data) => {
      this.usedProducts.push({
        label: data['ANNOUNCEMENT.EVERY_PRODUCT'],
        value: 'all'
      })
      this.announcementApi.getAllProductsWithAnnouncements().subscribe({
        next: (data) => {
          if (data?.productNames) {
            for (let product of data.productNames) {
              if (!this.nonExistingApplicationIds.includes(product)) {
                this.usedProducts.push({ label: product, value: product })
              }
            }
          }
        },
        error: (err) =>
          this.msgService.error({
            summaryKey: 'GENERAL.PRODUCTS.NOT_FOUND',
            detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          })
      })
    })
  }

  // used in search results
  private getAllProducts() {
    this.allProducts = []
    this.translate.get(['ANNOUNCEMENT.EVERY_PRODUCT']).subscribe((data) => {
      this.allProducts.push(data['ANNOUNCEMENT.EVERY_PRODUCT'])
      this.announcementApi.searchProductsByCriteria({ productsSearchCriteria: {} }).subscribe({
        next: (data) => {
          if (data.stream) {
            for (let product of data.stream) {
              this.allProducts.push(product.displayName)
            }
          }
        },
        error: (err) =>
          this.msgService.error({
            summaryKey: 'GENERAL.PRODUCTS.NOT_FOUND',
            detailKey: 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.PRODUCTS'
          })
      })
    })
  }
}
