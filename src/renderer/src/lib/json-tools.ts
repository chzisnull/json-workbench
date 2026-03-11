import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser'

export interface JsonDiagnostic {
  column: number
  line: number
  message: string
  position: number
}

export interface JsonDocumentState {
  diagnostics: JsonDiagnostic[]
  formattedText: string
  minifiedText: string
  rawText: string
  stats: {
    charCount: number
    lineCount: number
  }
  status: 'invalid' | 'valid'
}

export interface JsonCompareEntry {
  after: string
  before: string
  kind: 'added' | 'changed' | 'removed'
  path: string
}

export interface JsonCompareReport {
  entries: JsonCompareEntry[]
  message: string
  stats: {
    added: number
    changed: number
    removed: number
    total: number
  }
  status: 'blocked' | 'ready'
}

function getLineColumn(source: string, position: number) {
  const lines = source.substring(0, position).split('\n')
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  }
}

export function inspectJsonDocument(rawText: string): JsonDocumentState {
  const stats = {
    charCount: rawText.length,
    lineCount: rawText.split('\n').length
  }

  const parseErrors: ParseError[] = []
  parse(rawText, parseErrors, { allowTrailingComma: false, disallowComments: true })

  if (parseErrors.length > 0) {
    const error = parseErrors[0]
    const { line, column } = getLineColumn(rawText, error.offset)
    return {
      diagnostics: [{
        line,
        column,
        position: error.offset,
        message: printParseErrorCode(error.error).replace(/([a-z])([A-Z])/g, '$1 $2')
      }],
      formattedText: rawText,
      minifiedText: rawText,
      rawText,
      stats,
      status: 'invalid'
    }
  }

  try {
    const parsed = JSON.parse(rawText)
    return {
      diagnostics: [],
      formattedText: JSON.stringify(parsed, null, 2),
      minifiedText: JSON.stringify(parsed),
      rawText,
      stats,
      status: 'valid'
    }
  } catch (e) {
    return {
      diagnostics: [{ line: 1, column: 1, position: 0, message: e instanceof Error ? e.message : 'Invalid JSON' }],
      formattedText: rawText,
      minifiedText: rawText,
      rawText,
      stats,
      status: 'invalid'
    }
  }
}

function diff(before: any, after: any, path = '$'): JsonCompareEntry[] {
  if (Object.is(before, after)) return []

  if (Array.isArray(before) && Array.isArray(after)) {
    const entries: JsonCompareEntry[] = []
    const max = Math.max(before.length, after.length)
    for (let i = 0; i < max; i++) {
      const p = `${path}[${i}]`
      if (i >= before.length) entries.push({ path: p, kind: 'added', before: '', after: JSON.stringify(after[i]) })
      else if (i >= after.length) entries.push({ path: p, kind: 'removed', before: JSON.stringify(before[i]), after: '' })
      else entries.push(...diff(before[i], after[i], p))
    }
    return entries
  }

  if (typeof before === 'object' && before !== null && typeof after === 'object' && after !== null) {
    const entries: JsonCompareEntry[] = []
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    for (const k of keys) {
      const p = `${path}.${k}`
      if (!(k in before)) entries.push({ path: p, kind: 'added', before: '', after: JSON.stringify(after[k]) })
      else if (!(k in after)) entries.push({ path: p, kind: 'removed', before: JSON.stringify(before[k]), after: '' })
      else entries.push(...diff(before[k], after[k], p))
    }
    return entries
  }

  return [{ path, kind: 'changed', before: JSON.stringify(before), after: JSON.stringify(after) }]
}

export function compareJsonDocuments(baseline: string, current: string): JsonCompareReport {
  const bDoc = inspectJsonDocument(baseline)
  const cDoc = inspectJsonDocument(current)

  if (bDoc.status === 'invalid' || cDoc.status === 'invalid') {
    return {
      status: 'blocked',
      message: 'Fix JSON errors before comparing',
      entries: [],
      stats: { added: 0, changed: 0, removed: 0, total: 0 }
    }
  }

  const entries = diff(JSON.parse(baseline), JSON.parse(current))
  const stats = entries.reduce((acc, e) => {
    acc[e.kind]++
    acc.total++
    return acc
  }, { added: 0, changed: 0, removed: 0, total: 0 })

  return { status: 'ready', message: 'Compare ready', entries, stats }
}
