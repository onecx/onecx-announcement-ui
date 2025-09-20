import { Component, EventEmitter, OnInit } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, catchError, combineLatest, finalize, map, Observable, of, switchMap } from 'rxjs'
import { Table } from 'primeng/table'
import { SelectItem } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { Action } from '@onecx/angular-accelerator'
import { Column, DataViewControlTranslations } from '@onecx/portal-integration-angular'
import { SlotService } from '@onecx/angular-remote-components'

import {
  Announcement,
  AnnouncementAssignments,
  AnnouncementInternalAPIService,
  AnnouncementSearchCriteria
} from 'src/app/shared/generated'
import { limitText } from 'src/app/shared/utils'

export type ChangeMode = 'VIEW' | 'COPY' | 'CREATE' | 'EDIT'
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
  styleUrls: ['./announcement-search.component.scss']
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
  public filteredColumns: Column[] = []
  public dataViewControlsTranslations: DataViewControlTranslations = {}
  public limitText = limitText

  // data
  public data$: Observable<Announcement[]> | undefined
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
    private readonly msgService: PortalMessageService,
    private readonly translate: TranslateService,
    private readonly announcementApi: AnnouncementInternalAPIService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'M/d/yy, h:mm a'
    this.filteredColumns = this.columns.filter((a) => a.active === true)
    this.pdIsComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.pdSlotName)
    this.wdIsComponentDefined$ = this.slotService.isSomeComponentDefinedForSlot(this.wdSlotName)
  }

  public ngOnInit(): void {
    this.pdSlotEmitter.subscribe(this.productData$)
    this.wdSlotEmitter.subscribe(this.workspaceData$)
    this.loadMetaData()
    this.onSearch({})
    this.prepareDialogTranslations()
    this.prepareActionButtons()
  }

  /**
   * Dialog preparation
   */
  private prepareDialogTranslations(): void {
    this.translate
      .get([
        'DIALOG.DATAVIEW.FILTER',
        'DIALOG.DATAVIEW.FILTER_BY',
        'ANNOUNCEMENT.TITLE',
        'ANNOUNCEMENT.WORKSPACE',
        'ANNOUNCEMENT.PRODUCT_NAME'
      ])
      .pipe(
        map((data) => {
          this.dataViewControlsTranslations = {
            filterInputPlaceholder: data['DIALOG.DATAVIEW.FILTER'],
            filterInputTooltip:
              data['DIALOG.DATAVIEW.FILTER_BY'] +
              data['ANNOUNCEMENT.TITLE'] +
              ', ' +
              data['ANNOUNCEMENT.WORKSPACE'] +
              ', ' +
              data['ANNOUNCEMENT.PRODUCT_NAME']
          }
        })
      )
      .subscribe()
  }
  private prepareActionButtons(): void {
    this.actions$ = this.translate.get(['ACTIONS.CREATE.LABEL', 'ACTIONS.CREATE.TOOLTIP']).pipe(
      map((data) => {
        return [
          {
            label: data['ACTIONS.CREATE.LABEL'],
            title: data['ACTIONS.CREATE.TOOLTIP'],
            actionCallback: () => this.onDetail('CREATE', undefined),
            icon: 'pi pi-plus',
            show: 'always',
            permission: 'ANNOUNCEMENT#EDIT'
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
    this.filteredColumns = activeIds.map((id) => this.columns.find((col) => col.field === id)) as Column[]
  }
  public onFilterChange(event: string, dataTable: Table): void {
    dataTable?.filterGlobal(event, 'contains')
  }

  // Detail => CREATE, COPY, EDIT, VIEW
  public onDetail(mode: ChangeMode, item: Announcement | undefined, ev?: Event): void {
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

  // DELETE => Ask for confirmation
  public onDelete(ev: Event, item: Announcement): void {
    ev.stopPropagation()
    this.item4Delete = item
    this.displayDeleteDialog = true
  }
  // user confirmed deletion
  public onDeleteConfirmation(data: Announcement[]): void {
    if (!this.item4Delete?.id) return
    this.announcementApi.deleteAnnouncementById({ id: this.item4Delete.id }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
        // remove item from data
        data = data?.filter((d) => d.id !== this.item4Delete?.id)
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

  /****************************************************************************
   *  SEARCH meta data
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

    this.loadingMetaData = true
    // combine master data with used data (enrich them with correct display names)
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
      map((data) => data.stream ?? []),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENTS'
        this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.SEARCH_FAILED' })
        console.error('searchAnnouncements', err)
        return of([])
      }),
      finalize(() => (this.searching = false))
    )
  }
}
