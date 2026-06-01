import { TranslateService } from '@ngx-translate/core'
import { SelectItem } from 'primeng/api'
import { map, Observable } from 'rxjs'
import { AnnouncementPriorityType, AnnouncementStatus, AnnouncementType } from 'src/app/shared/generated'

export const AnnouncementEnumTranslation = {
  announcementType(translate: TranslateService): Observable<SelectItem[]> {
    return translate
      .get([
        'ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.Event,
        'ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.Info,
        'ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.SystemMaintenance
      ])
      .pipe(
        map((data: Record<string, string>) => {
          return [
            { label: data['ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.Event], value: AnnouncementType.Event },
            { label: data['ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.Info], value: AnnouncementType.Info },
            {
              label: data['ENUMS.ANNOUNCEMENT_TYPE.' + AnnouncementType.SystemMaintenance],
              value: AnnouncementType.SystemMaintenance
            }
          ]
        })
      )
  },

  announcementStatus(translate: TranslateService): Observable<SelectItem[]> {
    return translate
      .get([
        'ENUMS.ANNOUNCEMENT_STATUS.' + AnnouncementStatus.Active,
        'ENUMS.ANNOUNCEMENT_STATUS.' + AnnouncementStatus.Inactive
      ])
      .pipe(
        map((data: Record<string, string>) => {
          return [
            {
              label: data['ENUMS.ANNOUNCEMENT_STATUS.' + AnnouncementStatus.Active],
              value: AnnouncementStatus.Active
            },
            {
              label: data['ENUMS.ANNOUNCEMENT_STATUS.' + AnnouncementStatus.Inactive],
              value: AnnouncementStatus.Inactive
            }
          ]
        })
      )
  },

  announcementPriorityType(translate: TranslateService): Observable<SelectItem[]> {
    return translate
      .get([
        'ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Important,
        'ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Low,
        'ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Normal
      ])
      .pipe(
        map((data: Record<string, string>) => {
          return [
            {
              label: data['ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Important],
              value: AnnouncementPriorityType.Important
            },
            {
              label: data['ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Normal],
              value: AnnouncementPriorityType.Normal
            },
            {
              label: data['ENUMS.ANNOUNCEMENT_PRIORITY.' + AnnouncementPriorityType.Low],
              value: AnnouncementPriorityType.Low
            }
          ]
        })
      )
  }
}
