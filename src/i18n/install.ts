import type { App } from 'vue'
import type { I18n } from 'vue-i18n'

const I18N_KEY = '__FORM_BUILDER_I18N__'

export function installFormBuilderI18n(app: App, i18n: I18n) {
  const anyApp = app as any
  if (anyApp[I18N_KEY]) {
    anyApp[I18N_KEY] = i18n
    return anyApp[I18N_KEY] as I18n
  }
  anyApp[I18N_KEY] = i18n
  app.use(i18n)
  return i18n
}

