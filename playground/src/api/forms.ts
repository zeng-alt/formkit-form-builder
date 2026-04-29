import axios from 'axios'
import type { FormDslDocument } from '@/dsl/types'

export type LoadFormResponse = {
  formId: string
  formName: string
  dsl: FormDslDocument
}

export async function loadForm(params: { baseURL: string; token: string; formId: string }) {
  const { baseURL, token, formId } = params
  const url = `${baseURL.replace(/\/$/, '')}/forms/${encodeURIComponent(formId)}`
  const res = await axios.get<LoadFormResponse>(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

export async function saveForm(params: {
  baseURL: string
  token: string
  formId: string
  formName: string
  dsl: FormDslDocument
}) {
  const { baseURL, token, formId, formName, dsl } = params
  const url = `${baseURL.replace(/\/$/, '')}/forms/${encodeURIComponent(formId)}`
  const res = await axios.put<LoadFormResponse>(
    url,
    { formName, dsl },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return res.data
}
