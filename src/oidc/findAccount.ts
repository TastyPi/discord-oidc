import type * as oidc from "oidc-provider";
import type { DiscordAccessTokens } from "../DiscordAccessTokens.js";
import { resolveClaims } from "./claims.js";

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
        const newClaims = accessToken
          ? await resolveClaims(scope, accessToken)
          : {};
        return { ...newClaims, sub };
      },
    } satisfies oidc.Account;
  };
}
