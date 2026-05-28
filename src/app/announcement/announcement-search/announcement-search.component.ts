import { Component, EventEmitter, OnInit } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, catchError, combineLatest, finalize, map, Observable, of, switchMap } from 'rxjs'
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
import { AnnouncementDetailComponent } from '../announcement-detail/announcement-detail.component'
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
  css?: string
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
    AnnouncementDetailComponent
  ]
})
export class AnnouncementSearchComponent implements OnInit {
  // dialog
  public loadingMetaData = false
  public searching = false
  public exceptionKey: string | undefined = undefined
  public changeMode: ChangeMode = 'VIEW'
  public dateFormat: string
  public actions$: Observable<Action[]> | undefined
  public criteria: AnnouncementSearchCriteria = {}
  public displayDetailDialog = false
  public displayDeleteDialog = false
  public interactiveColumns: DataTableColumn[] = []
  public displayedColumnKeys: string[] = []
  public sortField = 'startDate'
  public sortDirection = DataSortDirection.DESCENDING
  public tableFilter = ''
  public interactiveAdditionalActions: DataAction[] = [
    {
      id: 'copy',
      labelKey: 'ACTIONS.COPY.LABEL',
      icon: 'pi pi-copy',
      permission: 'ANNOUNCEMENT#CREATE',
      classes: ['copy-action-button'],
      callback: (item) => this.onCopyFromInteractive(item as RowListGridData)
    }
  ]

