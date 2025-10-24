const fs = require('fs');
const path = require('path');

// Ler o esquema do PocketBase
const pocketbaseSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'pocketbase_schema_import.json'), 'utf8'));

// Converter para o formato do Directus
const directusCollections = [];
const directusFields = [];
const directusRelations = [];

// Mapeamento de tipos do PocketBase para Directus
const typeMapping = {
  'text': 'text',
  'number': 'integer',
  'bool': 'boolean',
  'date': 'timestamp',
  'json': 'json',
  'select': 'select',
  'file': 'file',
  'relation': 'relational'
};

// Processar cada coleção do PocketBase
for (const pbCollection of pocketbaseSchema) {
  // Criar coleção no formato Directus
  const directusCollection = {
    collection: pbCollection.name,
    meta: {
      note: null,
      icon: null,
      display_template: null,
      hidden: false,
      singleton: false,
      translations: null
    },
    schema: {
      name: pbCollection.name
    }
  };

  if (pbCollection.type === 'auth') {
    directusCollection.meta.collection = 'directus_users';
    directusCollection.schema.name = 'directus_users';
  }

  directusCollections.push(directusCollection);

  // Processar cada campo da coleção
  for (const pbField of pbCollection.schema) {
    // Pular campos de sistema
    if (pbField.id.startsWith('_')) continue;
    
    const directusField = {
      collection: pbCollection.type === 'auth' ? 'directus_users' : pbCollection.name,
      field: pbField.name,
      type: typeMapping[pbField.type] || 'text',
      meta: {
        collection: pbCollection.type === 'auth' ? 'directus_users' : pbCollection.name,
        conditions: null,
        display: null,
        display_options: null,
        group: null,
        hidden: false,
        interface: null,
        note: null,
        options: null,
        readonly: false,
        required: pbField.required || false,
        special: null,
        translations: null,
        validation: null,
        validation_message: null,
        width: 'full'
      },
      schema: {
        name: pbField.name,
        data_type: typeMapping[pbField.type] || 'text',
        default_value: null,
        max_length: null,
        is_nullable: !pbField.required,
        is_unique: pbField.unique || false,
        has_auto_increment: false,
        is_primary_key: false
      }
    };

    // Configurar tipos específicos
    if (pbField.type === 'select' && pbField.options.values) {
      directusField.meta.interface = 'select-dropdown';
      directusField.meta.options = {
        choices: pbField.options.values.map(value => ({
          text: value,
          value: value
        }))
      };
    }

    // Configurar campos de relação
    if (pbField.type === 'relation') {
      const relatedCollection = pocketbaseSchema.find(c => c.id === pbField.options.collectionId);
      if (relatedCollection) {
        const relatedCollectionName = relatedCollection.type === 'auth' ? 'directus_users' : relatedCollection.name;
        
        directusField.type = 'relational';
        directusField.meta.interface = 'many-to-one';
        directusField.meta.special = 'many-to-one';
        directusField.schema.foreign_key_table = relatedCollectionName;
        directusField.schema.foreign_key_column = 'id';
        
        // Criar relação no formato Directus
        const relation = {
          collection: pbCollection.type === 'auth' ? 'directus_users' : pbCollection.name,
          field: pbField.name,
          related_collection: relatedCollectionName,
          meta: {
            one_collection: pbCollection.type === 'auth' ? 'directus_users' : pbCollection.name,
            one_field: pbField.name,
            one_collection_field: pbField.name,
            many_collection: relatedCollectionName,
            many_field: null,
            many_collection_field: null,
            junction_collection: null,
            junction_field: null
          },
          schema: {
            on_delete: pbField.options.cascadeDelete ? 'CASCADE' : 'SET NULL'
          }
        };
        
        directusRelations.push(relation);
      }
    }

    directusFields.push(directusField);
  }
}

// Salvar os arquivos de configuração do Directus
fs.writeFileSync(path.join(__dirname, 'directus-collections.json'), JSON.stringify(directusCollections, null, 2));
fs.writeFileSync(path.join(__dirname, 'directus-fields.json'), JSON.stringify(directusFields, null, 2));
fs.writeFileSync(path.join(__dirname, 'directus-relations.json'), JSON.stringify(directusRelations, null, 2));

console.log('Migração de esquema concluída!');
console.log('Arquivos criados:');
console.log('- directus-collections.json');
console.log('- directus-fields.json');
console.log('- directus-relations.json');