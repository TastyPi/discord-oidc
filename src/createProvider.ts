import { type ClientConfig, Config } from "./schemas/config.js";
import * as oidc from "oidc-provider";
import { Value } from "typebox/value";

export function createProvider(config: Config): oidc.Provider {
  Value.Assert(Config, config);
  return new oidc.Provider(config.url, enhanceConfig(config));
}

function enhanceConfig(config: Config): oidc.Configuration {
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
