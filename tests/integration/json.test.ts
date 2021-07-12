import dedent from 'dindist'
import gql from 'graphql-tag'
import { list, objectType, queryType } from 'nexus'
import NexusPrismaScalars from '../../scalars'
import { testIntegration } from '../__helpers__/testers'

testIntegration({
  skip: true, // integration test currently only works against SQLite which doesn't support JSON
  description: 'When a JSON field is defined in the Prisma schema it can be projected into the GraphQL API',
  datasourceSchema: dedent`
    model Foo {
      id   String @id
      json Json
    }
  `,
  apiSchema({ Foo }) {
    return [
      NexusPrismaScalars.Bytes,
      NexusPrismaScalars.BigInt,
      NexusPrismaScalars.DateTime,
      NexusPrismaScalars.Decimal,
      NexusPrismaScalars.Json,
      objectType({
        name: Foo.$name,
        definition(t) {
          t.field(Foo.json)
        },
      }),
      queryType({
        definition(t) {
          t.field({
            name: 'foos',
            type: list(Foo.name),
            resolve(_, __, ctx) {
              return ctx.prisma.foo.findMany()
            },
          })
        },
      }),
    ]
  },
  async datasourceSeed(prisma) {
    await prisma.foo.create({
      data: {
        id: 'foo1',
        json: JSON.stringify({ babar: true }),
      },
    })
  },
  apiClientQuery: gql`
    query {
      foos {
        id
        json
      }
    }
  `,
})
