import { DMMF } from '@prisma/generator-helper'
import dedent from 'dindist'
import * as OS from 'os'
import { LiteralUnion } from 'type-fest'
import { StandardGraphQLScalarType, StandardGraphQLScalarTypes } from '../../helpers/graphql'
import { PrismaScalarType } from '../../helpers/prisma'
import { allCasesHandled } from '../../helpers/utils'
import { Gentime } from '../gentime/settingsSingleton'
import { jsDocForEnum, jsDocForField, jsDocForModel } from '../helpers/JSDocTemplates'
import { ModuleSpec } from '../types'

export function createModuleSpec(dmmf: DMMF.Document, settings: Gentime.Settings): ModuleSpec {
  return {
    fileName: 'index.d.ts',
    content: dedent`
      ${renderTypeScriptDeclarationForDocumentModels(dmmf, settings)}
    `,
  }
}

const NO_ENUMS_DEFINED_COMMENT = dedent`
  // N/A –– You have not defined any models in your Prisma schema file.
`

const NO_MODELS_DEFINED_COMMENT = dedent`
  // N/A –– You have not defined any enums in your Prisma schema file.
`

export function renderTypeScriptDeclarationForDocumentModels(
  dmmf: DMMF.Document,
  settings: Gentime.Settings
): string {
  const models = dmmf.datamodel.models
  const enums = dmmf.datamodel.enums

  return (
    dedent`
    import * as Nexus from 'nexus'
    import * as NexusCore from 'nexus/dist/core'

    //
    //
    // TYPES
    // TYPES
    // TYPES
    // TYPES
    //
    //

    declare namespace $Types {
      // Models

      ${
        models.length === 0
          ? NO_MODELS_DEFINED_COMMENT
          : models.map((model) => renderTypeScriptDeclarationForModel(model, settings)).join('\n\n')
      }

      // Enums

      ${
        enums.length === 0
          ? NO_ENUMS_DEFINED_COMMENT
          : enums.map((enum_) => renderTypeScriptDeclarationForEnum(enum_, settings)).join('\n\n')
      }
    }


    //
    //
    // EXPORTS
    // EXPORTS
    // EXPORTS
    // EXPORTS
    //
    //

    //
    //
    // EXPORTS: PRISMA MODELS
    // EXPORTS: PRISMA MODELS
    // EXPORTS: PRISMA MODELS
    // EXPORTS: PRISMA MODELS
    //
    //

    ${
      models.length === 0
        ? NO_MODELS_DEFINED_COMMENT
        : models
            .map((model) => {
              const jsdoc = settings.data.docPropagation.JSDoc ? jsDocForModel(model) + '\n' : ''
              return dedent`
                ${jsdoc}export const ${model.name}: $Types.${model.name}
              `
            })
            .join('\n\n')
    }

    //
    //
    // EXPORTS: PRISMA ENUMS
    // EXPORTS: PRISMA ENUMS
    // EXPORTS: PRISMA ENUMS
    // EXPORTS: PRISMA ENUMS
    //
    //

    ${
      enums.length === 0
        ? NO_ENUMS_DEFINED_COMMENT
        : enums
            .map((enum_) => {
              const jsdoc = settings.data.docPropagation.JSDoc ? jsDocForEnum(enum_) + '\n' : ''
              return dedent`
                ${jsdoc}export const ${enum_.name}: $Types.${enum_.name}
              `
            })
            .join('\n\n')
    }

    //
    //
    // EXPORTS: OTHER
    // EXPORTS: OTHER
    // EXPORTS: OTHER
    // EXPORTS: OTHER
    //
    //

    import { Runtime } from '../generator/runtime/settingsSingleton'

    /**
     * Adjust Nexus Prisma's [runtime settings](https://pris.ly/nexus-prisma/docs/settings/runtime).
     * 
     *
     * @example
     *
     *     import { PrismaClient } from '@prisma/client'
     *     import { ApolloServer } from 'apollo-server'
     *     import { makeSchema } from 'nexus'
     *     import { User, Post, $settings } from 'nexus-prisma'
     *
     *     new ApolloServer({
     *       schema: makeSchema({
     *         types: [],
     *       }),
     *       context() {
     *         return {
     *           db: new PrismaClient(), // <-- You put Prisma client on the "db" context property
     *         }
     *       },
     *     })
     *
     *     $settings({
     *       prismaClientContextField: 'db', // <-- Tell Nexus Prisma
     *     })
     *
     * @remarks This is _different_ than Nexus Prisma's [_gentime_
     *          settings](https://pris.ly/nexus-prisma/docs/settings/gentime).
     */
    export const $settings: typeof Runtime.changeSettings
  ` + OS.EOL
  )
}

