export type NotificationRecipientType = "CLIENT" | "PROFESSIONAL";

export type NotificationType =
  | "BOOKING_CONFIRMED"
  | "EVENT_CREATED"
  | "EVENT_CREATION_FAILED"
  | "BOOKING_CANCELLED";

export type NotificationDeliveryStatus = "PENDING" | "SENT" | "FAILED";

export type Notification = {
  id: string;
  bookingId: string;
  recipientType: NotificationRecipientType;
  recipientEmail: string;
  type: NotificationType;
  deliveryStatus: NotificationDeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateNotificationInput = {
  bookingId: string;
  recipientType: NotificationRecipientType;
  recipientEmail: string;
  type: NotificationType;
  deliveryStatus?: NotificationDeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sentAt?: Date | null;
};

export type UpdateNotificationInput = {
  deliveryStatus?: NotificationDeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sentAt?: Date | null;
};

export type NotificationListItem = Pick<
  Notification,
  | "id"
  | "bookingId"
  | "recipientType"
  | "recipientEmail"
  | "type"
  | "deliveryStatus"
  | "sentAt"
  | "createdAt"
>;

export type SendBookingConfirmedNotificationInput = {
  bookingId: string;
  clientEmail: string;
  professionalEmail: string;
};

export type SendEventCreatedNotificationInput = {
  bookingId: string;
  clientEmail: string;
  professionalEmail: string;
  eventUrl?: string | null;
  meetingUrl?: string | null;
};

export type SendEventCreationFailedNotificationInput = {
  bookingId: string;
  professionalEmail: string;
  errorMessage?: string | null;
};

export type SendBookingCancelledNotificationInput = {
  bookingId: string;
  clientEmail: string;
  professionalEmail: string;
};

export type NotificationDeliveryResult = {
  success: boolean;
  providerMessageId?: string | null;
  errorMessage?: string | null;
};

export type NotificationSummary = {
  total: number;
  pending: number;
  sent: number;
  failed: number;
};