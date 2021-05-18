import { DMMF } from '@prisma/generator-helper'
import endent from 'endent'
import { LiteralUnion } from 'type-fest'
import { StandardGraphQLScalarType, StandardgraphQLScalarTypes } from '../../helpers/graphql'
import { PrismaScalarType } from '../../helpers/prisma'
import { allCasesHandled } from '../../helpers/utils'
import { Gentime } from '../gentime/settingsSingleton'
import { jsDocForEnum, jsDocForField, jsDocForModel } from '../helpers/JSDocTemplates'
import { ModuleSpec } from '../types'

export function createModuleSpec(dmmf: DMMF.Document, settings: Gentime.Settings): ModuleSpec {
  return {
    fileName: 'index.d.ts',
    content: endent`
        ${renderTypeScriptDeclarationForDocumentModels(dmmf, settings)}
      `,
  }
}

const NO_ENUMS_DEFINED_COMMENT = endent`
  // N/A –– You have not defined any models in your Prisma schema file.
`

const NO_MODELS_DEFINED_COMMENT = endent`
  // N/A –– You have not defined any enums in your Prisma schema file.
`

export function renderTypeScriptDeclarationForDocumentModels(
  dmmf: DMMF.Document,
  settings: Gentime.Settings
): string {
  const models = dmmf.datamodel.models
  const enums = dmmf.datamodel.enums

  return endent`
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
              return endent`
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
              return endent`
                ${jsdoc}export const ${enum_.name}: $Types.${enum_.name}
              `
            })
            .join('\n\n')
    }
  `
}

function renderTypeScriptDeclarationForEnum(enum_: DMMF.DatamodelEnum, settings: Gentime.Settings): string {
  const jsdoc = settings.data.docPropagation.JSDoc ? jsDocForEnum(enum_) + '\n' : ''
  const description = `${
    enum_.documentation && settings.data.docPropagation.GraphQLDocs ? `'${enum_.documentation}'` : 'undefined'
  }`
  return endent`
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
  return endent`
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
  return endent`
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
  const graphqlType = fieldTypeToGraphQLType(field, settings)

  if (field.isList && field.isRequired) {
    return endent`
      NexusCore.ListDef<${graphqlType}> | NexusCore.NexusNonNullDef<${graphqlType}>
    `
  } else if (field.isList && !field.isRequired) {
    return endent`
      NexusCore.ListDef<${graphqlType}> | NexusCore.NexusNullDef<${graphqlType}>
    `
  } else if (field.isRequired) {
    return endent`
      NexusCore.NexusNonNullDef<'${graphqlType}'>
    `
  } else {
    return endent`
      NexusCore.NexusNullDef<'${graphqlType}'>
    `
  }
}

/** Map the fields type to a GraphQL type */
export function fieldTypeToGraphQLType(
  field: DMMF.Field,
  settings: Gentime.Settings
): LiteralUnion<StandardGraphQLScalarType, string> {
  const fieldKind = field.kind

  switch (fieldKind) {
    case 'scalar': {
      const typeName = field.type as PrismaScalarType

      if (field.isId) {
        if (field.type === 'String' || (field.type === 'Int' && !settings.data.mapIdIntToGraphQLInt)) {
          return StandardgraphQLScalarTypes.ID
        }
      }

      switch (typeName) {
        case 'String': {
          return StandardgraphQLScalarTypes.String
        }
        case 'Int': {
          return StandardgraphQLScalarTypes.Int
        }
        case 'Boolean': {
          return StandardgraphQLScalarTypes.Boolean
        }
        case 'Float': {
          return StandardgraphQLScalarTypes.Float
        }
        case 'BigInt': {
          return StandardgraphQLScalarTypes.String
        }
        case 'DateTime': {
          return 'DateTime'
        }
        case 'Json': {
          return 'Json'
        }
        case 'Bytes': {
          return StandardgraphQLScalarTypes.String
        }
        case 'Decimal': {
          return StandardgraphQLScalarTypes.String
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