  // data
  public data$: Observable<Announcement[]> | undefined
  public interactiveData: RowListGridData[] = []
  private fullInteractiveData: RowListGridData[] = []
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
      css: 'text-center'
    },
    {
      field: 'productName',
      header: 'PRODUCT_NAME',
      active: true,
      translationPrefix: 'ANNOUNCEMENT',
      css: 'text-center'
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
    private readonly slotService: SlotService,
    private readonly translate: TranslateService,
    private readonly msgService: PortalMessageService,
    private readonly announcementApi: AnnouncementInternalAPIService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'M/d/yy, h:mm a'
    this.interactiveColumns = this.createInteractiveColumns()
    this.displayedColumnKeys = this.columns.filter((a) => a.active === true).map((col) => col.field)
    this.pdIsComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.pdSlotName)
    this.wdIsComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.wdSlotName)
  }

  public ngOnInit(): void {
    this.user.lang$.subscribe({
      next: (lang) => {
        this.dateFormat = lang === 'de' ? 'dd.MM.yyyy HH:mm' : 'M/d/yy, h:mm a'
        this.interactiveColumns = this.createInteractiveColumns()
      }
    })
    this.prepareActionButtons()
    this.pdSlotEmitter.subscribe(this.productData$)
    this.wdSlotEmitter.subscribe(this.workspaceData$)
    this.loadMetaData()
    this.onSearch({})
  }

  /****************************************************************************
   * DIALOG
   */
  private prepareActionButtons(): void {
    this.actions$ = this.translate.get(['ACTIONS.CREATE.LABEL', 'ACTIONS.CREATE.TOOLTIP']).pipe(
      map((data) => {
        return [
          {
            label: data['ACTIONS.CREATE.LABEL'],
            title: data['ACTIONS.CREATE.TOOLTIP'],
            actionCallback: () =>
              this.ensurePermission('ANNOUNCEMENT#CREATE', () => this.onDetail(undefined, undefined, 'CREATE')),
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
    this.applyGlobalFilter()
  }
  public onInteractiveFilterChange(_: unknown): void {
    // filtering is handled by ocx-interactive-data-view when clientSideFiltering is enabled
  }

  public onGlobalFilter(value: string): void {
    this.tableFilter = value ?? ''
    this.applyGlobalFilter()
  }

  public onClearGlobalFilter(input?: HTMLInputElement): void {
    this.tableFilter = ''
    if (input) input.value = ''
    this.applyGlobalFilter()
  }

  public onSortChange(event: { sortColumn: string; sortDirection: DataSortDirection }): void {
    this.sortField = event.sortColumn
    this.sortDirection = event.sortDirection
  }

  public isValidDateValue(value: unknown): boolean {
    if (value == null || value === '') return false
    const date = value instanceof Date ? value : new Date(value as string)
    return !Number.isNaN(date.getTime())
  }

  public toInteractiveData(data: Announcement[]): RowListGridData[] {
    return (data ?? []).map((item, index) => ({
      ...item,
      id: item.id ?? `announcement-${index}`,
      imagePath: item.id ?? `announcement-${index}`
    })) as RowListGridData[]
  }

  private toSearchableText(value: unknown): string | undefined {
    if (value == null) return undefined
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return value.toString()
    }
    if (value instanceof Date) return value.toISOString()
    if (Array.isArray(value)) {
      const normalizedValues = value
        .map((entry) => this.toSearchableText(entry))
        .filter((entry): entry is string => entry != null && entry !== '')
      return normalizedValues.length ? normalizedValues.join(' ') : undefined
    }
    return undefined
  }

  private applyGlobalFilter(): void {
    const searchTerm = this.tableFilter.trim().toLowerCase()
    if (!searchTerm) {
      this.interactiveData = [...this.fullInteractiveData]
      return
    }

    const fields = this.displayedColumnKeys.length ? this.displayedColumnKeys : this.columns.map((col) => col.field)
    this.interactiveData = this.fullInteractiveData.filter((row) =>
      fields.some((field) => {
        const searchableText = this.toSearchableText((row as Record<string, unknown>)[field])
        if (!searchableText) return false
        return searchableText.toLowerCase().includes(searchTerm)
      })
    )
  }

  /****************************************************************************
   *  DETAIL => CREATE, COPY, EDIT, VIEW
   */
  public onDetail(ev: Event | undefined, item: Announcement | undefined, mode: ChangeMode): void {
    ev?.stopPropagation()
    this.changeMode = mode
    this.item4Detail = item // do not manipulate the item here
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

  /****************************************************************************
   *  DELETE => Ask for confirmation
   */
  public onDelete(ev: Event, item: Announcement): void {
    ev.stopPropagation()
    this.item4Delete = item
    this.displayDeleteDialog = true
  }

  public onDeleteFromInteractive(item: RowListGridData): void {
    this.ensurePermission('ANNOUNCEMENT#DELETE', () => {
      this.item4Delete = item as Announcement
      this.displayDeleteDialog = true
    })
  }

  public onViewFromInteractive(item: RowListGridData): void {
    this.ensurePermission('ANNOUNCEMENT#VIEW', () => this.onDetail(undefined, item as Announcement, 'VIEW'))
  }

  public onCopyFromInteractive(item: RowListGridData): void {
    this.ensurePermission('ANNOUNCEMENT#CREATE', () => this.onDetail(undefined, item as Announcement, 'COPY'))
  }

  public onEditFromInteractive(item: RowListGridData): void {
    this.ensurePermission('ANNOUNCEMENT#EDIT', () => this.onDetail(undefined, item as Announcement, 'EDIT'))
  }

  private ensurePermission(permission: string, onGranted: () => void): void {
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

  // user confirmed deletion
  public onDeleteConfirmation(data: Announcement[]): void {
    if (!this.item4Delete?.id) return
    this.announcementApi.deleteAnnouncementById({ id: this.item4Delete.id }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
        // remove item from data
        data = data?.filter((d) => d.id !== this.item4Delete?.id)
        this.fullInteractiveData = this.toInteractiveData(data)
        this.applyGlobalFilter()
        this.data$ = of(data)
        // check remaining data: if product still exists - if not then trigger reload
        if (!data?.find((d) => d.productName === this.item4Delete?.productName)) {
          this.usedListsTrigger$.next() // trigger getting data
        }
        this.displayDeleteDialog = false
        this.item4Delete = undefined
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
        console.error('deleteAnnouncementById', err)
      }
    })
  }

  public getDisplayName(
    name: string | undefined,
    list: SelectItem[] | undefined,
    defValue?: string
  ): string | undefined {
    if (name) return list?.find((item) => item.value === name)?.label ?? defValue
    return undefined
  }

  private getInteractiveColumnType(col: ExtendedColumn): ColumnType {
    if (col.isDate) return ColumnType.DATE
    if (col.isDropdown) return ColumnType.TRANSLATION_KEY
    return ColumnType.STRING
  }

  private isInteractiveSortable(col: ExtendedColumn): boolean {
    return !['status', 'type'].includes(col.field)
  }

  private createInteractiveColumns(): DataTableColumn[] {
    return this.columns.map((col) => {
      const columnLabelKey = `${col.translationPrefix}.${col.header}`
      const columnTooltipKey = `${col.translationPrefix}.TOOLTIPS.${col.header}`
      const translatedColumnLabel = this.translate.instant(columnLabelKey)

      return {
        id: col.field,
        nameKey: translatedColumnLabel === columnLabelKey ? columnLabelKey : translatedColumnLabel,
        tooltipKey: columnTooltipKey,
        columnType: this.getInteractiveColumnType(col),
        sortable: this.isInteractiveSortable(col),
        filterable: col.hasFilter === true,
        ...(col.isDate ? { dateFormat: this.dateFormat } : {})
      }
    })
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
    this.data$ = this.announcementApi.searchAnnouncements({ announcementSearchCriteria: this.criteria }).pipe(
      map((data) => {
        const stream = data.stream ?? []
        this.fullInteractiveData = this.toInteractiveData(stream)
        this.applyGlobalFilter()
        return stream
      }),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENTS'
        this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.SEARCH_FAILED' })
        console.error('searchAnnouncements', err)
        this.fullInteractiveData = []
        this.interactiveData = []
        return of([])
      }),
      finalize(() => (this.searching = false))
    )
  }
}
