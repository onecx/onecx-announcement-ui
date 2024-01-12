/**
 * announcement-help-management
 * Announcement Help Management RS API
 *
 * The version of the OpenAPI document: 4.3.0-SNAPSHOT
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { AnnouncementStatus } from './announcementStatus';
import { AnnouncementPriorityType } from './announcementPriorityType';
import { AnnouncementType } from './announcementType';


export interface AnnouncementDetailItemDTO { 
    version?: number;
    creationDate?: string;
    creationUser?: string;
    modificationDate?: string;
    modificationUser?: string;
    id?: string;
    appId?: string;
    title?: string;
    content?: string;
    type?: AnnouncementType;
    priority?: AnnouncementPriorityType;
    status?: AnnouncementStatus;
    startDate?: string;
    endDate?: string;
}



