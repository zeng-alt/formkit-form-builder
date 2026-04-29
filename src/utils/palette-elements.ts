import type { DslNode } from '@/dsl/types'
import {
  DEFAULT_DATE_TIME_VALUE_FORMAT,
  DEFAULT_DATE_VALUE_FORMAT,
  DEFAULT_TIME_VALUE_FORMAT,
} from './default-form-elements'

export type PaletteCategory = 'fields' | 'structure' | 'static'

export type PaletteItem = {
  key: string
  name: string
  description: string
  icon: string
  category: PaletteCategory
  node: DslNode
}

const tOpt = (t: (key: string, params?: Record<string, string | number>) => string, key: string) => {
  const v = t(key)
  return v === key ? undefined : v
}

const mk = (key: string) => `tpl_${key}`

export function createPaletteItems(
  t: (key: string, params?: Record<string, string | number>) => string,
): PaletteItem[] {
  const element = (key: string): PaletteItem => {
    const name = t(`elements.${key}.name`)
    const description = t(`elements.${key}.description`)
    const label = tOpt(t, `elements.${key}.label`)
    const placeholder = tOpt(t, `elements.${key}.placeholder`)
    const help = tOpt(t, `elements.${key}.help`)

    const node: DslNode = {
      id: mk(key),
      kind: 'formkit',
      type: key,
      field: key,
      label: label ?? name,
      layout: { span: 12 },
      props: {
        ...(placeholder ? { placeholder } : {}),
        ...(help ? { help } : {}),
      },
    }

    return {
      key,
      name,
      description,
      icon: '',
      category: 'fields',
      node,
    }
  }

  const staticEl = (key: string, node: DslNode): PaletteItem => {
    const name = t(`elements.${key}.name`)
    const description = t(`elements.${key}.description`)
    return { key, name, description, icon: '', category: 'static', node }
  }

  const structureEl = (key: string, node: DslNode): PaletteItem => {
    const name = t(`elements.${key}.name`)
    const description = t(`elements.${key}.description`)
    return { key, name, description, icon: '', category: 'structure', node }
  }

  const base = [
    element('text'),
    element('textarea'),
    element('email'),
    element('number'),
    element('url'),
    element('tel'),
    element('password'),
    (() => {
      const it = element('select')
      it.node.props = { ...it.node.props, options: ['one'], placeholder: t('elements.common.selectPlaceholder') }
      return it
    })(),
    (() => {
      const it = element('checkbox')
      it.node.props = { ...it.node.props, options: ['One'] }
      return it
    })(),
    (() => {
      const it = element('radio')
      it.node.props = { ...it.node.props, options: ['one'] }
      return it
    })(),
    element('range'),
    (() => {
      const it = element('date')
      it.node.props = { ...it.node.props, valueFormat: DEFAULT_DATE_VALUE_FORMAT, type: 'date' }
      return it
    })(),
    (() => {
      const it = element('time')
      it.node.props = { ...it.node.props, valueFormat: DEFAULT_TIME_VALUE_FORMAT }
      return it
    })(),
    (() => {
      const it = element('naiveDateTime')
      it.node.props = { ...it.node.props, valueFormat: DEFAULT_DATE_TIME_VALUE_FORMAT, type: 'datetime' }
      return it
    })(),
    (() => {
      const it = element('file')
      it.node.props = { ...it.node.props, accept: '.pdf,.doc,.docx,.xml,.md,.csv,.jpg,.png,.webp', multiple: false }
      return it
    })(),
    element('color'),
    (() => {
      const it = element('naiveCascader')
      it.node.props = {
        ...it.node.props,
        options: [
          {
            label: 'Option 1',
            value: '1',
            children: [
              { label: 'Option 1-1', value: '1-1' },
              { label: 'Option 1-2', value: '1-2' },
            ],
          },
          { label: 'Option 2', value: '2' },
        ],
      }
      return it
    })(),
    (() => {
      const it = element('naiveTreeSelect')
      it.node.props = {
        ...it.node.props,
        options: [
          {
            label: 'Node 1',
            key: '1',
            children: [
              { label: 'Node 1-1', key: '1-1' },
              { label: 'Node 1-2', key: '1-2' },
            ],
          },
          { label: 'Node 2', key: '2' },
        ],
      }
      return it
    })(),
    (() => {
      const it = element('naiveMention')
      it.node.props = { ...it.node.props, options: ['alice', 'bob'] }
      return it
    })(),
    element('naiveRate'),
    element('naiveSwitch'),
  ]

  const statics: PaletteItem[] = [
    staticEl('naiveAvatar', {
      id: mk('naiveAvatar'),
      kind: 'formkit',
      type: 'naiveAvatar',
      label: tOpt(t, 'elements.naiveAvatar.label') ?? t('elements.naiveAvatar.name'),
      layout: { span: 12 },
      props: { src: '', avatarSize: 48, round: true, bordered: false, fallbackText: 'A' },
    }),
    staticEl('naiveImage', {
      id: mk('naiveImage'),
      kind: 'formkit',
      type: 'naiveImage',
      label: tOpt(t, 'elements.naiveImage.label') ?? t('elements.naiveImage.name'),
      layout: { span: 12 },
      props: { src: '', alt: '', width: 240, height: 160, objectFit: 'cover', previewDisabled: false, lazy: false },
    }),
    staticEl('naiveText', {
      id: mk('naiveText'),
      kind: 'formkit',
      type: 'naiveText',
      layout: { span: 12 },
      props: { text: 'text', type: 'default', depth: 1, strong: false, italic: false, underline: false, delete: false, code: false },
    }),
    staticEl('naiveP', {
      id: mk('naiveP'),
      kind: 'formkit',
      type: 'naiveP',
      layout: { span: 12 },
      props: { type: 'default', depth: 1, align: 'start', text: 'text' },
    }),
    staticEl('naiveA', {
      id: mk('naiveA'),
      kind: 'formkit',
      type: 'naiveA',
      layout: { span: 12 },
      props: { text: 'text', href: 'https://www.example.com', target: '_blank' },
    }),
    staticEl('naiveBlockquote', {
      id: mk('naiveBlockquote'),
      kind: 'formkit',
      type: 'naiveBlockquote',
      layout: { span: 12 },
      props: { text: 'text' },
    }),
    ...(['naiveH1', 'naiveH2', 'naiveH3', 'naiveH4', 'naiveH5', 'naiveH6'] as const).map((k) =>
      staticEl(k, {
        id: mk(k),
        kind: 'formkit',
        type: k,
        layout: { span: 12 },
        props: { text: 'text' },
      }),
    ),
    staticEl('naiveUl', {
      id: mk('naiveUl'),
      kind: 'formkit',
      type: 'naiveUl',
      layout: { span: 12 },
      props: { options: ['Item 1', 'Item 2', 'Item 3'] },
    }),
    staticEl('naiveOl', {
      id: mk('naiveOl'),
      kind: 'formkit',
      type: 'naiveOl',
      layout: { span: 12 },
      props: { options: ['Item 1', 'Item 2', 'Item 3'] },
    }),
    staticEl('naiveLi', {
      id: mk('naiveLi'),
      kind: 'formkit',
      type: 'naiveLi',
      layout: { span: 12 },
      props: { value: 'List Item' },
    }),
    staticEl('naiveDivider', {
      id: mk('naiveDivider'),
      kind: 'formkit',
      type: 'naiveDivider',
      layout: { span: 12 },
      props: { title: 'Divider', titlePlacement: 'center', dashed: false, vertical: false },
    }),
    staticEl('naiveAlert', {
      id: mk('naiveAlert'),
      kind: 'formkit',
      type: 'naiveAlert',
      label: tOpt(t, 'elements.naiveAlert.label') ?? t('elements.naiveAlert.name'),
      layout: { span: 12 },
      props: { title: 'Title', content: 'Alert', type: 'default', closable: false, bordered: false, showIcon: true },
    }),
    staticEl('naiveBackTop', {
      id: mk('naiveBackTop'),
      kind: 'formkit',
      type: 'naiveBackTop',
      layout: { span: 12 },
      props: { show: true, right: 40, bottom: 40, visibilityHeight: 0 },
    }),
    staticEl('naiveButton', {
      id: mk('naiveButton'),
      kind: 'formkit',
      type: 'naiveButton',
      label: tOpt(t, 'elements.naiveButton.label') ?? t('elements.naiveButton.name'),
      layout: { span: 12 },
      props: {
        type: 'button',
        buttonText: tOpt(t, 'elements.naiveButton.label') ?? 'Button',
        buttonProps: {
          block: false,
          bordered: true,
          circle: false,
          dashed: false,
          disabled: false,
          focusable: true,
          fullWidth: false,
          align: 'left',
          ghost: false,
          round: false,
          secondary: false,
          size: 'medium',
          type: 'default',
        },
      },
    }),
    staticEl('submit', {
      id: mk('submit'),
      kind: 'formkit',
      type: 'submit',
      field: 'submit',
      label: tOpt(t, 'elements.submit.label') ?? t('elements.submit.name'),
      layout: { span: 12 },
      props: {
        type: 'submit',
        buttonText: tOpt(t, 'elements.submit.label') ?? 'Submit',
        buttonProps: { type: 'primary', size: 'medium' },
      },
    }),
    staticEl('reset', {
      id: mk('reset'),
      kind: 'formkit',
      type: 'reset',
      field: 'reset',
      label: tOpt(t, 'elements.reset.label') ?? t('elements.reset.name'),
      layout: { span: 12 },
      props: {
        type: 'reset',
        buttonText: tOpt(t, 'elements.reset.label') ?? 'Reset',
        buttonProps: { type: 'default', size: 'medium' },
      },
    }),
  ]

  const structures: PaletteItem[] = [
    structureEl('group', {
      id: mk('group'),
      kind: 'formkit',
      type: 'group',
      field: 'group',
      label: tOpt(t, 'elements.group.label') ?? t('elements.group.name'),
      layout: { span: 12 },
      children: [],
    }),
    structureEl('list', {
      id: mk('list'),
      kind: 'cmp',
      type: 'list',
      layout: { span: 12 },
      props: { showActions: false, label: tOpt(t, 'elements.list.label') ?? t('elements.list.name') },
      children: [],
    }),
    structureEl('card', {
      id: mk('card'),
      kind: 'cmp',
      type: 'card',
      layout: { span: 12 },
      props: { label: tOpt(t, 'elements.card.label') ?? t('elements.card.name') },
      children: [],
    }),
    structureEl('inputGroup', {
      id: mk('inputGroup'),
      kind: 'cmp',
      type: 'inputGroup',
      layout: { span: 12 },
      props: { label: tOpt(t, 'elements.inputGroup.label') ?? t('elements.inputGroup.name') },
      children: [],
    }),
    structureEl('tabs', {
      id: mk('tabs'),
      kind: 'cmp',
      type: 'tabs',
      layout: { span: 12 },
      props: { label: tOpt(t, 'elements.tabs.label') ?? t('elements.tabs.name') },
    }),
  ]

  return [...base, ...structures, ...statics]
}
