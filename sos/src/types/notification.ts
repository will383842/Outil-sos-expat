/**
 * BaseNotification - Shared notification type for all affiliate roles
 *
 * Used by: Chatter, Influencer, Blogger, GroupAdmin
 */

export interface BaseNotification {
  id: string;
  type: string;
  title: string;
  titleTranslations?: Record<string, string>;
  message: string;
  messageTranslations?: Record<string, string>;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}
