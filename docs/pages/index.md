**⚠️ Currently in early preview - _not to be used in Production unless you're willing to live on the bleeding edge and give us feedback, which we would welcome!_.** Follow progress [here](https://github.com/graphql-nexus/nexus-plugin-prisma/issues/1039).

# nexus-prisma

[![trunk](https://github.com/prisma/nexus-prisma/actions/workflows/trunk.yml/badge.svg)](https://github.com/prisma/nexus-prisma/actions/workflows/trunk.yml)

Official Prisma plugin for Nexus.

- [Usage](#usage)
- [Roadmap](#roadmap)
- [Architecture](#architecture)
- [Features](#features)
  - [Type-safe Generated Library Code](#type-safe-generated-library-code)
  - [Project Enums](#project-enums)
  - [Project Scalars](#project-scalars)
  - [Project Relations](#project-relations)
    - [Example: Exposing Prisma Client on GraphQL Context with Apollo Server](#example-exposing-prisma-client-on-graphql-context-with-apollo-server)
  - [Project 1:1 Relation](#project-11-relation)
    - [Example: Tests](#example-tests)
    - [Example: Full 1:1](#example-full-11)
    - [Limitation: Nullable on Without-Relation-Scalar Side](#limitation-nullable-on-without-relation-scalar-side)
  - [Project 1:n Relation](#project-1n-relation)
    - [Example: Tests](#example-tests-1)
    - [Example: Full 1:n](#example-full-1n)
  - [Runtime Settings](#runtime-settings)
    - [Reference](#reference)
  - [Generator Settings](#generator-settings)
    - [Usage](#usage-1)
    - [Reference](#reference-1)
  - [Prisma String @id fields project as GraphQL ID fields](#prisma-string-id-fields-project-as-graphql-id-fields)
  - [Prisma Schema Docs Propagation](#prisma-schema-docs-propagation)
    - [As GraphQL schema doc](#as-graphql-schema-doc)
    - [As JSDoc](#as-jsdoc)
  - [Refined DX](#refined-dx)
- [Recipes](#recipes)
  - [Project relation with custom resolver logic](#project-relation-with-custom-resolver-logic)
  - [Supply custom custom scalars to your GraphQL schema](#supply-custom-custom-scalars-to-your-graphql-schema)
- [Notes](#notes)
  - [For users of `nexus-prisma@=<0.20`](#for-users-of-nexus-prisma020)
  - [For users of `prisma@=<2.17`](#for-users-of-prisma217)
  - [For users of `nexus@=<1.0`](#for-users-of-nexus10)
  - [Supported Versions Of Node & Prisma](#supported-versions-of-node--prisma)

## Usage

1. Install dependencies

   ```
   npm add nexus-prisma nexus graphql @prisma/client
   npm add --dev prisma
   ```

   > `nexus` `graphql` and `@prisma/client` are peer dependencies. `prisma` is for the Prisma CLI which you'll probably want during development.

   > If you use `nexus@=<1.0` then you must use `t.field(<NAME>, <CONFIG>)` instead of `t.field(<CONFIG>)`. The Nexus Prisma docs assume the latter form.

1. Add a `nexus-prisma` generator block to your Prisma Schema.

   > If you are using `prisma@=<2.17` then you must use the Nexus Prisma Prisma generator name of `nexus_prisma` instead of `nexus-prisma`. See [notes](#notes) for more detail.

1. Run `prisma generate` in your terminal.

1. Import models from `nexus-prisma` and then pass them to your Nexus type definition and field definition configurations. In this way you will be effectively projecting models from your data layer into GraphQL types in your API layer.

##### Example

```prisma

generator client {
  provider = "prisma-client-js"
}

generator nexusPrisma {
   provider = "nexus-prisma"
// provider = "nexus_prisma"    <-- For prisma@=<2.17 users
}

/// This is a user!
model User {
  /// This is an id!
  id  String  @id
}
```

```
prisma generate
```

```ts
import { User } from 'nexus-prisma'
import { makeSchema, objectType } from 'nexus'

export const schema = makeSchema({
  types: [
    objectType({
      name: User.$name
      description: User.$description
      definition(t) {
        t.field(User.id)
     // t.field(User.id.name, User.id)    <-- For nexus@=<1.0 users
      }
    })
  ]
})
```

## Roadmap

##### Done

- [x] ([#4](https://github.com/prisma/nexus-prisma/issues/4)) Support for Prisma Model field types that map to standard GraphQL scalars
- [x] ([#8](https://github.com/prisma/nexus-prisma/issues/8)) Support for Prisma Model field types of `DateTime` & `Json`
- [x] ([#16](https://github.com/prisma/nexus-prisma/issues/16)) Support for Prisma enums
- [x] ([#25](https://github.com/prisma/nexus-prisma/pull/25), [#36](https://github.com/prisma/nexus-prisma/issues/36)) Basic support for Prisma Model field types relating to other Models 1:1
- [x] ([#38](https://github.com/prisma/nexus-prisma/pull/38)) Basic support for Prisma Model field types relating to other Models 1:n
- [x] ([#43](https://github.com/prisma/nexus-prisma/issues/43)) Support for runtime and gentime settings
- [x] ([#61](https://github.com/prisma/nexus-prisma/issues/61)) JSDoc for settings/$settings
- [x] ([#68](https://github.com/prisma/nexus-prisma/issues/68)) Support for Prisma Model field type `Bytes`

##### Shortterm

- [x] ([#59](https://github.com/prisma/nexus-prisma/issues/59)) Support for Prisma Model field type `BigInt`
- [ ] ([#94](https://github.com/prisma/nexus-prisma/issues/94)) Support for Prisma Model field type `Decimal`
- [ ] Improved JSDoc for relation 1:1 & 1:n fields

##### Midterm

- [ ] Support for Prisma Model field types relating to other Models n:n
- [ ] Support for relation field ordering parameters
- [ ] ([#83](https://github.com/prisma/nexus-prisma/issues/83)) Support for relation field filtering parameters
- [ ] Support for relation field pagination parameters

##### Longterm

- [ ] Nexus Plugin? `t.model`? `t.crud`?
- [ ] ...

## Architecture

![nexus-prisma-architecture](https://user-images.githubusercontent.com/284476/118728589-70fce780-b802-11eb-8c8b-4328ef5d6fb5.png)

1. You or a script (CI, programmatic, etc.) run `$ prisma generate`.
2. Prisma generator system reads your Prisma schema file
3. Prisma generator system runs the Nexus Prisma generator passing it the "DMMF", a structured representation of your Prisma schema.
4. Nexus Prisma generator reads your Nexus Prisma generator configuration if present.
5. Nexus Prisma generator writes generated source code into its own package space in your node_modules.
6. Later when you run your code it imports `nexus-prisma` which hits the generated entrypoint.
7. The generated runtime is actually thin, making use of a larger static runtime.

## Features

> **Note**: ⛑ The following use abbreviated examples that skip a complete setup of passing Nexus type definition to Nexus' `makeSchema`. If you are new to Nexus, consider reading the [official Nexus tutorial](https://nxs.li/tutorial) before jumping into Nexus Prisma.

### Type-safe Generated Library Code

Following the same philosophy as Prisma Client, Nexus Prisma uses generation to create an API that feels tailor made for your project.

```prisma
model User {
  id  String  @id
}
```

```ts
import { User } from 'nexus-prisma'
import { objectType } from 'nexus'

objectType({
  name: User.$name
  description: User.$description
  definition(t) {
    t.field({
      type: User.id.type,
      description: User.id.description
    })
  }
})
```

### Project Enums

Every enum defined in your Prisma schema becomes importable as a Nexus enum type definition configuration. This makes it trivial to project enums from your database layer into your API layer.

```prisma
enum SomeEnum {
  foo
  bar
}
```

```ts
import { SomeEnum } from 'nexus-prisma'
import { enumType } from 'nexus'

SomeEnum.name //    'SomeEnum'
SomeEnum.members // ['foo', 'bar']

enumType(SomeEnum)
```

### Project Scalars

Like GraphQL, [Prisma has the concept of scalar types](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference/#model-field-scalar-types). Some of the Prisma scalars can be naturally mapped to standard GraphQL scalars. The mapping is as follows:

**Prisma Standard Scalar to GraphQL Standard Scalar Mapping**

| Prisma              | GraphQL                                                        |
| ------------------- | -------------------------------------------------------------- |
| `Boolean`           | `Boolean`                                                      |
| `String`            | `String`                                                       |
| `Int`               | `Int`                                                          |
| `Float`             | `Float`                                                        |
| `String` with `@id` | `ID`                                                           |
| `Int` with `@id`    | `ID` \| `Int` ([configurable](#projectidinttographql-id--int)) |

However some of the Prisma scalars do not have a natural standard representation in GraphQL. For these cases Nexus Prisma generates code that references type names matching those scalar names in Prisma. Then, you are expected to define those custom scalar types in your GraphQL API. Nexus Prisma ships with pre-defined mappings in `nexus-prisma/scalars` you _can_ use for convenience. The mapping is as follows:

**Prisma Standard-Scalar to GraphQL Custom-Scalar Mapping**

| Prisma     | GraphQL    | Nexus `t` Helper | GraphQL Scalar Implementation                                         | Additional Info                                                                                              |
| ---------- | ---------- | ---------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Json`     | `Json`     | `json`           | [JsonObject](https://www.graphql-scalars.dev/docs/scalars/jsonobject) |                                                                                                              |
| `DateTime` | `DateTime` | `dateTime`       | [DateTime](https://www.graphql-scalars.dev/docs/scalars/datetime)     |                                                                                                              |
| `BigInt`   | `BigInt`   | `bigInt`         | [BigInt](https://www.graphql-scalars.dev/docs/scalars/big-int)        | [JavaScript BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) |
| `Bytes`    | `Bytes`    | `bytes`          | [Byte](https://www.graphql-scalars.dev/docs/scalars/byte/)            | [Node.js Buffer](https://nodejs.org/api/buffer.html#buffer_buffer)                                           |

> **Note:** Not all Prisma scalar mappings are implemented yet: `Decimal`, `Unsupported`

> **Note:** BigInt is supported in Node.js since version [10.4.0](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#browser_compatibility) however to support BigInt in `JSON.parse`/`JSON.stringify` you must use [`json-bigint-patch`](https://github.com/ardatan/json-bigint-patch) otherwise BigInt values will be serialized as strings.

You can use your own GraphQL Scalar Implementation, however, you _must adhear to the above Prisma/GraphQL name mapping defined above_.

Here is an example using Nexus Prisma's pre-defined GraphQL custom scalars:

```ts
import NexusPrismaScalars from 'nexus-prisma/scalars'
import { makeSchema } from 'nexus'

makeSchema({
  types: [NexusPrismaScalars],
})
```

There is a [recipe below](#Supply-custom-custom-scalars-to-your-GraphQL-schema) showing how to add your own custom scalars if you want.

### Project Relations

You can project [relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations) into your API with Nexus Prisma. Nexus Prisma even includes the resolver you'll need at runtime to fulfill the projection by automating use of your Prisma Client instance.

Please note that not all kinds of relationships are supported yet. Details about projecting each kind of relation are documented in their respective sections. This section only contains general documentation common to all.

To project relations you must by default expose an instance of Prisma Client on the GraphQL context under the key name `prisma`. You can [customize which context property Nexus Prisma should look for your Prisma Client](#prismaclientcontextfield-string).

#### Example: Exposing Prisma Client on GraphQL Context with Apollo Server

```ts
import { ApolloServer } from 'apollo-server'
import { PrismaClient } from '@prisma/client'
import schema from './your/schema/somewhere'

const prisma = new PrismaClient()

new ApolloServer({
  schema,
  context() {
    return {
      prisma,
    }
  },
})
```

### Project 1:1 Relation

You can project [1:1 relationships](https://www.prisma.io/docs/concepts/components/prisma-schema/relations#one-to-one-relations) into your API.

#### Example: Tests

The integration test suite is a useful reference as it is declarative (easy to read) and gives a known-working example spanning from database all the way to executed GraphQL document.

- [Tests](https://github.com/prisma/nexus-prisma/blob/main/tests/integration/relation1To1.test.ts)
- [Snapshots](https://github.com/prisma/nexus-prisma/blob/main/tests/integration/__snapshots__/relation1To1.test.ts.snap)

#### Example: Full 1:1

```prisma
// Database Schema

model User {
  id         String  @id
  profile    Profile @relation(fields: [profileId], references: [id])
  profileId  String
}

model Profile {
  id      String  @id
  user    User?
}
```

```ts
// API Schema

import { User, Profile } from 'nexus-prisma'

queryType({
  definition(t) {
    t.nonNull.list.nonNull.field('users', {
      type: 'User',
      resolve(_, __, ctx) {
        return ctx.prisma.user.findMany()
      },
    })
  },
})

objectType({
  name: User.$name,
  definition(t) {
    t.field(User.id)
    t.field(User.profile)
  },
})

objectType({
  name: Profile.$name,
  definition(t) {
    t.field(Profile.id)
  },
})
```

```graphql
# API Schema Represented in GraphQL SDL (this is generated by Nexus)

type Query {
  users: [User!]!
}

type User {
  id: ID
  profile: Profile
}

type Profile {
  id: ID
}
```

```ts
// Example Database Data (for following example)

await prisma.user.create({
  data: {
    id: 'user1',
    profile: {
      create: {
        id: 'profile1',
      },
    },
  },
})
```

```graphql
# Example API Client Query

query {
  users {
    id
    profile {
      id
    }
  }
}
```

```json
{
  "data": {
    "users": [
      {
        "id": "user1",
        "profile": {
          "id": "profile1"
        }
      }
    ]
  }
}
```

#### Limitation: Nullable on Without-Relation-Scalar Side

Prisma requires that a 1:1 relationship has one side that is optional. For example in the following it is **not** possible for `Profile` to have a required relationship to `User`. For more detail you can read the Prisma docs about this [here](https://www.prisma.io/docs/concepts/components/prisma-schema/relations#one-to-one-relations).

```prisma
model User {
  id         String  @id
  profile    Profile @relation(fields: [profileId], references: [id])
  profileId  String
}

model Profile {
  id      String  @id
  user    User?  // <--  "?" required
}
```

Prisma inherits this limitation from databases. In turn Nexus Prisma inherits this limitation from Prisma. For example consider this projection and then look at the resulting GraphQL SDL representation.

```ts
import { User, Profile } from 'nexus-prisma'

objectType({
  name: User.$name,
  definition(t) {
    t.field(User.id)
    t.field(User.profile)
  },
})

objectType({
  name: Profile.$name,
  definition(t) {
    t.field(Profile.id)
    t.field(User.profile)
  },
})
```

```graphql
type User {
  id: ID
  profile: Profile!
}

type Profile {
  id: ID
  user: User # <-- Nullable!
}
```

This limitation may be a problem for your API. There is an [issue track this that you can subscribe to](https://github.com/prisma/nexus-prisma/issues/34) if interested. As a workaround for now you can do this:

```ts
objectType({
  name: Profile.$name,
  definition(t) {
    t.field(Profile.id)
    t.field({
      ...User.profile,
      type: nonNull(User.profile.type),
    })
  },
})
```

### Project 1:n Relation

You can project [1:n relationships](https://www.prisma.io/docs/concepts/components/prisma-schema/relations#one-to-many-relations) into your API.

#### Example: Tests

The integration test suite is a useful reference as it is declarative (easy to read) and gives a known-working example spanning from database all the way to executed GraphQL document.

- [Tests](https://github.com/prisma/nexus-prisma/blob/main/tests/integration/relation1ToN.test.ts)
- [Snapshots](https://github.com/prisma/nexus-prisma/blob/main/tests/integration/__snapshots__/relation1ToN.test.ts.snap)

#### Example: Full 1:n

```prisma
// Database Schema

model User {
  id         String    @id
  posts      Post[]
}

model Post {
  id        String  @id
  author    User?   @relation(fields: [authorId], references: [id])
  authorId  String
}
```

```ts
// API Schema

import { User, Post } from 'nexus-prisma'

queryType({
  definition(t) {
    t.nonNull.list.nonNull.field('users', {
      type: 'User',
      resolve(_, __, ctx) {
        return ctx.prisma.user.findMany()
      },
    })
  },
})

objectType({
  name: User.$name,
  definition(t) {
    t.field(User.id)
    t.field(User.posts)
  },
})

objectType({
  name: Post.$name,
  definition(t) {
    t.field(Post.id)
  },
})
```

```graphql
# API Schema Represented in GraphQL SDL (this is generated by Nexus)

type Query {
  users: [User]
}

type User {
  id: ID!
  posts: [Post!]!
}

type Post {
  id: ID!
}
```

```ts
// Example Database Data (for following example)

await prisma.user.create({
  data: {
    id: 'user1',
    posts: {
      create: [{ id: 'post1' }, { id: 'post2' }],
    },
  },
})
```

```graphql
# Example API Client Query

query {
  users {
    id
    posts {
      id
    }
  }
}
```

```json
{
  "data": {
    "users": [
      {
        "id": "user1",
        "posts": [
          {
            "id": "post1"
          },
          {
            "id": "post2"
          }
        ]
      }
    ]
  }
}
```

### Runtime Settings

#### Reference

##### `prismaClientContextField: string`

- **@summary** The name of the GraphQL context field to get an instance of Prisma Client from.
- **@remarks** The instance of Prisma Client found here is accessed in the default resolvers for relational fields.
- **@default** `"prisma"`
- **@example**

  ```ts
  // src/main.ts

  import { PrismaClient } from '@prisma/client'
  import { ApolloServer } from 'apollo-server'
  import { makeSchema } from 'nexus'
  import { User, Post, $settings } from 'nexus-prisma'

  new ApolloServer({
    schema: makeSchema({
      types: [],
    }),
    context() {
      return {
        db: new PrismaClient(), // <-- You put Prisma client on the "db" context property
      }
    },
  })

  $settings({
    prismaClientContextField: 'db', // <-- Tell Nexus Prisma
  })
  ```

##### `prismaClientImportId: string`

- **@summary** Where Nexus Prisma will try to import your generated Prisma Client from. You should not need to configure this normally because Nexus Prisma generator automatically reads the Prisma Client generator `output` setting if you have set it. The value here will be used in a dynamic import thus following Node's path resolution rules. You can pass a node_modules package like `foo` `@prisma/client`, `@my/custom/thing` etc. or you can pass an absolute module/file path `/my/custom/thing` / `/my/custom/thing/index.js` or finally a relative path to be resolved relative to the location of Nexus Prisma source files (you probably don't want this).

- **@default** `@prisma/client`

- **@remarks** Nexus Prisma imports Prisma client internally for two reasons: 1) validation wherein a class reference to Prisma Client is needed for some `instanceof` checks and 2) for acquiring the DMMF as Nexus Prisma relies on some post-processing done by Prisma Client generator.

- **@example**

  ```ts
  // src/main.ts

  import { PrismaClient } from '@prisma/client'
  import { ApolloServer } from 'apollo-server'
  import { makeSchema } from 'nexus'
  import { User, Post, $settings } from 'nexus-prisma'

  new ApolloServer({
    schema: makeSchema({
      types: [],
    }),
  })

  $settings({
    prismaClientImportId: '@my/custom/thing',
  })
  ```

### Generator Settings

You are able to control certain aspects of the Nexus Prisma code generation.

#### Usage

1. Create a configuration file named any of:

   ```
   nexusPrisma.ts  /  nexus-prisma.ts  /  nexus_prisma.ts
   ```

   In one of the following directories:

   1. **Project Root** – The directory containing your project's package.json. Example:

      ```
        ├── nexus-prisma.ts
        └── package.json
      ```

   2. **Primsa Directory** – The directory containing your Prisma schema. Example:

      ```
        ├── prisma/nexus-prisma.ts
        └── package.json
      ```

2. Import the settings singleton and make your desired changes. Example:

   ```ts
   import { settings } from 'nexus-prisma/generator'

   settings({
     projectIdIntToGraphQL: 'ID',
   })
   ```

#### Reference

##### `projectIdIntToGraphQL: 'ID' | 'Int'`

- **`@summary`** Map Prisma model fields of type `Int` with attribute `@id` to `ID` or `Int`.
- **`@default`** `Int`

##### `docPropagation.JSDoc: boolean`

- **`@summary`** Should Prisma Schema docs propagate as JSDoc?
- **`@default`** `true`

##### `docPropagation.GraphQLDocs: boolean`

- **`@summary`** Should Prisma Schema docs propagate as GraphQL docs?
- **`@remarks`** When this is disabled it will force `.description` property to be `undefined`. This is for convenience, allowing you to avoid post-generation data manipulation or consumption contortions.
- **`@default`** `true`

### Prisma String @id fields project as GraphQL ID fields

All `String` fields with `@id` attribute in your Prisma Schema get projected as GraphQL `ID` types rather than `String` types.

```prisma
model User {
  id  String  @id
}
```

```ts
import { User } from 'nexus-prisma'
import { objectType } from 'nexus'

objectType({
  name: User.$name
  description: User.$description
  definition(t) {
    t.field(User.id)
  }
})
```

```graphql
type User {
  id: ID
}
```

### Prisma Schema Docs Propagation

#### As GraphQL schema doc

```prisma
/// A user.
model User {
  /// A stable identifier to find users by.
  id  String  @id
}
```

```ts
import { User } from 'nexus-prisma'
import { objectType } from 'nexus'

User.$description // JSDoc: A user.
User.id.description // JSDoc: A stable identifier to find users by.

objectType({
  name: User.$name
  description: User.$description
  definition(t) {
    t.field(User.id)
  }
})
```

```graphql
"""
A user.
"""
type User {
  """
  A stable identifier to find users by.
  """
  id: ID
}
```

#### As JSDoc

Can be disabled in [gentime settings](https://pris.ly/nexus-prisma/docs/settings/gentime).

```prisma
/// A user.
model User {
  /// A stable identifier to find users by.
  id  String  @id
}
```

```ts
import { User } from 'nexus-prisma'

User // JSDoc: A user.
User.id // JSDoc: A stable identifier to find users by.
```

### Refined DX

These are finer points that aren't perhaps worth a top-level point but none the less add up toward a thoughtful developer experience.

##### JSDoc

- Generated Nexus configuration for fields and models that you _have not_ documented in your PSL get default JSDoc that teaches you how to do so.
- JSDoc for Enums have their members embedded

##### Default Runtime

When your project is in a state where the generated Nexus Prisma part is missing (new repo clone, reinstalled deps, etc.) Nexus Prisma gives you a default runtime export named `PleaseRunPrismaGenerate` and will error with a clear message.

##### Peer-Dependency Validation

When `nexus-prisma` is imported it will validate that your project has peer dependencies setup correctly.

If a peer dependency is not installed it `nexus-prisma` will log an error and then exit 1. If its version does not satify the range supported by the current version of `nexus-prisma` that you have installed, then a warning will be logged. If you want to opt-out of this validation then set an envar as follows:

```
NO_PEER_DEPENDENCY_CHECK=true|1
PEER_DEPENDENCY_CHECK=false|0
```

##### Auto-Import Optimized

- `nexus-prisma/scalars` offers a default export you can easily auto-import by name: `NexusPrismaScalars`.

## Recipes

### Project relation with custom resolver logic

Nexus Prisma generates default GraphQL resolvers for your model _relation fields_. However you may want to run custom logic in the resolver. This is easy to do. The following show a few ways.

1. **Wrap Style** You can access the default resolver within your own custom resolver.

   ```ts
   objectType({
     name: User.$name,
     definition(t) {
       t.field(User.id)
       t.field({
         ...User.posts,
         async resolve(...args) {
           // Your custom before-logic here
           const result = await User.posts.resolve(...args)
           // Your custom after-logic here
           return result
         },
       })
     },
   })
   ```

2. **Replace Style** You can simply opt out of using the default resolver completely:

   ```ts
   objectType({
     name: User.$name,
     definition(t) {
       t.field(User.id)
       t.field({
         ...User.posts,
         async resolve(...args) {
           // Your custom logic here
         },
       })
     },
   })
   ```

### Supply custom custom scalars to your GraphQL schema

The following is a brief example how you could add your own custom GraphQL custom scalars to satisfy Nexus Prisma. Note that most of the time using the defaults exported by `nexus-prisma/scalars` will probably be good enough for you.

```ts
import { GraphQLScalarType } from 'graphql'
import { JSONObjectResolver, DateTimeResolver } from 'graphql-scalars'
import { asNexusMethod, makeSchema } from 'nexus'

const jsonScalar = new GraphQLScalarType({
  ...JSONObjectResolver,
  // Override the default 'JsonObject' name with one that matches what Nexus Prisma expects.
  name: 'Json',
})

const dateTimeScalar = new GraphQLScalarType(DateTimeResolver)

makeSchema({
  types: [asNexusMethod(jsonScalar, 'json'), asNexusMethod(dateTimeScalar, 'dateTime')],
})
```

## Notes

### For users of `nexus-prisma@=<0.20`

Versions of `nexus-prisma` package prior to `0.20` were a completely different version of the API, and had also become deprecated at one point to migrate to `nexus-plugin-prisma` when Nexus Framework was being worked on. All of that is history.

### For users of `prisma@=<2.17`

If you are using `prisma@=<2.17` then you must use the Nexus Prisma Prisma generator name of `nexus_prisma` instead of `nexus-prisma`. This is because prior to `prisma@2.18` there was a hardcode check for `nexus-prisma` that would fail with an error message about a now-old migration.

### For users of `nexus@=<1.0`

The [release of Nexus 1.1](https://github.com/graphql-nexus/nexus/releases/tag/1.0.0) introduced an overload to `t.field` allowing improved usage of Nexus Prisma. The difference is as follows. Note if you prefer the older way that is and always will be supported too.

```diff ts
import { User } from 'nexus-prisma'
import { makeSchema, objectType } from 'nexus'

export const schema = makeSchema({
  types: [
    objectType({
      name: User.$name
      description: User.$description
      definition(t) {
+        t.field(User.id) //                 <-- for nexus@>=1.1 users
-        t.field(User.id.name, User.id) //   <-- For nexus@=<1.0 users
      }
    })
  ]
})
```

### Supported Versions Of Node & Prisma

We only officially support what we test.

We test Node versions that are `Active LTS` and `Current`. For which versions of Node that equals you can refer to our tests or look here: https://nodejs.org/en/about/releases.

We test Prisma versions `2.25`. More Prisma versions are planned to be tested, refer to [#69](https://github.com/prisma/nexus-prisma/issues/69).

We do not currently maintain a historical matrix of what past versions of Prisma supported what vesrions of Prisma and Node.
