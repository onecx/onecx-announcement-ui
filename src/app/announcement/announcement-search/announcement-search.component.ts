import { Component, OnInit, ViewChild } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { catchError, combineLatest, finalize, map, Observable, of } from 'rxjs'
import { Table } from 'primeng/table'
import { SelectItem } from 'primeng/api'

import { PortalMessageService, UserService } from '@onecx/angular-integration-interface'
import { Action } from '@onecx/angular-accelerator'
import { Column, DataViewControlTranslations } from '@onecx/portal-integration-angular'

import {
  Announcement,
  AnnouncementAssignments,
  AnnouncementInternalAPIService,
  AnnouncementSearchCriteria,
  SearchAnnouncementsRequestParams,
  WorkspaceAbstract
} from 'src/app/shared/generated'
import { limitText, dropDownSortItemsByLabel } from 'src/app/shared/utils'

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

@Component({
  selector: 'app-announcement-search',
  templateUrl: './announcement-search.component.html',
  styleUrls: ['./announcement-search.component.scss']
})
export class AnnouncementSearchComponent implements OnInit {
  // dialog
  public loading = false
  public searching = false
  public exceptionKey: string | undefined = undefined
  public changeMode: ChangeMode = 'VIEW'
  public dateFormat: string
  public actions$: Observable<Action[]> | undefined
  public criteria: AnnouncementSearchCriteria = {}
  public displayDetailDialog = false
  public displayDeleteDialog = false
  public filteredColumns: Column[] = []
  public limitText = limitText

  @ViewChild('dataTable', { static: false }) dataTable: Table | undefined
  public dataViewControlsTranslations: DataViewControlTranslations = {}

  // data
  public data$: Observable<Announcement[]> | undefined
  public metaData$!: Observable<AllMetaData> // collection of data used in UI
  public allWorkspaces$!: Observable<SelectItem[]> // getting data from bff endpoint
  public allProducts$!: Observable<SelectItem[]> // getting data from bff endpoint
  public usedLists$!: Observable<AllUsedLists> // getting data from bff endpoint
  public item4Detail: Announcement | undefined // used on detail
  public item4Delete: Announcement | undefined // used on deletion

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
    private readonly msgService: PortalMessageService,
    private readonly translate: TranslateService,
    private readonly announcementApi: AnnouncementInternalAPIService
  ) {
    this.dateFormat = this.user.lang$.getValue() === 'de' ? 'dd.MM.yyyy HH:mm' : 'M/d/yy, h:mm a'
    this.filteredColumns = this.columns.filter((a) => a.active === true)
  }

  public ngOnInit(): void {
    this.prepareDataLoad()
    this.loadData()
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
  public onFilterChange(event: string): void {
    this.dataTable?.filterGlobal(event, 'contains')
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
      this.loadData()
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
    this.announcementApi.deleteAnnouncementById({ id: this.item4Delete?.id }).subscribe({
      next: () => {
        this.msgService.success({ summaryKey: 'ACTIONS.DELETE.MESSAGE.OK' })
        // remove item from data
        data = data?.filter((d) => d.id !== this.item4Delete?.id)
        // check remaing data if product still exists - if not then reload
        const d = data?.filter((d) => d.productName === this.item4Delete?.productName)
        this.item4Delete = undefined
        this.displayDeleteDialog = false
        if (d?.length === 0) this.loadData()
        else this.onSearch({ announcementSearchCriteria: {} }, true)
      },
      error: (err) => {
        this.msgService.error({ summaryKey: 'ACTIONS.DELETE.MESSAGE.NOK' })
        console.error('deleteAnnouncementById', err)
      }
    })
  }

  // item in list?
  public doesItemExist(name: string | undefined, list: SelectItem[]): boolean {
    return list.find((item) => item.value === name) !== undefined
  }

  public getDisplayName(name: string | undefined, list: SelectItem[]): string | undefined {
    return list.find((item) => item.value === name)?.label ?? name
  }

  /****************************************************************************
   *  SEARCHING
   *   1. Loading META DATA used to display drop down lists => products, workspaces
   *   2. Trigger searching data
   */
  private prepareDataLoad(): void {
    // declare search for ALL products provided by bff
    this.allProducts$ = this.announcementApi.getAllProductNames({ productsSearchCriteria: {} }).pipe(
      map((data) => {
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
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.WORKSPACES'
        console.error('getAllWorkspaceNames', err)
        return of([] as SelectItem[])
      })
    )
    // declare search for used products/workspaces (used === assigned to announcement)
    // hereby SelectItem[] are prepared but with a temporary label (=> displayName)
    this.usedLists$ = this.announcementApi.getAllAnnouncementAssignments().pipe(
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
    this.loading = true
    const allDataLists$ = combineLatest([this.allWorkspaces$, this.allProducts$])
    this.metaData$ = combineLatest([allDataLists$, this.usedLists$]).pipe(
      map(([[aW, aP], aul]: [[SelectItem[], SelectItem[]], AllUsedLists]) => {
        // enrich the temporary prepared lists with display names contained in allLists
        aul.products.forEach((p) => {
          p.label = this.getDisplayName(p.value, aP)
        })
        aul.workspaces.forEach((w) => {
          w.label = this.getDisplayName(w.value, aW)
        })
        if (!this.exceptionKey) this.onSearch({ announcementSearchCriteria: {} })
        return { allProducts: aP, allWorkspaces: aW, usedProducts: aul.products, usedWorkspaces: aul.workspaces }
      }),
      finalize(() => (this.loading = false))
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
    this.data$ = this.announcementApi.searchAnnouncements(criteria).pipe(
      map((data) => data.stream ?? []),
      catchError((err) => {
        this.exceptionKey = 'EXCEPTIONS.HTTP_STATUS_' + err.status + '.ANNOUNCEMENTS'
        this.msgService.error({ summaryKey: 'ACTIONS.SEARCH.MESSAGE.SEARCH_FAILED' })
        console.error('searchAnnouncements', err)
        return of([] as Announcement[])
      }),
      finalize(() => (this.searching = false))
    )
  }
}
