import { afterEach, beforeEach, describe, it } from "node:test";
import type { ClientConfig, Config } from "./schemas/config.js";
import * as assert from "node:assert";
import { createApp } from "./createApp.js";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import Koa from "koa";
import makeFetchCookie from "fetch-cookie";
import nock from "nock";

const client: ClientConfig = {
  client_id: "client_id",
  client_secret: "client_secret",
  redirect_uris: ["https://client.fake/oauth2/callback"],
};

const config: Config = {
  clients: [client],
  discord: {
    client_id: "discord_client_id",
    client_secret: "discord_client_secret",
  },
  url: "http://localhost",
};

describe("createApp", () => {
  it("does not allow extra value in config", () => {
    assert.throws(() => createApp({ ...config, extraValue: true } as Config));
  });

  describe("when listening", () => {
    let app: Koa;
    let server: Server;
    let address: string;

    beforeEach((ctx, done) => {
      app = createApp(config);
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

    it("can issue tokens", async () => {
      const fetchCookie = makeFetchCookie(fetch);

      const initialURL = new URL(address);
      initialURL.pathname = "/auth";
      initialURL.searchParams.set("client_id", client.client_id);
      initialURL.searchParams.set("response_type", "code");
      initialURL.searchParams.set("scope", "openid");
      const authResponse = await fetchCookie(initialURL.toString(), {
        redirect: "manual",
      });

      assert.equal(authResponse.status, 303, await authResponse.text());
      assert.match(authResponse.headers.get("location")!, /\/interaction/);
      const uid = /\/interaction\/([^\/?#]+)/.exec(
        authResponse.headers.get("location")!,
      )![1];

      const interactionResponse = await fetchCookie(
        new URL(authResponse.headers.get("location")!, address).toString(),
        {
          redirect: "manual",
        },
      );

      assert.equal(interactionResponse.status, 303);
      assert.equal(
        interactionResponse.headers.get("location")!,
        `https://discord.com/oauth2/authorize` +
          `?client_id=${config.discord.client_id}` +
          `&redirect_uri=${encodeURIComponent(`${config.url}/discord/callback`)}` +
          `&response_type=code&scope=openid+identify` +
          `&state=${uid}`,
      );

      // Pretend discord succeeded
      const discordCallbackURL = new URL(address);
      discordCallbackURL.pathname = "/discord/callback";
      discordCallbackURL.searchParams.set("code", "discord_code");
      discordCallbackURL.searchParams.set("state", uid);
      const discordCallbackResponse = await fetchCookie(
        discordCallbackURL.toString(),
        { redirect: "manual" },
      );

      assert.equal(discordCallbackResponse.status, 303);
      assert.equal(
        discordCallbackResponse.headers.get("location"),
        `/interaction/${uid}/callback?code=discord_code`,
      );

      nock("https://discord.com")
        .post("/api/oauth2/token")
        .reply(200, { access_token: "discord_access_token" })
        .get("/api/users/@me")
        .matchHeader("authorization", "Bearer discord_access_token")
        .reply(200, {
          id: "discord_user_id",
          username: "discord_username",
          avatar: "discord_avatar",
        });

      const interactionCallbackResponse = await fetchCookie(
        new URL(
          discordCallbackResponse.headers.get("location")!,
          address,
        ).toString(),
        { redirect: "manual" },
      );

      assert.equal(interactionCallbackResponse.status, 303);
      assert.equal(
        interactionCallbackResponse.headers.get("location"),
        new URL(`/auth/${uid}`, address).toString(),
      );

      const secondAuthResponse = await fetchCookie(
        interactionCallbackResponse.headers.get("location")!,
        { redirect: "manual" },
      );

      assert.equal(secondAuthResponse.status, 303);
      assert.match(
        secondAuthResponse.headers.get("location")!,
        /\/interaction/,
      );
      const secondUID = /\/interaction\/([^\/?#]+)/.exec(
        secondAuthResponse.headers.get("location")!,
      )![1];

      const secondInteractionResponse = await fetchCookie(
        new URL(
          secondAuthResponse.headers.get("location")!,
          address,
        ).toString(),
        { redirect: "manual" },
      );

      assert.equal(secondInteractionResponse.status, 303);
      assert.equal(
        secondInteractionResponse.headers.get("location"),
        new URL(`/auth/${secondUID}`, address).toString(),
      );

      const thirdAuthResponse = await fetchCookie(
        secondInteractionResponse.headers.get("location")!,
        { redirect: "manual" },
      );

      assert.equal(thirdAuthResponse.status, 303);
      const callbackURL = new URL(
        thirdAuthResponse.headers.get("location")!,
        address,
      );
      assert.equal(
        `${callbackURL.origin}${callbackURL.pathname}`,
        client.redirect_uris[0],
      );
      assert.equal(callbackURL.searchParams.get("iss"), config.url);
      const code = callbackURL.searchParams.get("code")!;
      assert.notEqual(code, null);
      assert.match(code, /^.+$/);

      let tokenURL = new URL("/token", address);
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: client.redirect_uris[0],
        client_id: client.client_id,
        client_secret: client.client_secret,
      });
      const tokenResponse = await fetchCookie(tokenURL, {
        method: "POST",
        body,
        redirect: "manual",
      });

      assert.equal(tokenResponse.status, 200);
      const token = await tokenResponse.json();
      assert.ok(token.access_token);
      assert.ok(token.id_token);
      assert.equal(token.scope, "openid");
      assert.equal(token.token_type, "Bearer");

      const [, payload] = token.id_token.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(payload, "base64url").toString(),
      );
      assert.equal(decodedPayload.sub, "discord_user_id");
      assert.equal(decodedPayload.iss, config.url);
      assert.equal(decodedPayload.aud, client.client_id);
      assert.ok(decodedPayload.iat <= Math.floor(Date.now() / 1000));
      assert.ok(decodedPayload.exp > Math.floor(Date.now() / 1000));
    });
  });
});
