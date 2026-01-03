import type { JsonValue } from "oidc-provider";
import * as oidc from "oidc-provider";
import type { APIUser } from "discord-api-types/v10";

export const claims = {
  profile: ["locale", "nickname", "picture", "preferred_username"],
} as const satisfies oidc.Configuration["claims"];

export async function resolveClaims(scope: string, discordAccessToken: string) {
  const claims = await Promise.all(
    scope
      .split(" ")
      .filter(isScope)
      .map((scope) => claimResolvers[scope](discordAccessToken)),
  );
  return claims.reduce((c1, c2) => ({ ...c1, ...c2 }), {});
}

function isScope(scope: string): scope is keyof typeof claims {
  return scope in claims;
}

type Claims<Scope extends keyof typeof claims> = Record<
  (typeof claims)[Scope][number],
  JsonValue | undefined
>;

type ClaimsResolver<Scope extends keyof typeof claims> = (
  discordAccessToken: string,
) => Promise<Claims<Scope>>;

const claimResolvers: {
  [Scope in keyof typeof claims]: ClaimsResolver<Scope>;
} = {
  async profile(discordAccessToken) {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { authorization: `Bearer ${discordAccessToken}` },
    });
    if (!response.ok) throw await DiscordError.fromResponse(response);
    const user: APIUser = await response.json();
    return {
      locale: user.locale,
      nickname: user.global_name,
      picture: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`
        : undefined,
      preferred_username: user.username,
    } satisfies Claims<"profile">;
  },
};

class DiscordError extends Error {
  private constructor(
    message: string,
    public readonly body: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }

  static async fromResponse(response: Response, options?: ErrorOptions) {
    return new DiscordError(
      `Error calling Discord API: ${response.status} ${response.statusText}`,
      await response.text(),
      options,
    );
  }
}
