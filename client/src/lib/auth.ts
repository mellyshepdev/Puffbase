import { useQuery } from "@tanstack/react-query";

export type AuthUser = { sub: string; email?: string; name?: string };

export function useAuth() {
  const query = useQuery<{ user: AuthUser | null; isAdmin: boolean }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  return {
    user: query.data?.user ?? null,
    isAdmin: query.data?.isAdmin ?? false,
    isLoading: query.isLoading,
  };
}

/** Full-page navigations, not SPA routes - these have to leave the app for
 *  Keycloak's login/logout pages, so a client-side router link is wrong here. */
export const loginUrl = "/api/auth/login";
export const logoutUrl = "/api/auth/logout";
