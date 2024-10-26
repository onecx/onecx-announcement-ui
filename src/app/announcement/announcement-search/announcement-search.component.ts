import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { catchError, combineLatest, finalize, map, Observable, of } from 'rxjs'
import { Table } from 'primeng/table'
import { SelectItem } from 'primeng/api'

import { Action, Column, PortalMessageService, UserService } from '@onecx/portal-integration-angular'
import {
  Announcement,
  AnnouncementAssignments,
  AnnouncementPageResult,
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
  public announcements$: Observable<Announcement[]> | undefined
  public displayDeleteDialog = false
  public displayDetailDialog = false
  public appsChanged = false
  public searchInProgress = false
  public exceptionKey: string | undefined = undefined
  public dateFormat: string
  public usedWorkspaces$: Observable<SelectItem[]> | undefined
  public allWorkspaces: SelectItem[] = []
  public allWorkspaces$!: Observable<WorkspaceAbstract[]>

  public usedProducts$: Observable<SelectItem[]> | undefined
  public allProducts: SelectItem[] = []
  public allProducts$!: Observable<ProductsPageResult>
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
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'M/d/yy, h:mm a'
  }

  ngOnInit(): void {
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

  public onCloseDetail(refresh: boolean): void {
    this.displayDetailDialog = false
    if (refresh) {
      this.search({ announcementSearchCriteria: {} }, true)
      this.getUsedWorkspacesAndProducts()
    }
  }

  public onCriteriaReset(): void {
    this.criteria = {}
  }

  /****************************************************************************
   *  SEARCH announcements
   */
  public search(criteria: SearchAnnouncementsRequestParams, reuseCriteria = false): void {
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
    this.searchInProgress = true
    this.announcements$ = this.announcementApi.searchAnnouncements(criteria).pipe(
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.HELP_ITEM'
        console.error('searchHelps():', err)
        this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.MSG_SEARCH_FAILED' })
        return of({ stream: [] } as AnnouncementPageResult)
      }),
      map((data: AnnouncementPageResult) => data.stream ?? []),
      finalize(() => (this.searchInProgress = false))
    )
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
          //this.announcements = this.announcements.filter((a) => a.id !== this.announcement?.id)
          this.appsChanged = true
          this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
          if (workspaceUsed) this.getUsedWorkspacesAndProducts()
        },
        error: () => this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
      })
    }
  }

  // used in search criteria
  private getUsedWorkspacesAndProducts(): void {
    const announcementAssignments$ = this.announcementApi.getAllAnnouncementAssignments()

    this.usedWorkspaces$ = announcementAssignments$.pipe(
      catchError((err) => {
        console.error('getUsedWorkspacesAndProducts', err)
        return of([] as AnnouncementAssignments)
      }),
      map((data: AnnouncementAssignments) =>
        (data.workspaceNames || []).map(
          (name) =>
            ({
              label: this.getDisplayNameWorkspace(name),
              value: name
            }) as SelectItem
        )
      ),
      map((workspaces) => this.addAllToUsedWorkspaces(workspaces))
    )
    this.usedProducts$ = announcementAssignments$.pipe(
      catchError((err) => {
        console.error('getUsedWorkspacesAndProducts', err)
        return of([] as AnnouncementAssignments)
      }),
      map((data: AnnouncementAssignments) =>
        (data.productNames || []).map(
          (name) =>
            ({
              label: this.getDisplayNameProduct(name),
              value: name
            }) as SelectItem
        )
      ),
      map((products) => this.addAllToUsedProducts(products))
    )
  }
  private addAllToUsedWorkspaces(workspaces: SelectItem[]) {
    this.translate.get(['ANNOUNCEMENT.EVERY_WORKSPACE']).subscribe((data) => {
      workspaces.unshift({
        label: data['ANNOUNCEMENT.EVERY_WORKSPACE'],
        value: 'all'
      })
    })
    return workspaces
  }
  private addAllToUsedProducts(products: SelectItem[]) {
    this.translate.get(['ANNOUNCEMENT.EVERY_PRODUCT']).subscribe((data) => {
      products.unshift({
        label: data['ANNOUNCEMENT.EVERY_PRODUCT'],
        value: 'all'
      })
    })
    return products
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
    return workspaceName && workspaceName?.length > 0
      ? 'ANNOUNCEMENT.WORKSPACE_NOT_FOUND'
      : 'ANNOUNCEMENT.EVERY_WORKSPACE'
  }

  private addAllProducts() {
    this.translate.get(['ANNOUNCEMENT.EVERY_PRODUCT']).subscribe((data) => {
      this.allProducts.unshift({
        label: data['ANNOUNCEMENT.EVERY_PRODUCT'],
        value: 'all'
      })
    })
  }
  private addAllWorkspaces() {
    this.translate.get(['ANNOUNCEMENT.EVERY_WORKSPACE']).subscribe((data) => {
      this.allWorkspaces.unshift({
        label: data['ANNOUNCEMENT.EVERY_WORKSPACE'],
        value: 'all'
      })
    })
  }

  /****************************************************************************
   *  SEARCHING of META DATA
   *     used to display readable names in drop down lists and result set
   */

  // declare search for ALL products
  private searchProducts(): Observable<SelectItem[]> {
    this.allProducts$ = this.announcementApi.getAllProductNames({ productsSearchCriteria: {} }).pipe(
      catchError((err) => {
        console.error('getAllProductNames():', err)
        return of([] as ProductsPageResult)
      })
    )
    return this.allProducts$.pipe(
      map((data: ProductsPageResult) => {
        const si: SelectItem[] = []
        if (data.stream) {
          for (const product of data.stream) {
            si.push({ label: product.displayName, value: product.name })
          }
          si.sort(dropDownSortItemsByLabel)
        }
        return si
      })
    )
  }

  // declare search for ALL workspaces
  private searchWorkspaces(): Observable<SelectItem[]> {
    this.allWorkspaces$ = this.announcementApi.getAllWorkspaceNames().pipe(
      catchError((err) => {
        console.error('getAllWorkspaceNames():', err)
        return of([] as WorkspaceAbstract[])
      })
    )
    return this.allWorkspaces$.pipe(
      map((workspaces: WorkspaceAbstract[]) => {
        const si: SelectItem[] = []
        for (const workspace of workspaces) {
          if (workspace.displayName) si.push({ label: workspace.displayName, value: workspace.name })
        }
        si.sort(dropDownSortItemsByLabel)
        return si
      })
    )
  }

  // Loading everything - triggered from HTML
  private loadAllData(): void {
    this.allMetaData$ = combineLatest([this.searchWorkspaces(), this.searchProducts()]).pipe(
      map(([w, p]: [SelectItem[], SelectItem[]]) => {
        this.allWorkspaces = w
        this.allProducts = p
        this.addAllProducts()
        this.addAllWorkspaces()
        this.getUsedWorkspacesAndProducts()
        this.search({ announcementSearchCriteria: {} })
        return 'ok'
      })
    )
  }
}
