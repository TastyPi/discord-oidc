import { afterEach, beforeEach, describe, it } from "node:test";
import type { Config } from "./schemas/config.js";
import * as assert from "node:assert";
import { createProvider } from "./createProvider.js";
import * as oidc from "oidc-provider";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const validConfig: Config = {
  url: "http://localhost:3000",
  clients: [],
};

describe("createProvider", () => {
  it("does not allow extra value in config", () => {
    let config = { ...validConfig, extraValue: true };

    assert.throws(() => createProvider(config));
  });

  describe("when listening", () => {
    let provider: oidc.Provider;
    let server: Server;
    let address: string;

    beforeEach((ctx, done) => {
      provider = createProvider(validConfig);
      server = provider.listen(() => {
        address = `http://localhost:${(server.address() as AddressInfo).port}`;
        done();
      });
    });

    afterEach((ctx, done) => {
      server.close(done);
    });

    it("responds to /.well-known/openid-configuration", async () => {
      const response = await fetch(
        `${address}/.well-known/openid-configuration`,
      );

      assert.equal(response.status, 200);
    });
  });
});
