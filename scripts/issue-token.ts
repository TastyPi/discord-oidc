import * as client from "openid-client";
import { readFile } from "node:fs/promises";
import * as YAML from "yaml";
import { Config } from "../src/schemas/config.js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { jwtDecode } from "jwt-decode";

const configRaw = await readFile("./config.yaml");
const discordConfig: Config = YAML.parse(configRaw.toString());

const config = await client.discovery(
  new URL("http://localhost:3000/.well-known/openid-configuration"),
  discordConfig.clients[0].client_id,
  discordConfig.clients[0].client_secret,
  undefined,
  { execute: [client.allowInsecureRequests] },
);

const authorizationURL = client.buildAuthorizationUrl(config, {
  scope: "openid",
});

console.log(authorizationURL.toString());
let code;
const rl = createInterface({ input, output });
try {
  code = await rl.question("Enter code: ");
} finally {
  rl.close();
}

const url = new URL(discordConfig.clients[0].redirect_uris[0]);
url.searchParams.set("code", code);
url.searchParams.set("iss", config.serverMetadata().issuer);
const token = await client.authorizationCodeGrant(config, url);

if (!token.id_token) {
  console.error("No id_token in token response");
  process.exit(1);
}

const jwt = jwtDecode(token.id_token);
console.log(jwt);
