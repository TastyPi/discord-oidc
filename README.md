# discord-oidc

An OpenID Connect authorization server for Discord. Initially intended to be used with `jellyfin-plugin-sso`, but should be usable with anything that supports OIDC.

## Usage

1. Create a Discord Application https://discord.com/developers/applications
1. Create a YAML config file based on [config.example.yaml]
2. Run the container, with `DISCORD_OIDC_CONFIG` set to the path where the config file is mounted

### Examples

#### Docker

Assuming you have a `discord-oidc.yaml` in the current directory:

```
docker run -p 3000:3000 -e DISCORD_OIDC=/config.yaml -v ./discord-oidc.yaml:/config.yaml:ro ghcr.io/tastypi/discord-oidc:latest
```

Then check http://localhost:3000/.well-known/openid-configuration to validate it is running

#### Quadlet

```
[Container]
AutoUpdate=registry
Environment=DISCORD_OIDC_CONFIG=/config.yaml
Image=ghcr.io/tastypi/discord-oidc:latest
Volume=./discord-oidc.yaml:/config.yaml:ro
```

#### `jellyfin-plugin-sso`

This enables allowing users to sign in to your Jellyfin instance using Discord, and managing what content they can access based on what servers they are part of.

Assuming you have an instance running at DOMAIN, configure `jellyfin-plugin-sso` with the following options:

| Option                          | Value                                                                                                                                                      |
|--------------------------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Name of OpenID Provider         | Whatever you want, `discord` is sensible                                                                                                                   |
| OpenID Endpoint                 | https://DOMAIN/.well-known/openid-configuration                                                                                                            |
| Enabled                         | ✅                                                                                                                                                         |
| Enable Authorization by Plugin  | ✅ unless you want to manage library access manually                                                                                                       |
| Enable All Folders              | If you want all authorized users to acces everything                                                                                                       |
| Enabled Folders                 | If you want all authorized users to access some things                                                                                                     |
| Roles                           | List all the [guild IDs] you want to enable access for, leave blank to allow all Discord users                                                             |
| Admin Roles                     | Any [guild IDs] listed here will grant everyone in that guild admin access, you probably want to leave it blank (you can still manually make users admins) |
| Enable Role-Based Folder Access | Use this to provide access to specific libraries for specific guilds                                                                                       |
| Live TV stuff                   | idk I don't use Live TV, you decide                                                                                                                        |
| Role Claim                      | `groups`                                                                                                                                                   |
| Request Additional Scopes       | `groups`                                                                                                                                                   |
| Set default Provider            | tbh idk what this is 🤷                                                                                                                                    |
| Set default username claim      | Leave blank                                                                                                                                                |
| Set avatar url format           | `@{picture}`                                                                                                                                               |
| Scheme Override                 | `https` (assuming your `discord-oidc` instance is behind https, which I really hope it is)                                                                 |

Save the config, restart Jellyfin, then go to `/sso/OID/start/discord` (or whatever provider name you chose) to test it.

## Scopes & Claims

The scope `profile` provides the following claims:

| Claim                | Description                                                           |
|---------------------:|-----------------------------------------------------------------------|
| `locale`             | The user's locale                                                     |
| `nickname`           | The user's "global name" on Discord (i.e. their default display name) |
| `picture`            | URL for the user's avatar                                             |
| `preferred_username` | The Discord username                                                  |

The scope `groups` provides the following claims:

| Claim    | Description                             |
|---------:|-----------------------------------------|
| `groups` | List of [guild IDs] the user belongs to |

[config.example.yaml]: ./config.example.yaml
[guild IDs]: https://support-dev.discord.com/hc/en-us/articles/360028717192-Where-can-I-find-my-Application-Team-Server-ID
