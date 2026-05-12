# Nytra

Fast binary serialization for JavaScript/TypeScript with decorator-based DTO support.

Nytra helps you encode/decode plain values, arrays, objects, and class instances into compact binary buffers.

## Features

- Binary encode/decode for primitives, arrays, objects, bigint, and nested data
- Decorator-based class schema registration
- Nullable fields support in DTOs
- Custom type IDs for compact class payloads
- ESM package output with TypeScript declarations

## Installation

```bash
npm install nytra
```

## Quick Start

```ts
import { Nytra, Types } from "nytra";

@Nytra.registerClass(2000)
class Player {
  @Nytra.registerField(0, Types.TYPE_STRING)
  name: string;

  @Nytra.registerField(1, Types.TYPE_UINT16)
  level: number;

  @Nytra.registerField(2, Types.TYPE_STRING, { nullable: true })
  guild: string | null = null;

  constructor(name: string, level: number) {
    this.name = name;
    this.level = level;
  }
}

const original = new Player("Ari", 42);
const encoded = Nytra.encode(original);
const decoded = Nytra.decode(encoded) as Player;

console.log(decoded.name, decoded.level, decoded.guild);
```

## API Overview

- `Nytra.encode(data, typeId?)` -> `Uint8Array`
- `Nytra.decode(buffer)` -> decoded value
- `Nytra.autoguessType(data)` -> internal type id
- `Nytra.getTypeIdForClass(ClassCtor)` -> registered class type id
- `Nytra.registerClass(typeId)` -> class decorator
- `Nytra.registerField(position, typeOrClass, options?)` -> field decorator

### `registerField` options

- `nullable?: boolean` - marks a field as nullable in class schema

## Supported Built-in Types

Use constants from `Types`, for example:

- `TYPE_NULL`, `TYPE_BOOLEAN`
- `TYPE_UINT8`, `TYPE_UINT16`, `TYPE_UINT32`, `TYPE_UINT64`
- `TYPE_INT8`, `TYPE_INT16`, `TYPE_INT32`, `TYPE_INT64`
- `TYPE_FLOAT32`, `TYPE_FLOAT64`
- `TYPE_STRING`, `TYPE_ARRAY`, `TYPE_OBJECT`, `TYPE_JSON`, `TYPE_BIGINT`

## Development

Build:

```bash
npm run build
```

Run tests (Bun):

```bash
bun test
```

## TypeScript Decorators Setup

If you see decorator typing/runtime issues, enable modern decorators + metadata in your TS setup:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["ES2022", "esnext.decorators", "esnext.decorators.metadata"]
  }
}
```

> Nytra decorators use the new standard decorator context APIs (`ClassDecoratorContext`, `ClassFieldDecoratorContext`).

## License

MIT

