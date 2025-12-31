import { describe, it } from "node:test";
import * as assert from "node:assert";
import { type ClientConfig, Config } from "./config.js";
import { Value } from "typebox/value";

const validClient: ClientConfig = {
  client_id: "client_id",
  client_secret: "client_secret",
  redirect_uris: ["redirect_uri"],
};
const validConfig: Config = {
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
});
