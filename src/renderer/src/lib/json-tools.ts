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

function clampPosition(source: string, position: number): number {
  if (!Number.isFinite(position)) {
    return 0
  }

  return Math.max(0, Math.min(position, source.length))
}

function getLineColumnFromPosition(
  source: string,
  position: number
): Pick<JsonDiagnostic, 'column' | 'line'> {
  const safePosition = clampPosition(source, position)
  let line = 1
  let column = 1

  for (let index = 0; index < safePosition; index += 1) {
    if (source[index] === '\n') {
      line += 1
      column = 1
    } else {
      column += 1
    }
  }

  return { column, line }
}

function formatParseErrorMessage(parseError: ParseError): string {
  const code = printParseErrorCode(parseError.error)
  return code.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function createJsonDiagnostic(parseError: ParseError, source: string): JsonDiagnostic {
  const position = clampPosition(source, parseError.offset)
  const { column, line } = getLineColumnFromPosition(source, position)

  return {
    column,
    line,
    message: formatParseErrorMessage(parseError),
    position
  }
}

export function inspectJsonDocument(rawText: string): JsonDocumentState {
  const stats = {
    charCount: rawText.length,
    lineCount: rawText.split('\n').length
  }

  const parseErrors: ParseError[] = []
  parse(rawText, parseErrors, {
    allowTrailingComma: false,
    disallowComments: true
  })

  if (parseErrors.length > 0) {
    return {
      diagnostics: [createJsonDiagnostic(parseErrors[0], rawText)],
      formattedText: rawText,
      minifiedText: rawText,
      rawText,
      stats,
      status: 'invalid'
    }
  }

  try {
    const parsedValue = JSON.parse(rawText)
    return {
      diagnostics: [],
      formattedText: JSON.stringify(parsedValue, null, 2),
      minifiedText: JSON.stringify(parsedValue),
      rawText,
      stats,
      status: 'valid'
    }
  } catch (error) {
    return {
      diagnostics: [
        {
          ...getLineColumnFromPosition(rawText, 0),
          message:
            error instanceof Error && error.message.length > 0
              ? error.message
              : 'Invalid JSON input',
          position: 0
        }
      ],
      formattedText: rawText,
      minifiedText: rawText,
      rawText,
      stats,
      status: 'invalid'
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatCompareValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  if (value === undefined) {
    return 'undefined'
  }

  return JSON.stringify(value)
}

function joinComparePath(parentPath: string, segment: string | number): string {
  if (typeof segment === 'number') {
    return `${parentPath}[${segment}]`
  }

  return `${parentPath}.${segment}`
}

function createCompareEntry(
  path: string,
  kind: JsonCompareEntry['kind'],
  before: unknown,
  after: unknown
): JsonCompareEntry {
  return {
    after: formatCompareValue(after),
    before: formatCompareValue(before),
    kind,
    path
  }
}

function diffJsonValues(before: unknown, after: unknown, path = '$'): JsonCompareEntry[] {
  if (Object.is(before, after)) {
    return []
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const maxLength = Math.max(before.length, after.length)
    const entries: JsonCompareEntry[] = []

    for (let index = 0; index < maxLength; index += 1) {
      const nextPath = joinComparePath(path, index)

      if (index >= before.length) {
        entries.push(createCompareEntry(nextPath, 'added', undefined, after[index]))
        continue
      }

      if (index >= after.length) {
        entries.push(createCompareEntry(nextPath, 'removed', before[index], undefined))
        continue
      }

      entries.push(...diffJsonValues(before[index], after[index], nextPath))
    }

    return entries
  }

  if (isRecord(before) && isRecord(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
    const entries: JsonCompareEntry[] = []

    for (const key of keys) {
      const nextPath = joinComparePath(path, key)

      if (!(key in before)) {
        entries.push(createCompareEntry(nextPath, 'added', undefined, after[key]))
        continue
      }

      if (!(key in after)) {
        entries.push(createCompareEntry(nextPath, 'removed', before[key], undefined))
        continue
      }

      entries.push(...diffJsonValues(before[key], after[key], nextPath))
    }

    return entries
  }

  return [createCompareEntry(path, 'changed', before, after)]
}

export function compareJsonDocuments(baselineText: string, currentText: string): JsonCompareReport {
  const baselineDocument = inspectJsonDocument(baselineText)
  const currentDocument = inspectJsonDocument(currentText)

  if (baselineDocument.status === 'invalid') {
    return {
      entries: [],
      message: `Baseline JSON is invalid at line ${baselineDocument.diagnostics[0].line}, column ${baselineDocument.diagnostics[0].column}.`,
      stats: {
        added: 0,
        changed: 0,
        removed: 0,
        total: 0
      },
      status: 'blocked'
    }
  }

  if (currentDocument.status === 'invalid') {
    return {
      entries: [],
      message: `Current draft is invalid at line ${currentDocument.diagnostics[0].line}, column ${currentDocument.diagnostics[0].column}.`,
      stats: {
        added: 0,
        changed: 0,
        removed: 0,
        total: 0
      },
      status: 'blocked'
    }
  }

  const baselineValue = JSON.parse(baselineDocument.rawText)
  const currentValue = JSON.parse(currentDocument.rawText)
  const entries = diffJsonValues(baselineValue, currentValue)

  const stats = entries.reduce(
    (result, entry) => {
      result[entry.kind] += 1
      result.total += 1
      return result
    },
    {
      added: 0,
      changed: 0,
      removed: 0,
      total: 0
    }
  )

  return {
    entries,
    message: entries.length > 0 ? 'Compare ready' : 'Compare ready: no differences detected',
    stats,
    status: 'ready'
  }
}
