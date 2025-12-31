import { type ClientConfig, Config } from "./schemas/config.js";
import * as oidc from "oidc-provider";
import { Value } from "typebox/value";
import Koa from "koa";
import mount from "koa-mount";
import Router from "@koa/router";
import * as path from "node:path";

export function createApp(config: Config): Koa {
  Value.Assert(Config, config);
  const provider = new oidc.Provider(config.url, oidcConfig(config));
  const router = new Router();
  router.get("/interaction/:uid", async (ctx) => {
    const details = await provider.interactionDetails(ctx.req, ctx.res);
    ctx.redirect(discordAuthorizeURL(config, details.uid));
  });

  const app = new Koa();
  app.use(router.routes());
  app.use(mount(provider));
  return app;
}

function oidcConfig(config: Config): oidc.Configuration {
  return {
    clients: config.clients.map(enhanceClient),
  };
}

function enhanceClient(client: ClientConfig): oidc.ClientMetadata {
  return {
    grant_types: ["authorization_code"],
    response_types: ["code"],
    ...client,
  };
}

function discordAuthorizeURL(config: Config, state: string): string {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", config.discord.client_id);
  url.searchParams.set("redirect_uri", discordRedirectURI(config));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);
  return url.toString();
}

function discordRedirectURI(config: Config): string {
  const url = new URL(config.url);
  url.pathname = path.join(url.pathname, "discord/callback");
  return url.toString();
}
