import { Component, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { catchError, combineLatest, finalize, map, Observable, of } from 'rxjs'
import { Table } from 'primeng/table'
import { SelectItem } from 'primeng/api'

import { Action, Column, PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import {
  Announcement,
  AnnouncementAssignments,
  AnnouncementInternalAPIService,
  AnnouncementSearchCriteria,
  SearchAnnouncementsRequestParams,
  WorkspaceAbstract,
  ProductsPageResult
} from 'src/app/shared/generated'
import { limitText, dropDownSortItemsByLabel } from 'src/app/shared/utils'

type ExtendedColumn = Column & {
  hasFilter?: boolean
  isDate?: boolean
  isDropdown?: true
  css?: string
  limit?: boolean
  needsDisplayName?: boolean
}
type ChangeMode = 'VIEW' | 'CREATE' | 'EDIT'
type allCriteriaLists = { products: SelectItem[]; workspaces: SelectItem[] }

@Component({
  selector: 'app-announcement-search',
  templateUrl: './announcement-search.component.html',
  styleUrls: ['./announcement-search.component.scss']
})
export class AnnouncementSearchComponent implements OnInit {
  @ViewChild('announcementTable', { static: false }) announcementTable: Table | undefined

  public loading = false
  public exceptionKey: string | undefined = undefined
  public actions$: Observable<Action[]> | undefined
  public criteria: AnnouncementSearchCriteria = {}
  public announcement: Announcement | undefined
  public announcements$: Observable<Announcement[]> | undefined
  public displayDeleteDialog = false
  public displayDetailDialog = false
  public changeMode: ChangeMode = 'CREATE'
  public dateFormat: string
  public allCriteriaLists$: Observable<allCriteriaLists> | undefined
  public usedWorkspaces$: Observable<SelectItem[]> | undefined
  public allWorkspaces: SelectItem[] = []
  public allWorkspaces$!: Observable<SelectItem[]>
  public allItem: SelectItem | undefined

  public usedProducts$: Observable<SelectItem[]> | undefined
  public allProducts: SelectItem[] = []
  public allProducts$!: Observable<SelectItem[]>
  public allMetaData$!: Observable<string>
  public filteredColumns: Column[] = []
  public limitText = limitText

  public columns: ExtendedColumn[] = [
    {
      field: 'status',
      header: 'STATUS',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center'
    },
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
      css: 'text-center hidden xl:table-cell',
      needsDisplayName: true
    },
    {
      field: 'productName',
      header: 'APPLICATION',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center hidden lg:table-cell',
      needsDisplayName: true
    },
    {
      field: 'type',
      header: 'TYPE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center hidden xl:table-cell'
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
      hasFilter: false,
      isDate: true
    },
    {
      field: 'endDate',
      header: 'END_DATE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center hidden md:table-cell',
      hasFilter: false,
      isDate: true
    }
  ]

  constructor(
    private readonly user: UserService,
    private readonly announcementApi: AnnouncementInternalAPIService,
    private readonly msgService: PortalMessageService,
    private readonly translate: TranslateService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'M/d/yy, h:mm a'
  }

  ngOnInit(): void {
    this.searchProducts()
    this.searchWorkspaces()
    this.loadAllData()
    this.prepareActionButtons()
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

  /****************************************************************************
   *  SEARCH announcements
   */
  public onSearch(criteria: SearchAnnouncementsRequestParams, reuseCriteria = false): void {
    if (!reuseCriteria) {
      if (criteria.announcementSearchCriteria.workspaceName === '')
        criteria.announcementSearchCriteria.workspaceName = undefined
      if (criteria.announcementSearchCriteria.productName === '')
        criteria.announcementSearchCriteria.productName = undefined
      this.criteria = criteria.announcementSearchCriteria
    }
    this.loading = true
    this.announcements$ = this.announcementApi.searchAnnouncements(criteria).pipe(
      map((data) => data.stream ?? []),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENTS'
        this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.MSG_SEARCH_FAILED' })
        console.error('searchAnnouncements', err)
        return of([] as Announcement[])
      }),
      finalize(() => (this.loading = false))
    )
  }

  public onCriteriaReset(): void {
    this.criteria = {}
  }

  public onColumnsChange(activeIds: string[]) {
    this.filteredColumns = activeIds.map((id) => this.columns.find((col) => col.field === id)) as Column[]
  }
  public onFilterChange(event: string): void {
    this.announcementTable?.filterGlobal(event, 'contains')
  }

  /****************************************************************************
   *  CHANGES
   */
  public onCloseDetail(refresh: boolean): void {
    this.displayDetailDialog = false
    this.displayDeleteDialog = false
    this.announcement = undefined
    if (refresh) {
      this.getUsedWorkspacesAndProducts()
      this.onSearch({ announcementSearchCriteria: {} }, true)
    }
  }

  public onCreate() {
    this.changeMode = 'CREATE'
    this.announcement = undefined
    this.displayDetailDialog = true
  }
  public onDetail(ev: MouseEvent, item: Announcement, mode: ChangeMode): void {
    ev.stopPropagation()
    this.changeMode = mode
    this.announcement = item
    this.displayDetailDialog = true
  }
  public onCopy(ev: MouseEvent, item: Announcement) {
    ev.stopPropagation()
    this.changeMode = 'CREATE'
    this.announcement = item
    this.announcement.id = undefined
    this.displayDetailDialog = true
  }

  public onDelete(ev: MouseEvent, item: Announcement): void {
    ev.stopPropagation()
    this.announcement = item
    this.displayDeleteDialog = true
  }
  public onDeleteConfirmation(): void {
    if (this.announcement?.id) {
      //const workspaceUsed = this.announcement?.workspaceName !== undefined
      this.announcementApi.deleteAnnouncementById({ id: this.announcement?.id }).subscribe({
        next: () => {
          this.onCloseDetail(true)
          //this.announcementTable?._value = this.announcementTable?._value.filter((a) => a.id !== this.announcement?.id)
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
        },
        error: (err) => {
          console.error('deleteAnnouncementById', err)
          this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
        }
      })
    }
  }

  // Prepare drop down list content used in search criteria
  private getUsedWorkspacesAndProducts(): void {
    const acl: allCriteriaLists = { products: [], workspaces: [] }
    this.allCriteriaLists$ = this.announcementApi.getAllAnnouncementAssignments().pipe(
      map((data: AnnouncementAssignments) => {
        if (data.workspaceNames)
          acl.workspaces = data.workspaceNames.map(
            (name) =>
              ({
                label: this.getDisplayNameWorkspace(name),
                value: name
              }) as SelectItem
          )
        if (data.productNames)
          acl.products = data.productNames.map(
            (name) =>
              ({
                label: this.getDisplayNameProduct(name),
                value: name
              }) as SelectItem
          )
        return acl
      }),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ASSIGNMENTS'
        console.error('getAllAnnouncementAssignments', err)
        return of(acl)
      })
    )
  }

  // workspace in list of all workspaces?
  public isWorkspace(workspaceName?: string): boolean {
    return this.allWorkspaces.find((item) => item.value === workspaceName) !== undefined
  }

  public getDisplayNameWorkspace(name?: string): string | undefined {
    return this.allWorkspaces.find((item) => item.value === name)?.label ?? name
  }

  public getDisplayNameProduct(name?: string): string | undefined {
    return this.allProducts.find((item) => item.value === name)?.label ?? name
  }

  // if not in list of all workspaces then get the suitable translation key
  public getTranslationKeyForNonExistingWorkspaces(workspaceName?: string): string {
    return workspaceName && workspaceName?.length > 0 ? 'ANNOUNCEMENT.WORKSPACE_NOT_FOUND' : 'ANNOUNCEMENT.ALL'
  }

  /****************************************************************************
   *  SEARCHING of META DATA
   *     used to display readable names in drop down lists and result set
   */

  // declare search for ALL products
  private searchProducts(): void {
    this.allProducts$ = this.announcementApi.getAllProductNames({ productsSearchCriteria: {} }).pipe(
      map((data: ProductsPageResult) => {
        const si: SelectItem[] = []
        if (data.stream) {
          for (const product of data.stream) {
            si.push({ label: product.displayName, value: product.name })
          }
          si.sort(dropDownSortItemsByLabel)
        }
        return si
      }),
      catchError((err) => {
        console.error('getAllProductNames', err)
        return of([] as SelectItem[])
      })
    )
  }

  // declare search for ALL workspaces
  private searchWorkspaces(): void {
    this.allWorkspaces$ = this.announcementApi.getAllWorkspaceNames().pipe(
      map((workspaces: WorkspaceAbstract[]) => {
        const si: SelectItem[] = []
        for (const workspace of workspaces) {
          if (workspace.displayName) si.push({ label: workspace.displayName, value: workspace.name })
        }
        si.sort(dropDownSortItemsByLabel)
        return si
      }),
      catchError((err) => {
        console.error('getAllWorkspaceNames', err)
        return of([] as SelectItem[])
      })
    )
  }

  // Loading everything - triggered from HTML
  private loadAllData(): void {
    this.allMetaData$ = combineLatest([this.allWorkspaces$, this.allProducts$]).pipe(
      map(([w, p]: [SelectItem[], SelectItem[]]) => {
        this.allWorkspaces = w
        this.allProducts = p
        this.getUsedWorkspacesAndProducts()
        this.onSearch({ announcementSearchCriteria: {} })
        return 'ok'
      })
    )
  }
}
