import { describe, it } from "node:test";
import * as assert from "node:assert";
import {
  type ClientConfig,
  Config,
  type Config as ConfigType,
  normalizeConfig,
} from "./config.js";
import { Value } from "typebox/value";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const validClient: ClientConfig = {
  client_id: "client_id",
  client_secret: "client_secret",
  redirect_uris: ["redirect_uri"],
};
const validConfig: ConfigType = {
  url: "http://localhost:3000/",
  clients: [validClient],
  discord: {
    client_id: "discord_client_id",
    client_secret: "discord_client_secret",
  },
};

describe("Config", () => {
  it("does not allow extra values", async () => {
    assert.throws(() =>
      Value.Assert(Config, { ...validConfig, extraValue: true }),
    );
  });

  it("does not allow extra values in clients", async () => {
    assert.throws(() =>
      Value.Assert(Config, {
        ...validConfig,
        clients: [{ ...validClient, extraValue: true }],
      }),
    );
  });

  it("allows client_secret_file instead of client_secret", async () => {
    const configWithFile: ConfigType = {
      url: "http://localhost:3000/",
      clients: [
        {
          client_id: "client_id",
          client_secret_file: "/path/to/secret",
          redirect_uris: ["redirect_uri"],
        },
      ],
      discord: {
        client_id: "discord_client_id",
        client_secret: "discord_client_secret",
      },
    };
    assert.doesNotThrow(() => Value.Assert(Config, configWithFile));
  });

  it("allows discord client_secret_file instead of client_secret", async () => {
    const configWithFile: ConfigType = {
      url: "http://localhost:3000/",
      clients: [validClient],
      discord: {
        client_id: "discord_client_id",
        client_secret_file: "/path/to/discord/secret",
      },
    };
    assert.doesNotThrow(() => Value.Assert(Config, configWithFile));
  });

  it("does not allow both client_secret and client_secret_file in clients", async () => {
    const configWithBoth = {
      url: "http://localhost:3000/",
      clients: [
        {
          client_id: "client_id",
          client_secret: "client_secret",
          client_secret_file: "/path/to/secret",
          redirect_uris: ["redirect_uri"],
        },
      ],
      discord: {
        client_id: "discord_client_id",
        client_secret: "discord_client_secret",
      },
    };
    assert.throws(() => Value.Assert(Config, configWithBoth));
  });

  it("does not allow both client_secret and client_secret_file in discord", async () => {
    const configWithBoth = {
      url: "http://localhost:3000/",
      clients: [validClient],
      discord: {
        client_id: "discord_client_id",
        client_secret: "discord_client_secret",
        client_secret_file: "/path/to/discord/secret",
      },
    };
    assert.throws(() => Value.Assert(Config, configWithBoth));
  });

  it("does not allow neither client_secret nor client_secret_file in clients", async () => {
    const configWithNeither = {
      url: "http://localhost:3000/",
      clients: [
        {
          client_id: "client_id",
          redirect_uris: ["redirect_uri"],
        },
      ],
      discord: {
        client_id: "discord_client_id",
        client_secret: "discord_client_secret",
      },
    };
    assert.throws(() => Value.Assert(Config, configWithNeither));
  });

  it("does not allow neither client_secret nor client_secret_file in discord", async () => {
    const configWithNeither = {
      url: "http://localhost:3000/",
      clients: [validClient],
      discord: {
        client_id: "discord_client_id",
      },
    };
    assert.throws(() => Value.Assert(Config, configWithNeither));
  });
});

describe("normalizeConfig", () => {
  const testDir = join(tmpdir(), "discord-oidc-test");

  it("preserves config with inline secrets", async () => {
    const normalized = await normalizeConfig(validConfig);
    assert.deepEqual(normalized, validConfig);
  });

  it("loads client secret from file", async () => {
    await mkdir(testDir, { recursive: true });
    const secretFile = join(testDir, "client-secret.txt");
    await writeFile(secretFile, "secret_from_file\n");

    const config: ConfigType = {
      url: "http://localhost:3000/",
      clients: [
        {
          client_id: "client_id",
          client_secret_file: secretFile,
          redirect_uris: ["redirect_uri"],
        },
      ],
      discord: {
        client_id: "discord_client_id",
        client_secret: "discord_client_secret",
      },
    };

    const normalized = await normalizeConfig(config);
    assert.equal(normalized.clients[0].client_secret, "secret_from_file");

    await rm(testDir, { recursive: true });
  });

  it("loads discord secret from file", async () => {
    await mkdir(testDir, { recursive: true });
    const secretFile = join(testDir, "discord-secret.txt");
    await writeFile(secretFile, "discord_secret_from_file\n");

    const config: ConfigType = {
      url: "http://localhost:3000/",
      clients: [validClient],
      discord: {
        client_id: "discord_client_id",
        client_secret_file: secretFile,
      },
    };

    const normalized = await normalizeConfig(config);
    assert.equal(normalized.discord.client_secret, "discord_secret_from_file");

    await rm(testDir, { recursive: true });
  });

  it("loads multiple secrets from files", async () => {
    await mkdir(testDir, { recursive: true });
    const clientSecretFile = join(testDir, "client-secret.txt");
    const discordSecretFile = join(testDir, "discord-secret.txt");
    await writeFile(clientSecretFile, "client_secret_from_file");
    await writeFile(discordSecretFile, "discord_secret_from_file");

    const config: ConfigType = {
      url: "http://localhost:3000/",
      clients: [
        {
          client_id: "client_id",
          client_secret_file: clientSecretFile,
          redirect_uris: ["redirect_uri"],
        },
      ],
      discord: {
        client_id: "discord_client_id",
        client_secret_file: discordSecretFile,
      },
    };

    const normalized = await normalizeConfig(config);
    assert.equal(normalized.clients[0].client_secret, "client_secret_from_file");
    assert.equal(normalized.discord.client_secret, "discord_secret_from_file");

    await rm(testDir, { recursive: true });
  });
});
