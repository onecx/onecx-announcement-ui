import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { ErrorTailorModule } from '@ngneat/error-tailor'

import { AutoCompleteModule } from 'primeng/autocomplete'
import { ConfirmPopupModule } from 'primeng/confirmpopup'
import { ConfirmationService, MessageService } from 'primeng/api'
import { DataViewModule } from 'primeng/dataview'
import { DialogModule } from 'primeng/dialog'
import { DialogService } from 'primeng/dynamicdialog'
import { DropdownModule } from 'primeng/dropdown'
import { InputTextModule } from 'primeng/inputtext'
import { InputTextareaModule } from 'primeng/inputtextarea'
import { CalendarModule } from 'primeng/calendar'
import { StyleClassModule } from 'primeng/styleclass'
import { KeyFilterModule } from 'primeng/keyfilter'
import { ListboxModule } from 'primeng/listbox'
import { MultiSelectModule } from 'primeng/multiselect'
import { SelectButtonModule } from 'primeng/selectbutton'
import { TableModule } from 'primeng/table'
import { ToastModule } from 'primeng/toast'

import {
  MfeInfo,
  MFE_INFO,
  PortalDialogService,
  PortalMessageService,
  TranslateCombinedLoader
} from '@onecx/portal-integration-angular'

import { environment } from '../../environments/environment'
import { BASE_PATH } from '../generated/variables'
import { CanActivateGuard } from './can-active-guard.service'
import { LabelResolver } from './label.resolver'

export const basePathProvider = (mfeInfo: MfeInfo) => {
  /* console.log(
    'Base path provider: ' + (mfeInfo ? mfeInfo.remoteBaseUrl + '' + environment.apiPrefix : '' + environment.apiPrefix)
  ) */
  return (mfeInfo ? mfeInfo.remoteBaseUrl : '') + environment.apiPrefix
}

export function HttpLoaderFactory(http: HttpClient, mfeInfo: MfeInfo) {
  // console.log(`Configuring translation loader ${mfeInfo?.remoteBaseUrl}`)
  // if running standalone then load the app assets directly from remote base URL
  const appAssetPrefix = mfeInfo?.remoteBaseUrl ? mfeInfo.remoteBaseUrl : './'
  return new TranslateCombinedLoader(
    new TranslateHttpLoader(http, appAssetPrefix + 'assets/i18n/', '.json'),
    new TranslateHttpLoader(http, appAssetPrefix + 'onecx-portal-lib/assets/i18n/', '.json')
  )
}

@NgModule({
  declarations: [],
  imports: [
    AutoCompleteModule,
    CalendarModule,
    CommonModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
    DropdownModule,
    FormsModule,
    InputTextModule,
    InputTextareaModule,
    KeyFilterModule,
    ListboxModule,
    MultiSelectModule,
    ReactiveFormsModule,
    SelectButtonModule,
    StyleClassModule,
    TableModule,
    ToastModule,
    TranslateModule.forChild({ isolate: true }),
    ErrorTailorModule.forRoot({
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
        return ['INPUT', 'TEXTAREA', 'SELECT', 'CUSTOM-DATE', 'P-CALENDAR', 'P-DROPDOWN'].some(
          (selector) => element.tagName === selector
        )
      }
    })
  ],
  exports: [
    AutoCompleteModule,
    CalendarModule,
    CommonModule,
    ConfirmPopupModule,
    DataViewModule,
    DialogModule,
    DropdownModule,
    ErrorTailorModule,
    FormsModule,
    InputTextModule,
    InputTextareaModule,
    KeyFilterModule,
    ListboxModule,
    MultiSelectModule,
    ReactiveFormsModule,
    SelectButtonModule,
    StyleClassModule,
    TableModule,
    ToastModule,
    TranslateModule
  ],
  //this is not elegant, for some reason the injection token from primeng does not work across federated module
  providers: [
    CanActivateGuard,
    ConfirmationService,
    LabelResolver,
    HttpClient,
    { provide: MessageService, useExisting: PortalMessageService },
    { provide: DialogService, useClass: PortalDialogService },
    { provide: BASE_PATH, useFactory: basePathProvider, deps: [MFE_INFO] }
  ],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {}
