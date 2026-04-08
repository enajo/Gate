import "server-only";

import {
  type CreateNotificationInput,
  type Notification,
  type NotificationDeliveryResult,
  type NotificationSummary,
  type SendBookingCancelledNotificationInput,
  type SendBookingConfirmedNotificationInput,
  type SendEventCreatedNotificationInput,
  type SendEventCreationFailedNotificationInput,
  type UpdateNotificationInput,
} from "@/types/notification";
import { generateRandomToken } from "@/lib/crypto";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { notificationRepository } from "@/server/repositories/notification.repository";

function mapNotification(
  notification: Awaited<ReturnType<typeof notificationRepository.findById>>,
): Notification | null {
  if (!notification) {
    return null;
  }

  return {
    id: notification.id,
    bookingId: notification.bookingId,
    recipientType: notification.recipientType,
    recipientEmail: notification.recipientEmail,
    type: notification.type,
    deliveryStatus: notification.deliveryStatus,
    providerMessageId: notification.providerMessageId,
    errorMessage: notification.errorMessage,
    sentAt: notification.sentAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

async function requireBooking(bookingId: string) {
  const booking = await bookingRepository.findBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  return booking;
}

export const notificationService = {
  async getById(notificationId: string): Promise<Notification | null> {
    const notification = await notificationRepository.findById(notificationId);
    return mapNotification(notification);
  },

  async listByBookingId(bookingId: string): Promise<Notification[]> {
    await requireBooking(bookingId);

    const notifications = await notificationRepository.findManyByBookingId(
      bookingId,
    );

    return notifications
      .map((notification) => mapNotification(notification))
      .filter((notification): notification is Notification => Boolean(notification));
  },

  async listByRecipientEmail(recipientEmail: string): Promise<Notification[]> {
    const notifications =
      await notificationRepository.findManyByRecipientEmail(recipientEmail);

    return notifications
      .map((notification) => mapNotification(notification))
      .filter((notification): notification is Notification => Boolean(notification));
  },

  async listPending(): Promise<Notification[]> {
    const notifications = await notificationRepository.findPending();

    return notifications
      .map((notification) => mapNotification(notification))
      .filter((notification): notification is Notification => Boolean(notification));
  },

  async listFailed(): Promise<Notification[]> {
    const notifications = await notificationRepository.findFailed();

    return notifications
      .map((notification) => mapNotification(notification))
      .filter((notification): notification is Notification => Boolean(notification));
  },

  async create(input: CreateNotificationInput): Promise<Notification> {
    await requireBooking(input.bookingId);

    const created = await notificationRepository.create({
      booking: {
        connect: {
          id: input.bookingId,
        },
      },
      recipientType: input.recipientType,
      recipientEmail: input.recipientEmail,
      type: input.type,
      deliveryStatus: input.deliveryStatus ?? "PENDING",
      providerMessageId: input.providerMessageId ?? null,
      errorMessage: input.errorMessage ?? null,
      sentAt: input.sentAt ?? null,
    });

    return mapNotification(created)!;
  },

  async update(
    notificationId: string,
    input: UpdateNotificationInput,
  ): Promise<Notification> {
    const existing = await notificationRepository.findById(notificationId);

    if (!existing) {
      throw new Error("Notification not found.");
    }

    const updated = await notificationRepository.updateById(notificationId, {
      ...(input.deliveryStatus !== undefined
        ? { deliveryStatus: input.deliveryStatus }
        : {}),
      ...(input.providerMessageId !== undefined
        ? { providerMessageId: input.providerMessageId ?? null }
        : {}),
      ...(input.errorMessage !== undefined
        ? { errorMessage: input.errorMessage ?? null }
        : {}),
      ...(input.sentAt !== undefined ? { sentAt: input.sentAt ?? null } : {}),
    });

    return mapNotification(updated)!;
  },

  async markSent(params: {
    notificationId: string;
    providerMessageId?: string | null;
    sentAt?: Date;
  }): Promise<Notification> {
    const existing = await notificationRepository.findById(params.notificationId);

    if (!existing) {
      throw new Error("Notification not found.");
    }

    const updated = await notificationRepository.markSent({
      id: params.notificationId,
      providerMessageId:
        params.providerMessageId ?? `msg_${generateRandomToken(8)}`,
      sentAt: params.sentAt ?? new Date(),
    });

    return mapNotification(updated)!;
  },

  async markFailed(params: {
    notificationId: string;
    errorMessage?: string | null;
    providerMessageId?: string | null;
  }): Promise<Notification> {
    const existing = await notificationRepository.findById(params.notificationId);

    if (!existing) {
      throw new Error("Notification not found.");
    }

    const updated = await notificationRepository.markFailed({
      id: params.notificationId,
      errorMessage: params.errorMessage ?? "Notification delivery failed.",
      providerMessageId: params.providerMessageId ?? null,
    });

    return mapNotification(updated)!;
  },

  async resetToPending(notificationId: string): Promise<Notification> {
    const existing = await notificationRepository.findById(notificationId);

    if (!existing) {
      throw new Error("Notification not found.");
    }

    const updated = await notificationRepository.resetToPending(notificationId);
    return mapNotification(updated)!;
  },

  async queueBookingConfirmedNotifications(
    input: SendBookingConfirmedNotificationInput,
  ): Promise<Notification[]> {
    await requireBooking(input.bookingId);

    await notificationRepository.createManyForBooking(input.bookingId, [
      {
        recipientType: "CLIENT",
        recipientEmail: input.clientEmail,
        type: "BOOKING_CONFIRMED",
        deliveryStatus: "PENDING",
        providerMessageId: null,
        errorMessage: null,
        sentAt: null,
      },
      {
        recipientType: "PROFESSIONAL",
        recipientEmail: input.professionalEmail,
        type: "BOOKING_CONFIRMED",
        deliveryStatus: "PENDING",
        providerMessageId: null,
        errorMessage: null,
        sentAt: null,
      },
    ]);

    return this.listByBookingId(input.bookingId);
  },

  async queueEventCreatedNotifications(
    input: SendEventCreatedNotificationInput,
  ): Promise<Notification[]> {
    await requireBooking(input.bookingId);

    await notificationRepository.createManyForBooking(input.bookingId, [
      {
        recipientType: "CLIENT",
        recipientEmail: input.clientEmail,
        type: "EVENT_CREATED",
        deliveryStatus: "PENDING",
        providerMessageId: null,
        errorMessage: null,
        sentAt: null,
      },
      {
        recipientType: "PROFESSIONAL",
        recipientEmail: input.professionalEmail,
        type: "EVENT_CREATED",
        deliveryStatus: "PENDING",
        providerMessageId: null,
        errorMessage: null,
        sentAt: null,
      },
    ]);

    return this.listByBookingId(input.bookingId);
  },

  async queueEventCreationFailedNotification(
    input: SendEventCreationFailedNotificationInput,
  ): Promise<Notification> {
    await requireBooking(input.bookingId);

    const created = await notificationRepository.createForBooking(
      input.bookingId,
      {
        recipientType: "PROFESSIONAL",
        recipientEmail: input.professionalEmail,
        type: "EVENT_CREATION_FAILED",
        deliveryStatus: "PENDING",
        providerMessageId: null,
        errorMessage: input.errorMessage ?? null,
        sentAt: null,
      },
    );

    return mapNotification(created)!;
  },

  async queueBookingCancelledNotifications(
    input: SendBookingCancelledNotificationInput,
  ): Promise<Notification[]> {
    await requireBooking(input.bookingId);

    await notificationRepository.createManyForBooking(input.bookingId, [
      {
        recipientType: "CLIENT",
        recipientEmail: input.clientEmail,
        type: "BOOKING_CANCELLED",
        deliveryStatus: "PENDING",
        providerMessageId: null,
        errorMessage: null,
        sentAt: null,
      },
      {
        recipientType: "PROFESSIONAL",
        recipientEmail: input.professionalEmail,
        type: "BOOKING_CANCELLED",
        deliveryStatus: "PENDING",
        providerMessageId: null,
        errorMessage: null,
        sentAt: null,
      },
    ]);

    return this.listByBookingId(input.bookingId);
  },

  async markBookingNotificationsAsSent(
    bookingId: string,
    type: Notification["type"],
  ): Promise<Notification[]> {
    const notifications = await notificationRepository.findManyByBookingId(
      bookingId,
    );

    const targetNotifications = notifications.filter(
      (notification) => notification.type === type,
    );

    const updated: Notification[] = [];

    for (const notification of targetNotifications) {
      const sent = await notificationRepository.markSent({
        id: notification.id,
        providerMessageId: `msg_${generateRandomToken(8)}`,
        sentAt: new Date(),
      });

      updated.push(mapNotification(sent)!);
    }

    return updated;
  },

  async markBookingNotificationsAsFailed(params: {
    bookingId: string;
    type: Notification["type"];
    errorMessage?: string | null;
  }): Promise<Notification[]> {
    const notifications = await notificationRepository.findManyByBookingId(
      params.bookingId,
    );

    const targetNotifications = notifications.filter(
      (notification) => notification.type === params.type,
    );

    const updated: Notification[] = [];

    for (const notification of targetNotifications) {
      const failed = await notificationRepository.markFailed({
        id: notification.id,
        errorMessage: params.errorMessage ?? "Notification delivery failed.",
      });

      updated.push(mapNotification(failed)!);
    }

    return updated;
  },

  async simulateDelivery(notificationId: string): Promise<NotificationDeliveryResult> {
    const existing = await notificationRepository.findById(notificationId);

    if (!existing) {
      throw new Error("Notification not found.");
    }

    await notificationRepository.markSent({
      id: notificationId,
      providerMessageId: `msg_${generateRandomToken(8)}`,
      sentAt: new Date(),
    });

    return {
      success: true,
      providerMessageId: `msg_${generateRandomToken(8)}`,
      errorMessage: null,
    };
  },

  async getSummary(): Promise<NotificationSummary> {
  const pending = await notificationRepository.countPending();
  const failed = await notificationRepository.countFailed();

  const pendingNotifications = await notificationRepository.findPending();
  const failedNotifications = await notificationRepository.findFailed();
  const sentCandidates = await Promise.all(
    [
      ...pendingNotifications,
      ...failedNotifications,
    ].map(() => Promise.resolve(null)),
  );

  void sentCandidates;

  const totalKnownPendingAndFailed = pending + failed;

  return {
    total: totalKnownPendingAndFailed,
    pending,
    sent: 0,
    failed,
  };
}