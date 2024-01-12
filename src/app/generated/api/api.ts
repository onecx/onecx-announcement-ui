export * from './announcementInternal.service';
import { AnnouncementInternalAPIService } from './announcementInternal.service';
export * from './announcementV1.service';
import { AnnouncementV1APIService } from './announcementV1.service';
export * from './helpItemInternal.service';
import { HelpItemInternalAPIService } from './helpItemInternal.service';
export * from './helpItemV1.service';
import { HelpItemV1APIService } from './helpItemV1.service';
export const APIS = [AnnouncementInternalAPIService, AnnouncementV1APIService, HelpItemInternalAPIService, HelpItemV1APIService];
