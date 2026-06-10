import { Component, DestroyRef, EventEmitter, inject, OnInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { TranslateService } from '@ngx-translate/core'
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  finalize,
  map,
  Observable,
  of,
  Subscription,
  switchMap
} from 'rxjs'
import { SelectItem } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import {
  Action,
  AngularAcceleratorModule,
  ColumnType,
  DataAction,
  DataSortDirection,
  DataTableColumn,
  RowListGridData
} from '@onecx/angular-accelerator'
import { PortalPageComponent } from '@onecx/angular-utils'
import { SlotService } from '@onecx/angular-remote-components'

import {
  Announcement,
  AnnouncementAssignments,
  AnnouncementInternalAPIService,
  AnnouncementSearchCriteria
} from 'src/app/shared/generated'
import { SharedModule } from 'src/app/shared/shared.module'
import { Utils } from 'src/app/shared/utils'
import { AnnouncementDetailComponent } from '../announcement-detail/announcement-detail.component'
import { AnnouncementDeleteComponent } from '../announcement-delete/announcement-delete.component'
import { AnnouncementCriteriaComponent } from './announcement-criteria/announcement-criteria.component'

export type ChangeMode = 'VIEW' | 'COPY' | 'CREATE' | 'EDIT'
type Column = {
  field: string
  header: string
  active?: boolean
  translationPrefix?: string
}
type ExtendedColumn = Column & {
  hasFilter?: boolean
  isDate?: boolean
  isDropdown?: boolean
  limit?: boolean
  cssHeader?: string
  cssBody?: string
}
type AllMetaData = {
  allProducts: SelectItem[]
  allWorkspaces: SelectItem[]
  usedProducts?: SelectItem[]
  usedWorkspaces?: SelectItem[]
}
type AllUsedLists = { products: SelectItem[]; workspaces: SelectItem[] }

export type Product = {
  id?: string
  name: string
  version?: string
  description?: string
  imageUrl?: string
  displayName?: string
  classifications?: Array<string>
  undeployed?: boolean
  provider?: string
  applications?: Array<any>
}
export type Workspace = {
  name: string
  displayName: string
  description?: string
  theme?: string
  homePage?: string
  baseUrl?: string
  companyName?: string
  phoneNumber?: string
  rssFeedUrl?: string
  footerLabel?: string
  logoUrl?: string
  mandatory?: boolean
  operator?: boolean
  disabled?: boolean
}

@Component({
  selector: 'app-announcement-search',
  templateUrl: './announcement-search.component.html',
  styleUrls: ['./announcement-search.component.scss'],
  standalone: true,
  imports: [
    SharedModule,
    AngularAcceleratorModule,
    PortalPageComponent,
    AnnouncementCriteriaComponent,
    AnnouncementDetailComponent,
    AnnouncementDeleteComponent
  ]
})
export class AnnouncementSearchComponent implements OnInit {
  // dialog
  public searching = false
  public exceptionKey: string | undefined = undefined
  public loadingMetaData = false
  public changeMode: ChangeMode = 'VIEW'
  public datetimeFormat: string = 'M/d/yy, h:mm a'
  public actions$: Observable<Action[]> | undefined
  public criteria: AnnouncementSearchCriteria = {}
  public displayDetailDialog = false
  public displayDeleteDialog = false
  public displayedColumnKeys: string[] = []
  public sortField = 'startDate'
  public sortDirection = DataSortDirection.DESCENDING
  public globalFilterValue = ''
  public interactiveColumns: DataTableColumn[] = []
  public interactiveAdditionalActions: DataAction[] = [
    {
      id: 'copy',
      labelKey: 'ACTIONS.COPY.LABEL',
      icon: 'pi pi-copy',
      permission: 'ANNOUNCEMENT#CREATE',
      classes: ['copy-action-button'],
      callback: (item: RowListGridData) => this.onCopyFromInteractive(item)
    }
  ]
  public getDisplayName = Utils.getDisplayName

