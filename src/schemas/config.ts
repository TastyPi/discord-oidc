import { Type } from "typebox";

const ClientConfig = Type.Object(
  {
    client_id: Type.String(),
    client_secret: Type.String(),
    redirect_uris: Type.Array(Type.String(), { minItems: 1 }),
  },
  { additionalProperties: false },
);
export type ClientConfig = Type.Static<typeof ClientConfig>;

const DiscordConfig = Type.Object(
  {
    client_id: Type.String(),
    client_secret: Type.String(),
  },
  { additionalProperties: false },
);
export type DiscordConfig = Type.Static<typeof DiscordConfig>;

export const Config = Type.Object(
  {
    clients: Type.Array(ClientConfig),
    discord: DiscordConfig,
    url: Type.String(),
  },
  { additionalProperties: false },
);
export type Config = Type.Static<typeof Config>;
