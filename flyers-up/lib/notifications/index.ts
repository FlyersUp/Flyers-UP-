/**
 * Smart Notification System - Public API
 */

export { createNotificationEvent, createInAppNotification, markNotificationRead, markAllNotificationsRead, getUnreadNotificationCount } from './engine';
export type { CreateNotificationParams, NotificationRow } from './engine';
export { sendPushNotification } from './onesignal';
export * from './types';
