const fs = require('fs');
const path = require('path');

// Carregar o schema do PocketBase
const pocketbaseSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'pocketbase_schema_import.json'), 'utf8'));

// Converter o schema do PocketBase para o formato do Directus
function convertToDirectusSchema(pocketbaseSchema) {
  const directusSchema = {
    collections: [],
    fields: [],
    relations: []
  };

  // Mapear coleções
  pocketbaseSchema.forEach(collection => {
    // Ignorar coleções de sistema do PocketBase
    if (collection.system) return;

    const directusCollection = {
      collection: collection.name,
      meta: {
        icon: 'box',
        note: null,
        display_template: null,
        hidden: false,
        singleton: false,
        sort_field: null,
        archive_field: null,
        archive_app_filter: true,
        archive_value: null,
        unarchive_value: null,
        sort: 1,
        group: null,
        translations: null
      },
      schema: {
        name: collection.name,
        comment: null
      }
    };

    directusSchema.collections.push(directusCollection);

    // Mapear campos
    collection.schema.forEach(field => {
      const directusField = {
        collection: collection.name,
        field: field.name,
        type: mapFieldType(field.type),
        meta: {
          collection: collection.name,
          conditions: null,
          display: null,
          display_options: null,
          group: null,
          hidden: false,
          interface: mapFieldInterface(field.type),
          note: null,
          options: mapFieldOptions(field),
          readonly: false,
          required: field.required || false,
          special: mapFieldSpecial(field),
          translations: null,
          validation: null,
          validation_message: null,
          width: 'full'
        },
        schema: {
          name: field.name,
          table: collection.name,
          column: field.name,
          data_type: mapDataType(field.type),
          default_value: null,
          max_length: null,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: !field.required,
          is_unique: field.unique || false,
          is_primary_key: false,
          is_generated: false,
          generation_expression: null,
          has_auto_increment: false,
          foreign_key_table: null,
          foreign_key_column: null
        }
      };

      directusSchema.fields.push(directusField);

      // Mapear relações
      if (field.type === 'relation') {
        const relation = {
          collection: collection.name,
          field: field.name,
          related_collection: field.options.collectionId.replace('_pb_users_auth_', 'directus_users'),
          schema: {
            on_delete: field.options.cascadeDelete ? 'CASCADE' : 'NO ACTION'
          }
        };

        directusSchema.relations.push(relation);
      }
    });
  });

  return directusSchema;
}

// Funções de mapeamento de tipos
function mapFieldType(pbType) {
  const typeMap = {
    'text': 'string',
    'number': 'integer',
    'bool': 'boolean',
    'date': 'datetime',
    'json': 'json',
    'select': 'string',
    'file': 'uuid',
    'relation': 'uuid'
  };

  return typeMap[pbType] || 'string';
}

function mapFieldInterface(pbType) {
  const interfaceMap = {
    'text': 'input',
    'number': 'numeric',
    'bool': 'boolean',
    'date': 'datetime',
    'json': 'json',
    'select': 'select-dropdown',
    'file': 'file',
    'relation': 'many-to-one'
  };

  return interfaceMap[pbType] || 'input';
}

function mapFieldOptions(field) {
  if (field.type === 'select') {
    return {
      choices: field.options.values.map(value => ({
        text: value,
        value: value
      }))
    };
  }

  if (field.type === 'file') {
    return {
      folder: 'files',
      crop: false,
      crop_ratio: null,
      crop_gravity: 'center',
      quality: 80
    };
  }

  return {};
}

function mapFieldSpecial(field) {
  if (field.type === 'relation') {
    return 'm2o';
  }

  return null;
}

function mapDataType(pbType) {
  const typeMap = {
    'text': 'character varying',
    'number': 'integer',
    'bool': 'boolean',
    'date': 'timestamp without time zone',
    'json': 'json',
    'select': 'character varying',
    'file': 'uuid',
    'relation': 'uuid'
  };

  return typeMap[pbType] || 'character varying';
}

// Converter o schema
const directusSchema = convertToDirectusSchema(pocketbaseSchema);

// Salvar o schema convertido
fs.writeFileSync(
  path.join(__dirname, 'directus-schema.json'),
  JSON.stringify(directusSchema, null, 2)
);

console.log('Schema convertido com sucesso! Salvo em directus-schema.json');