function renderTypeScriptDeclarationForEnum(enum_: DMMF.DatamodelEnum, settings: Gentime.Settings): string {
  const jsdoc = settings.data.docPropagation.JSDoc ? jsDocForEnum(enum_) + '\n' : ''
  const description = `${
    enum_.documentation && settings.data.docPropagation.GraphQLDocs ? `'${enum_.documentation}'` : 'undefined'
  }`
  return dedent`
    ${jsdoc}interface ${enum_.name} {
      name: '${enum_.name}'
      description: ${description}
      members: [${enum_.values.map((value) => `'${value.name}'`).join(', ')}]
    }
  `
}

function renderTypeScriptDeclarationForModel(model: DMMF.Model, settings: Gentime.Settings): string {
  const jsdoc = settings.data.docPropagation.JSDoc ? jsDocForModel(model) + '\n' : ''
  const description = `${
    model.documentation && settings.data.docPropagation.GraphQLDocs ? `'${model.documentation}'` : 'undefined'
  }`
  return dedent`
    ${jsdoc}interface ${model.name} {
      $name: '${model.name}'
      $description: ${description}
      ${renderTypeScriptDeclarationForModelFields(model, settings)}
    }
  `
}

function renderTypeScriptDeclarationForModelFields(model: DMMF.Model, settings: Gentime.Settings): string {
  return model.fields
    .map((field) => renderTypeScriptDeclarationForField({ field, model, settings }))
    .join('\n')
}

function renderTypeScriptDeclarationForField({
  field,
  model,
  settings,
}: {
  field: DMMF.Field
  model: DMMF.Model
  settings: Gentime.Settings
}): string {
  const jsdoc = settings.data.docPropagation.JSDoc ? jsDocForField({ field, model }) + '\n' : ''
  const description = `${
    field.documentation && settings.data.docPropagation.GraphQLDocs ? `string` : `undefined`
  }`
  return dedent`
    ${jsdoc}${field.name}: {
      /**
       * The name of this field.
       */
      name: '${field.name}'

      /**
       * The type of this field.
       */
      type: ${renderNexusType2(field, settings)}

      /**
       * The documentation of this field.
       */
      description: ${description}

      /**
       * The resolver of this field
       */
      resolve: NexusCore.FieldResolver<'${model.name}', '${field.name}'>
    }
  `
}

function renderNexusType2(field: DMMF.Field, settings: Gentime.Settings): string {
  const graphqlType = fieldTypeToGraphQLType(field, settings.data)

  if (field.isList && field.isRequired) {
    return dedent`
      NexusCore.NexusListDef<${graphqlType}> | NexusCore.NexusNonNullDef<${graphqlType}>
    `
  } else if (field.isList && !field.isRequired) {
    return dedent`
      NexusCore.NexusListDef<${graphqlType}> | NexusCore.NexusNullDef<${graphqlType}>
    `
  } else if (field.isRequired) {
    return dedent`
      NexusCore.NexusNonNullDef<'${graphqlType}'>
    `
  } else {
    return dedent`
      NexusCore.NexusNullDef<'${graphqlType}'>
    `
  }
}

/**
 * Map the fields type to a GraphQL type.
 *
 * @remarks The `settings` param type uses settings data instead of setset instance because this helper
 *          is used at runtime too where we don't have a Setset instane for gentime.
 */
export function fieldTypeToGraphQLType(
  field: DMMF.Field,
  settings: Gentime.SettingsData
): LiteralUnion<StandardGraphQLScalarType, string> {
  const fieldKind = field.kind

  switch (fieldKind) {
    case 'scalar': {
      const typeName = field.type as PrismaScalarType

      if (field.isId) {
        if (field.type === 'String' || (field.type === 'Int' && settings.projectIdIntToGraphQL === 'ID')) {
          return StandardGraphQLScalarTypes.ID
        }
      }

      switch (typeName) {
        case 'String': {
          return StandardGraphQLScalarTypes.String
        }
        case 'Int': {
          return StandardGraphQLScalarTypes.Int
        }
        case 'Boolean': {
          return StandardGraphQLScalarTypes.Boolean
        }
        case 'Float': {
          return StandardGraphQLScalarTypes.Float
        }
        case 'BigInt': {
          return 'BigInt'
        }
        case 'DateTime': {
          return 'DateTime'
        }
        case 'Json': {
          return 'Json'
        }
        case 'Bytes': {
          return 'Bytes'
        }
        case 'Decimal': {
          return 'Decimal'
        }
        default: {
          return allCasesHandled(typeName)
        }
      }
    }
    case 'enum': {
      return field.type
    }
    case 'object': {
      return field.type
    }
    case 'unsupported': {
      return field.type
    }
    default:
      allCasesHandled(fieldKind)
  }
}
