import type { Component } from 'vue'

export interface FormBuilderConfig {
  apiKey?: string
  locale?: string
  messages?: Record<string, any>
  wrapper?: Record<string, Component>
}
