import { Route, UrlMatcher, UrlSegment, UrlSegmentGroup } from '@angular/router'
export function match(prefix: string): UrlMatcher {
  return (url: UrlSegment[], UrlSegmentGroup: UrlSegmentGroup, route: Route) => {
    const mfeBaseHref: string = route.data!['mfeInfo'].baseHref
    const baseHrefSegmentAmount = mfeBaseHref.split('/').filter((value) => value).length
    const urlWithoutBaseHref = url.slice(baseHrefSegmentAmount)
    const index = urlWithoutBaseHref && prefix === '' ? 0 : urlWithoutBaseHref.findIndex((u) => u.path === prefix)
    if (index >= 0) {
      return { consumed: url.slice(0, index + baseHrefSegmentAmount + 1) }
    }
    return null
  }
}
