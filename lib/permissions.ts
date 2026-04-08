import type { Session } from "next-auth";

type SessionUser = Session["user"] & {
  role?: string;
};

function getSessionUser(session: Session | null | undefined): SessionUser | null {
  return session?.user ? (session.user as SessionUser) : null;
}

export function isAuthenticated(
  session: Session | null | undefined,
): session is Session {
  return Boolean(session?.user?.id);
}

export function isAdmin(session: Session | null | undefined): boolean {
  const user = getSessionUser(session);
  return user?.role === "ADMIN";
}

export function isOwner(
  session: Session | null | undefined,
  ownerUserId: string | null | undefined,
): boolean {
  const user = getSessionUser(session);

  if (!user?.id || !ownerUserId) {
    return false;
  }

  return user.id === ownerUserId;
}

export function canAccessOwnResource(
  session: Session | null | undefined,
  ownerUserId: string | null | undefined,
): boolean {
  if (!isAuthenticated(session)) {
    return false;
  }

  if (isAdmin(session)) {
    return true;
  }

  return isOwner(session, ownerUserId);
}

export function assertAuthenticated(
  session: Session | null | undefined,
): asserts session is Session {
  if (!isAuthenticated(session)) {
    throw new Error("Unauthorized");
  }
}

export function assertAdmin(session: Session | null | undefined): void {
  if (!isAdmin(session)) {
    throw new Error("Forbidden");
  }
}

export function assertCanAccessOwnResource(
  session: Session | null | undefined,
  ownerUserId: string | null | undefined,
): void {
  if (!canAccessOwnResource(session, ownerUserId)) {
    throw new Error("Forbidden");
  }
}