import { asNexusMethod } from 'nexus'
import * as decimal from 'decimal.js'

import { GraphQLScalarType, Kind } from 'graphql'

/**
 * A Nexus scalar type definition for arbitrary-precision Decimal type
 *
 * Contributes a scalar to your GraphQL schema called `Decimal`.
 *
 * Contributes a `t` `[1]` helper method called `decimal`
 *
 * `[1]` A `t` helper method refers to a method on the argument given to a `definition` method. Helper methods
 * here typically help you quickly create new fields.
 *
 * @example
 *
 *   import { makeSchema, objectType } from 'nexus'
 *   import { Decimal } from 'nexus-prisma/scalars'
 *
 *   SomeObject = objectType({
 *     name: 'SomeObject',
 *     definition(t) {
 *       t.decimal('someDecimalField')
 *     },
 *   })
 *
 *   makeSchema({
 *     types: [Decimal, SomeObject],
 *   })
 *
 */
export const Decimal = asNexusMethod(
  /**
   * Copied from prisma-graphql-type-decimal.
   *
   * @see https://github.com/unlight/prisma-graphql-type-decimal
   */
  new GraphQLScalarType({
    name: 'Decimal',
    description: 'An arbitrary-precision Decimal type',
    /**
     * Value sent to the client
     */
    serialize(value: decimal.Decimal) {
      return value.toString()
    },
    /**
     * Value from the client
     */
    parseValue(value: decimal.Decimal.Value) {
      return new decimal.Decimal(value)
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT || ast.kind === Kind.STRING) {
        return new decimal.Decimal(ast.value)
      }
      return null
    },
  }),
  'decimal'
)
