export class DiscordAccessTokens {
  // TODO: should use something more permanent, but this is fine for me
  private readonly tokens = new Map<string, string>();

  async get(sub: string) {
    return this.tokens.get(sub);
  }

  async set(sub: string, token: string) {
    this.tokens.set(sub, token);
  }
}
