import { Type } from "typebox";
import { readFile } from "node:fs/promises";

const ClientConfig = Type.Union(
  [
    Type.Object(
      {
        client_id: Type.String(),
        client_secret: Type.String(),
        redirect_uris: Type.Array(Type.String(), { minItems: 1 }),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        client_id: Type.String(),
        client_secret_file: Type.String(),
        redirect_uris: Type.Array(Type.String(), { minItems: 1 }),
      },
      { additionalProperties: false },
    ),
  ],
);
export type ClientConfig = Type.Static<typeof ClientConfig>;

const DiscordConfig = Type.Union(
  [
    Type.Object(
      {
        client_id: Type.String(),
        client_secret: Type.String(),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        client_id: Type.String(),
        client_secret_file: Type.String(),
      },
      { additionalProperties: false },
    ),
  ],
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

// Normalized types with secrets loaded
export interface NormalizedClientConfig {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  // Index signature required by oidc-provider's ClientMetadata type
  [key: string]: unknown;
}

export interface NormalizedDiscordConfig {
  client_id: string;
  client_secret: string;
}

export interface NormalizedConfig {
  clients: NormalizedClientConfig[];
  discord: NormalizedDiscordConfig;
  url: string;
}

// Helper function to load secret from file if needed
async function loadSecret(
  config: { client_secret?: string; client_secret_file?: string },
): Promise<string> {
  if ("client_secret" in config && config.client_secret !== undefined) {
    return config.client_secret;
  }
  if ("client_secret_file" in config && config.client_secret_file !== undefined) {
    const secretContent = await readFile(config.client_secret_file, "utf-8");
    return secretContent.trim();
  }
  // This should never be reached due to the union type validation,
  // but is here for exhaustiveness checking and type safety
  throw new Error("Neither client_secret nor client_secret_file provided");
}

// Normalize the config by loading secrets from files
export async function normalizeConfig(config: Config): Promise<NormalizedConfig> {
  const normalizedClients = await Promise.all(
    config.clients.map(async (client) => ({
      client_id: client.client_id,
      client_secret: await loadSecret(client),
      redirect_uris: client.redirect_uris,
    })),
  );

  const normalizedDiscord = {
    client_id: config.discord.client_id,
    client_secret: await loadSecret(config.discord),
  };

  return {
    clients: normalizedClients,
    discord: normalizedDiscord,
    url: config.url,
  };
}
