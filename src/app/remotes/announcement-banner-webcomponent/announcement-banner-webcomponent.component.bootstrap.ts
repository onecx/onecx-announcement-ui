import { createCustomElement } from '@angular/elements'
import { createApplication } from '@angular/platform-browser'
import { NgZone, PlatformRef, VERSION, Version, getPlatform, importProvidersFrom } from '@angular/core'
import {} from '@angular-architects/module-federation-tools'
import { OneCXAnnouncementWebcomponentBannerComponent } from './announcement-banner-webcomponent.component'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'
import { AngularAuthModule } from '@onecx/angular-auth'
;(async () => {
  const app = await createApplication({
    providers: [
      (window as any)['@angular-architects/module-federation-tools'].ngZone
        ? {
            provide: NgZone,
            useValue: (window as any)['@angular-architects/module-federation-tools'].ngZone
          }
        : [],
      provideHttpClient(withInterceptorsFromDi()),
      importProvidersFrom(AngularAuthModule)
    ]
  })

  const platform = getPlatform()
  let platformCache: Map<Version, PlatformRef> = (window as any)['@angular-architects/module-federation-tools']
    .platformCache
  if (!platformCache) {
    platformCache = new Map<Version, PlatformRef>()
    ;(window as any)['@angular-architects/module-federation-tools'].platformCache = platformCache
  }
  const version = VERSION
  platform && platformCache.set(version, platform)

  const myStandaloneComponentAsWebComponent = createCustomElement(OneCXAnnouncementWebcomponentBannerComponent, {
    injector: app.injector
  })

  customElements.define('ocx-announcement-banner-component', myStandaloneComponentAsWebComponent)
})()
