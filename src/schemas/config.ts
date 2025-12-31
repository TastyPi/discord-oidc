import { Type } from "typebox";

export const ClientConfig = Type.Object(
  {
    client_id: Type.String(),
    client_secret: Type.String(),
    redirect_uris: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);
export type ClientConfig = Type.Static<typeof ClientConfig>;

export const Config = Type.Object(
  {
    clients: Type.Array(ClientConfig),
    url: Type.String(),
  },
  { additionalProperties: false },
);
export type Config = Type.Static<typeof Config>;
