# Copilot Instructions

## TypeBox Schema Pattern

When working with TypeBox schemas, follow this pattern:

```typescript
// Define and export the schema
export const MySchema = Type.Object({
  field: Type.String(),
});

// Export the type derived from the schema
export type MySchema = Type.Static<typeof MySchema>;
```

When importing, use:

```typescript
import { MySchema } from "./schemas.js";
```

TypeScript will automatically use `MySchema` as:
- A **value** when used in expressions (e.g., `Value.Assert(MySchema, data)`)
- A **type** when used in type contexts (e.g., `const config: MySchema`)

**Do not** rename the schema on import (e.g., `MySchema as MySchemaValue`, `MySchema as MySchemaType`, or importing as both `type MySchema` and `MySchema`). This is an intentional pattern that keeps the code clean and leverages TypeScript's dual-use capabilities.
