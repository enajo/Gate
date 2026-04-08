import "server-only";

import type { Prisma, User, UserRole } from "@prisma/client";
import { db } from "@/lib/db";

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    });
  },

  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { email },
    });
  },

  async findByIdWithProfessional(id: string) {
    return db.user.findUnique({
      where: { id },
      include: {
        professional: true,
      },
    });
  },

  async findByEmailWithProfessional(email: string) {
    return db.user.findUnique({
      where: { email },
      include: {
        professional: true,
      },
    });
  },

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return db.user.create({
      data,
    });
  },

  async createFromAuth(params: {
    email: string;
    name?: string | null;
    image?: string | null;
    role?: UserRole;
    emailVerified?: Date | null;
  }): Promise<User> {
    return db.user.create({
      data: {
        email: params.email,
        name: params.name ?? null,
        image: params.image ?? null,
        role: params.role ?? "USER",
        emailVerified: params.emailVerified ?? null,
      },
    });
  },

  async ensureUser(params: {
    email: string;
    name?: string | null;
    image?: string | null;
    role?: UserRole;
    emailVerified?: Date | null;
  }): Promise<User> {
    return db.user.upsert({
      where: { email: params.email },
      update: {
        name: params.name ?? undefined,
        image: params.image ?? undefined,
        emailVerified: params.emailVerified ?? undefined,
      },
      create: {
        email: params.email,
        name: params.name ?? null,
        image: params.image ?? null,
        role: params.role ?? "USER",
        emailVerified: params.emailVerified ?? null,
      },
    });
  },

  async updateById(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return db.user.update({
      where: { id },
      data,
    });
  },

  async updateRole(id: string, role: UserRole): Promise<User> {
    return db.user.update({
      where: { id },
      data: { role },
    });
  },

  async markEmailVerified(id: string, date = new Date()): Promise<User> {
    return db.user.update({
      where: { id },
      data: {
        emailVerified: date,
      },
    });
  },

  async listAdmins(): Promise<User[]> {
    return db.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    });
  },

  async deleteById(id: string): Promise<User> {
    return db.user.delete({
      where: { id },
    });
  },
};