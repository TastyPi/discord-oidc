import type { APIUser } from "discord-api-types/v10";

export const profileClaims = [
  "locale",
  "nickname",
  "picture",
  "preferred_username",
] as const;

export type ProfileClaims = Record<
  (typeof profileClaims)[number],
  string | undefined
>;

export async function getProfileClaims(
  accessToken: string,
): Promise<ProfileClaims> {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const me: APIUser = await response.json();
  return {
    locale: me.locale,
    nickname: me.global_name ?? undefined,
    picture: me.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}`
      : undefined,
    preferred_username: me.username,
  };
}