  // data
  private readonly destroyRef = inject(DestroyRef)
  private readonly dataSubject$ = new BehaviorSubject<RowListGridData[] | null>(null)
  public data$: Observable<RowListGridData[] | null> = this.dataSubject$.asObservable()
  private searchSubscription?: Subscription // to cancel ongoing search if new search is triggered
  public filteredData: RowListGridData[] | undefined = undefined
  public metaData$!: Observable<AllMetaData> // collection of data used in UI
  public usedLists$!: Observable<AllUsedLists> // getting data from bff endpoint
  public usedListsTrigger$ = new BehaviorSubject<void>(undefined) // trigger for refresh data
  public item4Detail: Announcement | undefined // used on detail
  public item4Delete: Announcement | undefined // used on deletion

  // slot configurations
  public pdSlotName = 'onecx-product-data'
  public pdSlotEmitter = new EventEmitter<Product[]>()
  public pdIsComponentDefined$: Observable<boolean> | undefined // check
  public productData$ = new BehaviorSubject<Product[] | undefined>(undefined) // product data
  public wdSlotName = 'onecx-workspace-data'
  public wdSlotEmitter = new EventEmitter<Workspace[]>()
  public wdIsComponentDefined$: Observable<boolean> | undefined // check
  public workspaceData$ = new BehaviorSubject<Workspace[] | undefined>(undefined) // workspace data

  public columns: ExtendedColumn[] = [
    {
      field: 'status',
      header: 'STATUS',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      cssHeader: 'flex flex-row flex-nowrap align-items-center column-gap-2 text-center p-2',
      cssBody: 'text-center p-2'
    },
    {
      field: 'type',
      header: 'TYPE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      cssHeader: 'flex flex-row flex-nowrap align-items-center column-gap-2 text-center p-2',
      cssBody: 'text-xl text-center p-2'
    },
    {
      field: 'title',
      header: 'TITLE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      cssHeader: 'flex flex-row flex-nowrap align-items-center column-gap-2 p-2',
      cssBody: 'py-0 px-2 sm:px-3',
      limit: true
    },
    {
      field: 'workspaceName',
      header: 'WORKSPACE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      cssHeader: 'hidden md:flex flex-row flex-nowrap align-items-center column-gap-2 p-0 md:p-2',
      cssBody: 'hidden md:table-cell p-2 md:p-0'
    },
    {
      field: 'productName',
      header: 'PRODUCT_NAME',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      cssHeader: 'hidden md:flex flex-row flex-nowrap align-items-center column-gap-2 p-0 md:p-2',
      cssBody: 'hidden md:table-cell p-2 md:p-0'
    },
    {
      field: 'priority',
      header: 'PRIORITY',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      cssHeader: 'hidden xl:flex flex-row flex-nowrap align-items-center column-gap-2 text-center p-0 xl:p-2',
      cssBody: 'hidden xl:table-cell p-0 xl:p-2 text-center'
    },
    {
      field: 'startDate',
      header: 'START_DATE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      cssHeader: 'hidden lg:flex flex-row flex-nowrap align-items-center column-gap-2 text-center p-0 lg:p-2',
      cssBody: 'hidden lg:table-cell p-0 lg:p-2',
      hasFilter: false,
      isDate: true
    },
    {
      field: 'endDate',
      header: 'END_DATE',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      cssHeader: 'hidden xl:flex flex-row flex-nowrap align-items-center column-gap-2 text-center p-0 xl:p-2',
      cssBody: 'hidden xl:table-cell p-0 xl:p-2',
      hasFilter: false,
      isDate: true
    }
  ]

