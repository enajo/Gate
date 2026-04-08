"use client";

import * as React from "react";
import { useSession } from "next-auth/react";

export type CurrentUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function useCurrentUser() {
  const { data, status, update } = useSession();

  const user = React.useMemo<CurrentUser | null>(() => {
    if (!data?.user) {
      return null;
    }

    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      image: data.user.image,
    };
  }, [data?.user]);

  return {
    user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
    refreshSession: update,
  };
}