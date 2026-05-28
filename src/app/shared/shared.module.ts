import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { provideErrorTailorConfig, errorTailorImports } from '@ngneat/error-tailor'

import { AutoCompleteModule } from 'primeng/autocomplete'
import { ButtonModule } from 'primeng/button'
import { MessageModule } from 'primeng/message'

import { DatePicker } from 'primeng/datepicker'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { ConfirmPopupModule } from 'primeng/confirmpopup'
import { ConfirmationService } from 'primeng/api'
import { DataViewModule } from 'primeng/dataview'
import { DialogModule } from 'primeng/dialog'
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog'
import { Select } from 'primeng/select'
import { FieldsetModule } from 'primeng/fieldset'
import { FloatLabel } from 'primeng/floatlabel'
import { InputGroupModule } from 'primeng/inputgroup'
import { InputGroupAddonModule } from 'primeng/inputgroupaddon'
import { InputTextModule } from 'primeng/inputtext'
import { InputSwitchModule } from 'primeng/inputswitch'
import { TextareaModule } from 'primeng/textarea'
import { BadgeModule } from 'primeng/badge'
import { KeyFilterModule } from 'primeng/keyfilter'
import { ListboxModule } from 'primeng/listbox'
import { MultiSelectModule } from 'primeng/multiselect'
import { Popover } from 'primeng/popover'
import { SelectButtonModule } from 'primeng/selectbutton'
import { TableModule } from 'primeng/table'
import { TabViewModule } from 'primeng/tabview'
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
    ButtonModule,
    DatePicker,
    CommonModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
    Select,
    DynamicDialogModule,
    FieldsetModule,
    FloatLabel,
    InputGroupModule,
    InputGroupAddonModule,
    FormsModule,
    InputTextModule,
    InputSwitchModule,
    TextareaModule,
    MessageModule,
    BadgeModule,
    KeyFilterModule,
    ListboxModule,
    MultiSelectModule,
    Popover,
    ReactiveFormsModule,
    SelectButtonModule,
    TableModule,
    TabViewModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TranslateModule,
    errorTailorImports
  ],
  exports: [
    AutoCompleteModule,
    ButtonModule,
    DatePicker,
    CommonModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
    Select,
    DynamicDialogModule,
    FieldsetModule,
    FloatLabel,
    InputGroupModule,
    InputGroupAddonModule,
    FormsModule,
    InputTextModule,
    InputSwitchModule,
    TextareaModule,
    MessageModule,
    BadgeModule,
    KeyFilterModule,
    ListboxModule,
    MultiSelectModule,
    Popover,
    ReactiveFormsModule,
    SelectButtonModule,
    TableModule,
    TabViewModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TranslateModule,
    errorTailorImports
  ],
  //this is not elegant, for some reason the injection token from primeng does not work across federated module
  providers: [
    ConfirmationService,
    LabelResolver,
    { provide: DialogService, useClass: PortalDialogService },
    provideErrorTailorConfig({
      controlErrorsOn: { async: true, blur: true, change: true },
      errors: {
        useFactory: (i18n: TranslateService) => {
          return {
            required: () => i18n.instant('VALIDATION.ERRORS.EMPTY_REQUIRED_FIELD'),
            maxlength: ({ requiredLength }) =>
              i18n.instant('VALIDATION.ERRORS.MAXIMUM_LENGTH').replace('{{chars}}', requiredLength),
            minlength: ({ requiredLength }) =>
              i18n.instant('VALIDATION.ERRORS.MINIMUM_LENGTH').replace('{{chars}}', requiredLength),
            pattern: () => i18n.instant('VALIDATION.ERRORS.PATTERN_ERROR')
          }
        },
        deps: [TranslateService]
      },
      //this is required because primeng calendar wraps things in an ugly way
      blurPredicate: (element: Element) => {
        return ['INPUT', 'TEXTAREA', 'SELECT', 'CUSTOM-DATE', 'P-DATEPICKER', 'P-SELECT'].includes(element.tagName)
      }
    })
  ]
})
export class SharedModule {}
