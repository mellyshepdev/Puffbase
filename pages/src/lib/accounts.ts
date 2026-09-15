// Account helpers. One Keycloak user (userSub) owns a personal account plus
// zero or more business accounts; the active account id rides in the session
// cookie (SessionUser.accountId).
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { verify, sign, SESSION_COOKIE, SessionUser } from "@/lib/session";

export type Account = typeof accounts.$inferSelect;

export const SHEEP_AVATARS = Array.from({ length: 8 }, (_, i) => `sheep-${i + 1}`);

/** The signed-in Keycloak user, or null. Middleware already gates the
 *  routes, but route handlers still need the identity. */
export async function sessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return verify<SessionUser>(store.get(SESSION_COOKIE)?.value);
}

/** List the user's accounts, creating the personal one on first login. */
export async function getOrCreateAccounts(
  userSub: string,
  fallbackName: string,
): Promise<Account[]> {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userSub, userSub));
  if (rows.length > 0) return rows;
  const [personal] = await db
    .insert(accounts)
    .values({ userSub, kind: "personal", name: fallbackName || "Personal" })
    .returning();
  return [personal];
}

/** The account the user is currently acting as. Defaults to personal when
 *  the session has no accountId (pre-feature cookies) or it was deleted. */
export function activeAccount(list: Account[], session: SessionUser): Account {
  return (
    list.find((a) => a.id === session.accountId) ??
    list.find((a) => a.kind === "personal") ??
    list[0]
  );
}

/** Re-signs the session cookie with a different active account. */
export async function sessionWithAccount(
  session: SessionUser,
  accountId: string,
): Promise<string> {
  return sign({ ...session, accountId });
}

/** Route-handler helper: the signed-in user + their active account, or null. */
export async function currentAccount(): Promise<{
  user: SessionUser;
  account: Account;
} | null> {
  const user = await sessionUser();
  if (!user) return null;
  const list = await getOrCreateAccounts(user.sub, user.name ?? user.email ?? "Personal");
  return { user, account: activeAccount(list, user) };
}
