import { Config } from "./schemas/config.js";
import * as oidc from "oidc-provider";
import { Value } from "typebox/value";
import Koa from "koa";
import mount from "koa-mount";
import Router from "@koa/router";
import * as path from "node:path";
import { profileClaims } from "./claims/profile.js";

export function createApp(config: Config): Koa {
  Value.Assert(Config, config);
  const provider = new oidc.Provider(config.url, oidcConfig(config));
  provider.proxy = true;
  const router = new Router();
  router.get("/interaction/:uid", async (ctx) => {
    const details = await provider.interactionDetails(ctx.req, ctx.res);
    switch (details.prompt.name) {
      case "login":
        ctx.status = 303;
        ctx.redirect(discordAuthorizeURL(config, details.uid));
        return;
      case "consent":
        const grant = new provider.Grant({
          accountId: details.session?.accountId,
          clientId: details.params.client_id as string,
        });
        for (const scope of (details.prompt.details.missingOIDCScope as
          | string[]
          | undefined) ?? []) {
          switch (scope) {
            case "openid":
              grant.addOIDCScope(scope);
              break;
          }
        }
        await provider.interactionFinished(
          ctx.req,
          ctx.res,
          { consent: { grantId: await grant.save() } },
          { mergeWithLastSubmission: true },
        );
    }
  });
  router.get("/discord/callback", async (ctx) => {
    const code = ctx.query.code;
    const state = ctx.query.state;
    if (typeof code !== "string" || typeof state !== "string") {
      ctx.status = 400;
      ctx.body = typeof code !== "string" ? "code_invalid" : "state_invalid";
      return;
    }

    // The cookie we need is restricted to the /interaction/:uid path, redirect
    // there and carry on
    ctx.status = 303;
    ctx.redirect(
      `/interaction/${state}/callback?${new URLSearchParams({ code }).toString()}`,
    );
  });
  router.get("/interaction/:uid/callback", async (ctx) => {
    const code = ctx.query.code;
    if (typeof code !== "string") {
      console.error("code not found");
      ctx.status = 400;
      ctx.body = "code_invalid";
      return;
    }

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.discord.client_id,
        client_secret: config.discord.client_secret,
        code,
        grant_type: "authorization_code",
        redirect_uri: discordRedirectURI(config),
      }),
    });
    if (!tokenResponse.ok) {
      ctx.status = 502;
      ctx.body = `Discord token exchange failed: ${await tokenResponse.text()}`;
      return;
    }
    const token: { access_token: string } = await tokenResponse.json();

    const meResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!meResponse.ok) {
      ctx.status = 502;
      ctx.body = `Discord user lookup failed: ${await meResponse.text()}`;
      return;
    }
    const me = await meResponse.json();
    console.log(me);

    await provider.interactionFinished(
      ctx.req,
      ctx.res,
      { login: { accountId: me.id } },
      { mergeWithLastSubmission: false },
    );
    // interactionFinished wrote to ctx.res directly
  });

  provider.on("grant.error", (ctx, err) => console.log(err.error_detail));

  const app = new Koa();
  app.proxy = true;
  app.use(router.routes());
  app.use(mount(provider));
  return app;
}

function oidcConfig(config: Config): oidc.Configuration {
  return {
    // https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/74290
    claims: { profile: profileClaims as unknown as string[] },
    clients: config.clients,
    scopes: ["openid", "profile"],
    async findAccount(ctx, sub): Promise<oidc.Account> {
      return {
        accountId: sub,
        async claims() {
          return { sub };
        },
      };
    },
  };
}

function discordAuthorizeURL(config: Config, state: string): string {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", config.discord.client_id);
  url.searchParams.set("redirect_uri", discordRedirectURI(config));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid identify");
  url.searchParams.set("state", state);
  return url.toString();
}

function discordRedirectURI(config: Config): string {
  const url = new URL(config.url);
  url.pathname = path.join(url.pathname, "discord/callback");
  return url.toString();
}
