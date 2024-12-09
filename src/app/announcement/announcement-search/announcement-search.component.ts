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

export type ChangeMode = 'VIEW' | 'COPY' | 'CREATE' | 'EDIT'
type ExtendedColumn = Column & {
  hasFilter?: boolean
  isDate?: boolean
  isDropdown?: true
  css?: string
  limit?: boolean
  needsDisplayName?: boolean
}
type AllMetaData = {
  allProducts: SelectItem[]
  allWorkspaces: SelectItem[]
  usedProducts?: SelectItem[]
  usedWorkspaces?: SelectItem[]
}
type AllUsedLists = { products: SelectItem[]; workspaces: SelectItem[] }

@Component({
  selector: 'app-announcement-search',
  templateUrl: './announcement-search.component.html',
  styleUrls: ['./announcement-search.component.scss']
})
export class AnnouncementSearchComponent implements OnInit {
  @ViewChild('announcementTable', { static: false }) announcementTable: Table | undefined

  public loading = false
  public searching = false
  public exceptionKey: string | undefined = undefined
  public changeMode: ChangeMode = 'CREATE'
  public dateFormat: string
  public actions$: Observable<Action[]> | undefined
  public criteria: AnnouncementSearchCriteria = {}
  public announcement: Announcement | undefined
  public announcements$: Observable<Announcement[]> | undefined
  public displayDeleteDialog = false
  public displayDetailDialog = false
  public filteredColumns: Column[] = []
  public limitText = limitText

  public allMetaData$!: Observable<AllMetaData> // collection of data used in UI
  public allWorkspaces$!: Observable<SelectItem[]> // getting data from bff endpoint
  public allProducts$!: Observable<SelectItem[]> // getting data from bff endpoint
  public allUsedLists$!: Observable<AllUsedLists> // getting data from bff endpoint

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
      css: 'text-center',
      needsDisplayName: true
    },
    {
      field: 'productName',
      header: 'PRODUCT_NAME',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center',
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
      css: 'text-center',
      hasFilter: false,
      isDate: true
    },
    {
      field: 'endDate',
      header: 'END_DATE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center',
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
    this.loading = true
    this.prepareDataLoad()
    this.loadData()
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
    this.searching = true
    this.exceptionKey = undefined
    this.announcements$ = this.announcementApi.searchAnnouncements(criteria).pipe(
      map((data) => data.stream ?? []),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENTS'
        this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.MSG_SEARCH_FAILED' })
        console.error('searchAnnouncements', err)
        return of([] as Announcement[])
      }),
      finalize(() => (this.searching = false))
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
      //this.getUsedWorkspacesAndProducts()
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
    this.changeMode = mode === 'COPY' ? 'CREATE' : mode
    this.announcement = { ...item, id: ['COPY', 'CREATE'].includes(mode) ? undefined : item.id }
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

  // workspace in list of all workspaces?
  public isWorkspace(workspaceName: string | undefined, allWorkspaces: SelectItem[]): boolean {
    return allWorkspaces.find((item) => item.value === workspaceName) !== undefined
  }

  public getDisplayNameWorkspace(name: string | undefined, allWorkspaces: SelectItem[]): string | undefined {
    return allWorkspaces.find((item) => item.value === name)?.label ?? name
  }

  public getDisplayNameProduct(name: string | undefined, allProducts: SelectItem[]): string | undefined {
    return allProducts.find((item) => item.value === name)?.label ?? name
  }

  // if not in list of all workspaces then get the suitable translation key
  public getTranslationKeyForNonExistingWorkspaces(workspaceName?: string): string {
    return workspaceName && workspaceName?.length > 0 ? 'ANNOUNCEMENT.WORKSPACE_NOT_FOUND' : 'ANNOUNCEMENT.ALL'
  }

  /****************************************************************************
   *  SEARCHING of META DATA
   *     used to display readable names in drop down lists and result set
   */
  private prepareDataLoad(): void {
    // declare search for ALL products privided by bff
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
    // declare search for ALL workspaces provided by bff
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
    // declare search for used products/workspaces (used === assigned to announcement)
    // hereby SelectItem[] are prepared but with a temporary label (=> displayName)
    this.allUsedLists$ = this.announcementApi.getAllAnnouncementAssignments().pipe(
      map((data: AnnouncementAssignments) => {
        const ul: AllUsedLists = { products: [], workspaces: [] }
        if (data.productNames)
          ul.products = data.productNames.map((name) => ({ label: name, value: name }) as SelectItem)
        if (data.workspaceNames)
          ul.workspaces = data.workspaceNames.map((name) => ({ label: name, value: name }) as SelectItem)
        return ul
      }),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ASSIGNMENTS'
        console.error('getAllAnnouncementAssignments', err)
        return of({ products: [], workspaces: [] } as AllUsedLists)
      })
    )
  }

  private loadData(): void {
    const allDataLists$ = combineLatest([this.allWorkspaces$, this.allProducts$])
    this.allMetaData$ = combineLatest([allDataLists$, this.allUsedLists$]).pipe(
      map(([[aW, aP], aul]: [[SelectItem[], SelectItem[]], AllUsedLists]) => {
        // enrich the temporary prepared lists with display names contained in allLists
        aul.products.forEach((p) => {
          p.label = this.getDisplayNameProduct(p.value, aP)
        })
        aul.workspaces.forEach((w) => {
          w.label = this.getDisplayNameWorkspace(w.value, aW)
        })
        this.loading = false
        this.onSearch({ announcementSearchCriteria: {} })
        return { allProducts: aP, allWorkspaces: aW, usedProducts: aul.products, usedWorkspaces: aul.workspaces }
      })
    )
  }
}
