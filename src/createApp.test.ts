import { afterEach, beforeEach, describe, it } from "node:test";
import type { ClientConfig, Config } from "./schemas/config.js";
import * as assert from "node:assert";
import { createApp } from "./createApp.js";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import Koa from "koa";
import makeFetchCookie from "fetch-cookie";

const validClientConfig: ClientConfig = {
  client_id: "client_id",
  client_secret: "client_secret",
  redirect_uris: ["https://client.fake"],
};

const validConfig: Config = {
  clients: [validClientConfig],
  discord: {
    client_id: "discord_client_id",
    client_secret: "discord_client_secret",
  },
  url: "http://localhost",
};

describe("createApp", () => {
  it("does not allow extra value in config", () => {
    let config = { ...validConfig, extraValue: true };

    assert.throws(() => createApp(config));
  });

  describe("when listening", () => {
    let app: Koa;
    let server: Server;
    let address: string;

    beforeEach((ctx, done) => {
      app = createApp(validConfig);
      server = app.listen(() => {
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

    describe("/auth", () => {
      it("redirects to /interaction/:uid when there's no session", async () => {
        const response = await fetch(
          `${address}/auth?client_id=${validClientConfig.client_id}&response_type=code`,
          { redirect: "manual" },
        );

        assert.equal(response.status, 303, await response.text());
        assert.match(
          response.headers.get("location")!,
          /\/interaction\/[^\/?#]+/,
        );
      });

      describe("following /interaction/:uid", () => {
        let fetchCookie: ReturnType<
          typeof makeFetchCookie<
            Parameters<typeof fetch>[0],
            Exclude<Parameters<typeof fetch>[1], undefined>,
            Awaited<ReturnType<typeof fetch>>
          >
        >;

        beforeEach(() => {
          fetchCookie = makeFetchCookie(fetch);
        });

        it("redirects to Discord", async () => {
          const authResponse = await fetchCookie(
            `${address}/auth?client_id=${validClientConfig.client_id}&response_type=code`,
            { redirect: "manual" },
          );
          const uid = /\/interaction\/([^\/?#]+)/.exec(
            authResponse.headers.get("location")!,
          )![1];
          const interactionResponse = await fetchCookie(
            `${address}${authResponse.headers.get("location")}`,
            { redirect: "manual" },
          );

          assert.equal(interactionResponse.status, 302);
          assert.equal(
            interactionResponse.headers.get("location")!,
            `https://discord.com/oauth2/authorize` +
              `?client_id=${validConfig.discord.client_id}` +
              `&redirect_uri=${encodeURIComponent(`${validConfig.url}/discord/callback`)}` +
              `&response_type=code&scope=identify` +
              `&state=${uid}`,
          );
        });
      });
    });
  });
});
