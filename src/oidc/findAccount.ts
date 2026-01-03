import type * as oidc from "oidc-provider";
import type { Promisable } from "type-fest";
import type { DiscordAccessTokens } from "../DiscordAccessTokens.js";
import { isScope, type Scope } from "./scopes.js";
import { getProfileClaims } from "../claims/profile.js";

export type FindAccountOptions = {
  discordAccessTokens: DiscordAccessTokens;
};

export function createFindAccount({
  discordAccessTokens,
}: FindAccountOptions): oidc.FindAccount {
  return async (ctx, sub) => {
    return {
      accountId: sub,
      async claims(use: string, scope: string) {
        const accessToken = await discordAccessTokens.get(sub);
        if (!accessToken) return { sub };
        const claims = await Promise.all(
          scope.split(" ").map((scope) => {
            return isScope(scope) ? resolveClaim[scope](accessToken) : {};
          }),
        );
        return claims.reduce<oidc.AccountClaims>(
          (c1, c2) => ({ ...c1, ...c2 }),
          { sub },
        );
      },
    } satisfies oidc.Account;
  };
}

type ClaimResolver = (
  accessToken: string,
) => Promisable<Record<string, string | undefined>>;

const resolveClaim: Record<Scope, ClaimResolver> = {
  openid: () => ({}),
  profile: getProfileClaims,
};
