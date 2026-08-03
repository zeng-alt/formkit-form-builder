import { dslToSchema } from './src/dsl'
import type { FormDefinition } from './src/types/dsl'

const dsl: FormDefinition = {
  version: 2,
  id: 't',
  name: 'form',
  settings: { layout: 'vertical' },
  root: {
    id: 'root',
    category: 'container',
    type: 'group',
    renderAs: 'formkit',
    dataType: 'object',
    children: [
      {
        id: 'g1',
        category: 'container',
        type: 'group',
        renderAs: 'formkit',
        dataType: 'object',
        name: 'field_1',
        key: '64d3319e',
        label: '分组',
        children: [
          {
            id: 'c1',
            category: 'field',
            type: 'text',
            renderAs: 'formkit',
            name: 'a',
            label: 'A',
            layout: { colspan: 6 },
          },
          { id: 'c2', category: 'field', type: 'text', renderAs: 'formkit', name: 'b', label: 'B' },
          {
            id: 'c3',
            category: 'field',
            type: 'text',
            renderAs: 'cmp',
            name: 'c',
            label: 'C',
            layout: { colspan: 4 },
          },
        ],
      },
    ],
  },
}

const schema = dslToSchema(dsl)
console.log(JSON.stringify(schema, null, 2))