  constructor(
    private readonly user: UserService,
    private readonly slotService: SlotService,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService,
    private readonly announcementApi: AnnouncementInternalAPIService
  ) {
    this.interactiveColumns = this.createInteractiveColumns()
    this.displayedColumnKeys = this.columns.filter((a) => a.active === true).map((col) => col.field)
    this.pdIsComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.pdSlotName)
    this.wdIsComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.wdSlotName)
  }

  public ngOnInit(): void {
    this.user.lang$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lang: string) => {
        this.datetimeFormat = lang === 'de' ? 'dd.MM.yyyy HH:mm' : this.datetimeFormat
      }
    })
    this.pdSlotEmitter.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(this.productData$)
    this.wdSlotEmitter.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(this.workspaceData$)
    this.prepareActionButtons()
    this.loadMetaData()
    this.onSearch({})
  }

  /****************************************************************************
   * DIALOG
   */
  private prepareActionButtons(): void {
    this.actions$ = this.translate.get(['ACTIONS.CREATE.LABEL', 'ACTIONS.CREATE.TOOLTIP']).pipe(
      map((data: Record<string, string>) => {
        return [
          {
            label: data['ACTIONS.CREATE.LABEL'],
            title: data['ACTIONS.CREATE.TOOLTIP'],
            actionCallback: () =>
              this.ensureHasPermission('ANNOUNCEMENT#CREATE', () => this.onDetail(undefined, 'CREATE')),
            icon: 'pi pi-plus',
            show: 'always',
            permission: 'ANNOUNCEMENT#CREATE'
          }
        ]
      })
    )
  }

  /****************************************************************************
   *  UI Events
   */
  public onCriteriaReset(): void {
    this.criteria = {}
  }
  public onColumnsChange(activeIds: string[]) {
    if (
      activeIds.length === this.displayedColumnKeys.length &&
      activeIds.every((value, index) => value === this.displayedColumnKeys[index])
    ) {
      return
    }
    this.displayedColumnKeys = activeIds
  }

  public onGlobalFilter(value?: string, data?: RowListGridData[]): void {
    if (!data) return
    this.globalFilterValue = value ?? ''
    if (this.globalFilterValue === '') this.filteredData = undefined
    else
      this.filteredData = data?.filter((row) =>
        row['title']?.toString().toLowerCase().includes(this.globalFilterValue.toLowerCase())
      )
  }

  public onClearGlobalFilter(input?: HTMLInputElement): void {
    this.globalFilterValue = ''
    this.filteredData = undefined
    if (input) input.value = ''
  }

  public onSortChange(event: { sortColumn: string; sortDirection: DataSortDirection }): void {
    this.sortField = event.sortColumn
    this.sortDirection = event.sortDirection
  }

  /****************************************************************************
   *  DETAIL => CREATE, COPY, EDIT, VIEW
   */
  public onDetail(item: Announcement | undefined, mode: ChangeMode): void {
    this.changeMode = mode
    this.item4Detail = { ...item } // do not manipulate the item here
    this.displayDetailDialog = true
  }
  public onCloseDetail(refresh: boolean): void {
    this.displayDetailDialog = false
    this.item4Detail = undefined
    if (refresh) {
      this.usedListsTrigger$.next() // trigger getting data
      this.onSearch({}, true)
    }
  }

  private ensureHasPermission(permission: string, onGranted: () => void): void {
    this.user
      .hasPermission(permission)
      .then((granted) => {
        if (!granted) {
          this.msgService.error({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.ANNOUNCEMENT' })
          return
        }
        onGranted()
      })
      .catch((err) => {
        console.error('hasPermission', err)
        this.msgService.error({ summaryKey: 'EXCEPTIONS.HTTP_STATUS_403.ANNOUNCEMENT' })
      })
  }

  public onViewFromInteractive(item: RowListGridData): void {
    this.ensureHasPermission('ANNOUNCEMENT#VIEW', () => this.onDetail(item as Announcement, 'VIEW'))
  }
  public onCopyFromInteractive(item: RowListGridData): void {
    this.ensureHasPermission('ANNOUNCEMENT#CREATE', () => this.onDetail(item as Announcement, 'COPY'))
  }
  public onEditFromInteractive(item: RowListGridData): void {
    this.ensureHasPermission('ANNOUNCEMENT#EDIT', () => this.onDetail(item as Announcement, 'EDIT'))
  }
  public onDeleteFromInteractive(item: RowListGridData): void {
    this.ensureHasPermission('ANNOUNCEMENT#DELETE', () => {
      this.item4Delete = { ...item } as Announcement
      this.displayDeleteDialog = true
    })
  }

  private getInteractiveColumnType(col: ExtendedColumn): ColumnType {
    if (col.isDate) return ColumnType.DATE
    return ColumnType.STRING
  }

  private isInteractiveSortable(col: ExtendedColumn): boolean {
    return !['status', 'type'].includes(col.field)
  }

  // Extend the columns with information for interactive table and special rendering
  private createInteractiveColumns(): DataTableColumn[] {
    return this.columns.map((col) => {
      const columnLabelKey = `${col.translationPrefix}.${col.header}`
      const columnTooltipKey = `${col.translationPrefix}.TOOLTIPS.${col.header}`

      return {
        id: col.field,
        nameKey: columnLabelKey,
        tooltipKey: columnTooltipKey,
        columnType: this.getInteractiveColumnType(col),
        sortable: this.isInteractiveSortable(col),
        filterable: col.hasFilter === true,
        dateFormat: col.isDate ? this.datetimeFormat : undefined,
        // extensions for custom rendering:
        cssHeader: col.cssHeader,
        cssBody: col.cssBody
      }
    })
  }

  /*
   * DELETION confirmed
   */
  // called after successful deletion from AnnouncementDeleteComponent
  public onDeleteConfirmed(deleted: boolean): void {
    if (deleted) {
      const productName = this.item4Delete?.productName
      const data = this.dataSubject$.getValue()?.filter((d) => d['id'] !== this.item4Delete?.id) ?? []
      this.dataSubject$.next(data)
      this.onGlobalFilter(this.globalFilterValue, data) // update filtered data if filter is active
      if (productName && !data.some((d) => d?.['productName'] === productName)) {
        this.usedListsTrigger$.next()
      }
    }
    this.displayDeleteDialog = false
    this.item4Delete = undefined
  }

  /****************************************************************************
   *  LOAD meta data
   *    declare the requests to getting meta data...
   *    ...to fill drop down lists => products, workspaces
   */
  private loadMetaData(): void {
    // declare search for used products/workspaces (used === assigned to announcement)
    // hereby SelectItem[] are prepared without displayName (updated later by combineLatest)
    this.usedLists$ = this.usedListsTrigger$.pipe(
      switchMap(() =>
        this.announcementApi.getAllAnnouncementAssignments().pipe(
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
            return of({ products: [], workspaces: [] })
          })
        )
      )
    )

    // combine master data (slots) with used data (enrich them with correct display names)
    this.loadingMetaData = true
    this.metaData$ = combineLatest([this.workspaceData$, this.productData$, this.usedLists$]).pipe(
      map(([workspaces, products, usedLists]: [Workspace[] | undefined, Product[] | undefined, AllUsedLists]) => {
        // enrich the used lists with display names taken from master data (allLists)
        let allProducts: SelectItem[] | undefined = undefined
        if (products) {
          allProducts = []
          products.forEach((p) => allProducts?.push({ label: p.displayName, value: p.name }))
          usedLists.products.forEach((p) => (p.label = this.getDisplayName(p.value, allProducts, p.value)))
        }
        let allWorkspaces: SelectItem[] | undefined = undefined
        if (workspaces) {
          allWorkspaces = []
          workspaces.forEach((w) => allWorkspaces?.push({ label: w.displayName, value: w.name }))
          usedLists.workspaces.forEach((w) => (w.label = this.getDisplayName(w.value, allWorkspaces, w.value)))
        }
        this.loadingMetaData = false
        return {
          allProducts: allProducts ?? usedLists.products,
          allWorkspaces: allWorkspaces ?? usedLists.workspaces,
          usedProducts: usedLists.products,
          usedWorkspaces: usedLists.workspaces
        }
      })
    )
  }

  /****************************************************************************
   *  SEARCH announcements
   */
  public onSearch(criteria: AnnouncementSearchCriteria, reuseCriteria = false): void {
    if (!reuseCriteria) this.criteria = criteria
    this.searching = true
    this.exceptionKey = undefined
    this.searchSubscription?.unsubscribe()
    this.searchSubscription = this.announcementApi
      .searchAnnouncements({ announcementSearchCriteria: this.criteria })
      .pipe(
        map((data) => (data.stream as RowListGridData[]) ?? []),
        catchError((err) => {
          this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENTS'
          this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.SEARCH_FAILED' })
          console.error('searchAnnouncements', err)
          return of([] as RowListGridData[])
        }),
        finalize(() => (this.searching = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => this.dataSubject$.next(data))
  }
}
