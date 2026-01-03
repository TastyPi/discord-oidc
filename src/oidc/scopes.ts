import * as Immutable from "immutable";
import type { IterableElement } from "type-fest";
import Set = Immutable.Seq.Set;

export const scopes = Set(["openid", "profile"] as const);
export type Scope = IterableElement<typeof scopes>;

export function isScope(value: string): value is Scope {
  return scopes.has(value as Scope);
}
