import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule } from '@ngx-translate/core'

import { AutoCompleteModule } from 'primeng/autocomplete'
import { BadgeModule } from 'primeng/badge'
import { ButtonModule } from 'primeng/button'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { ConfirmPopupModule } from 'primeng/confirmpopup'
import { ConfirmationService } from 'primeng/api'
import { DataViewModule } from 'primeng/dataview'
import { DatePicker } from 'primeng/datepicker'
import { DialogModule } from 'primeng/dialog'
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog'
import { FieldsetModule } from 'primeng/fieldset'
import { FloatLabel } from 'primeng/floatlabel'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { InputTextModule } from 'primeng/inputtext'
import { InputSwitchModule } from 'primeng/inputswitch'
import { KeyFilterModule } from 'primeng/keyfilter'
import { ListboxModule } from 'primeng/listbox'
import { MessageModule } from 'primeng/message'
import { MultiSelectModule } from 'primeng/multiselect'
import { Popover } from 'primeng/popover'
import { Select } from 'primeng/select'
import { SelectButtonModule } from 'primeng/selectbutton'
import { TextareaModule } from 'primeng/textarea'
import { TableModule } from 'primeng/table'
import { TabsModule } from 'primeng/tabs'
import { TagModule } from 'primeng/tag'
import { ToastModule } from 'primeng/toast'
import { TooltipModule } from 'primeng/tooltip'

import { AngularAcceleratorModule, PortalDialogService } from '@onecx/angular-accelerator'

import { LabelResolver } from './label.resolver'

@NgModule({
  declarations: [],
  imports: [
    AngularAcceleratorModule,
    AutoCompleteModule,
    BadgeModule,
    ButtonModule,
    CommonModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DataViewModule,
    DatePicker,
    DialogModule,
    DynamicDialogModule,
    FieldsetModule,
    FloatLabel,
    FormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    InputSwitchModule,
    ListboxModule,
    KeyFilterModule,
    MessageModule,
    MultiSelectModule,
    TextareaModule,
    Popover,
    ReactiveFormsModule,
    Select,
    SelectButtonModule,
    TableModule,
    TabsModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TranslateModule
  ],
  exports: [
    AngularAcceleratorModule,
    AutoCompleteModule,
    BadgeModule,
    ButtonModule,
    CommonModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DataViewModule,
    DatePicker,
    DialogModule,
    DynamicDialogModule,
    FieldsetModule,
    FloatLabel,
    FormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    InputSwitchModule,
    KeyFilterModule,
    ListboxModule,
    MessageModule,
    MultiSelectModule,
    Popover,
    ReactiveFormsModule,
    Select,
    SelectButtonModule,
    TableModule,
    TabsModule,
    TagModule,
    TextareaModule,
    ToastModule,
    TooltipModule,
    TranslateModule
  ],
  providers: [ConfirmationService, LabelResolver, { provide: DialogService, useClass: PortalDialogService }]
})
export class SharedModule {}
