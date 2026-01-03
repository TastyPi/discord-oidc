import type { JsonValue } from "oidc-provider";
import * as oidc from "oidc-provider";
import type { APIUser } from "discord-api-types/v10";

export const claims = {
  groups: ["groups"],
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
  async groups(discordAccessToken: string) {
    const guilds: { id: string }[] = await discord(
      "/api/v10/users/@me/guilds",
      discordAccessToken,
    );
    return { groups: guilds.map((guild) => guild.id) };
  },
  async profile(discordAccessToken) {
    const user: APIUser = await discord(
      "/api/v10/users/@me",
      discordAccessToken,
    );
    return {
      locale: user.locale,
      nickname: user.global_name,
      picture: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`
        : undefined,
      preferred_username: user.username,
    };
  },
};

async function discord(path: string, accessToken: string) {
  let url = new URL(path, `https://discord.com`);
  let response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    switch (response.status) {
      case 429: {
        const retryAfter = parseInt(response.headers.get("Retry-After")!);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return discord(path, accessToken);
      }
    }
    throw await DiscordError.fromResponse(response);
  }
  return await response.json();
}

class DiscordError extends Error {
  static async fromResponse(response: Response, options?: ErrorOptions) {
    return new DiscordError(
      `${response.url}: ${response.status} ${response.statusText}`,
      await response.text(),
      options,
    );
  }

  private constructor(
    message: string,
    public readonly body: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
