import "server-only";

import type { Notification, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const notificationRepository = {
  async findById(id: string): Promise<Notification | null> {
    return db.notification.findUnique({
      where: { id },
    });
  },

  async findManyByBookingId(bookingId: string): Promise<Notification[]> {
    return db.notification.findMany({
      where: { bookingId },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async findManyByRecipientEmail(
    recipientEmail: string,
  ): Promise<Notification[]> {
    return db.notification.findMany({
      where: { recipientEmail },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  async findPending(): Promise<Notification[]> {
    return db.notification.findMany({
      where: {
        deliveryStatus: "PENDING",
      },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async findFailed(): Promise<Notification[]> {
    return db.notification.findMany({
      where: {
        deliveryStatus: "FAILED",
      },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return db.notification.create({
      data,
    });
  },

  async createForBooking(
    bookingId: string,
    data: Omit<Prisma.NotificationUncheckedCreateInput, "bookingId">,
  ): Promise<Notification> {
    return db.notification.create({
      data: {
        bookingId,
        ...data,
      },
    });
  },

  async createManyForBooking(
    bookingId: string,
    notifications: Omit<Prisma.NotificationUncheckedCreateInput, "bookingId">[],
  ): Promise<Prisma.BatchPayload> {
    if (notifications.length === 0) {
      return { count: 0 };
    }

    return db.notification.createMany({
      data: notifications.map((notification) => ({
        bookingId,
        ...notification,
      })),
    });
  },

  async updateById(
    id: string,
    data: Prisma.NotificationUpdateInput,
  ): Promise<Notification> {
    return db.notification.update({
      where: { id },
      data,
    });
  },

  async markSent(params: {
    id: string;
    providerMessageId?: string | null;
    sentAt?: Date;
  }): Promise<Notification> {
    return db.notification.update({
      where: { id: params.id },
      data: {
        deliveryStatus: "SENT",
        providerMessageId: params.providerMessageId ?? null,
        errorMessage: null,
        sentAt: params.sentAt ?? new Date(),
      },
    });
  },

  async markFailed(params: {
    id: string;
    errorMessage?: string | null;
    providerMessageId?: string | null;
  }): Promise<Notification> {
    return db.notification.update({
      where: { id: params.id },
      data: {
        deliveryStatus: "FAILED",
        errorMessage: params.errorMessage ?? "Notification delivery failed.",
        providerMessageId: params.providerMessageId ?? null,
      },
    });
  },

  async resetToPending(id: string): Promise<Notification> {
    return db.notification.update({
      where: { id },
      data: {
        deliveryStatus: "PENDING",
        errorMessage: null,
        sentAt: null,
      },
    });
  },

  async deleteById(id: string): Promise<Notification> {
    return db.notification.delete({
      where: { id },
    });
  },

  async countByBookingId(bookingId: string): Promise<number> {
    return db.notification.count({
      where: { bookingId },
    });
  },

  async countPending(): Promise<number> {
    return db.notification.count({
      where: {
        deliveryStatus: "PENDING",
      },
    });
  },

  async countFailed(): Promise<number> {
    return db.notification.count({
      where: {
        deliveryStatus: "FAILED",
      },
    });
  },
};