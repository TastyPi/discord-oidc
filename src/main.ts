import * as YAML from "yaml";
import { readFile } from "node:fs/promises";
import { createApp } from "./createApp.js";

function envOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} not set`);
  return value;
}

const configLocation = envOrThrow("DISCORD_OIDC_CONFIG");

const configRaw = await readFile(configLocation);
const config = YAML.parse(configRaw.toString());

const provider = createApp(config);
provider.listen(3000, () => {
  console.log(
    'listening on 3000, check http://localhost:3000/.well-known/openid-configuration",',
  );
});
