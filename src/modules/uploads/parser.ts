import type { Feature } from '../../domain/types'

const requiredHeaders = [
  'featureId', 'featureName', 'description', 'phaseId', 'phaseName', 'moduleName', 'priority', 'assignedTo', 'owner', 'team',
  'stage', 'status', 'progress', 'startDate', 'plannedDeadline', 'estimatedCompletionDate', 'currentTask', 'nextTask',
  'dependencies', 'blockerNote', 'qaStatus', 'designStatus', 'developmentStatus', 'lastUpdatedBy', 'lastUpdatedAt', 'clientVisibility',
]

const optionalHeaders = [
  'revisedDeadline', 'onTrackStatus', 'executiveSummary', 'mvpUrl', 'srsRequirementId', 'githubPrUrl', 'internalNotes',
]

function parseCsvLine(line: string): string[] {
  return line.split(',').map((x) => x.trim())
}

export function validateHeaders(headers: string[]): string[] {
  return requiredHeaders.filter((header) => !headers.includes(header))
}

function cell(row: Record<string, string>, key: string): string | undefined {
  return row[key]?.trim() || undefined
}

export function parseUploadCsv(content: string): { records: Feature[]; errors: string[] } {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) return { records: [], errors: ['CSV needs headers and at least one row'] }

  const headers = parseCsvLine(lines[0])
  const missing = validateHeaders(headers)
  if (missing.length > 0) return { records: [], errors: [`Missing required columns: ${missing.join(', ')}`] }

  const records: Feature[] = []
  const errors: string[] = []

  lines.slice(1).forEach((line, index) => {
    const cols = parseCsvLine(line)
    if (cols.length !== headers.length) {
      errors.push(`Row ${index + 2} column count does not match header`)
      return
    }

    const row = Object.fromEntries(headers.map((h, i) => [h, cols[i]])) as Record<string, string>
    const progress = Number(row.progress)
    if (Number.isNaN(progress) || progress < 0 || progress > 100) {
      errors.push(`Row ${index + 2} has invalid progress value`)
      return
    }

    records.push({
      featureId: row.featureId,
      featureName: row.featureName,
      description: row.description,
      phaseId: row.phaseId,
      phaseName: row.phaseName,
      moduleName: row.moduleName,
      priority: row.priority as Feature['priority'],
      assignedTo: row.assignedTo,
      owner: row.owner,
      team: row.team,
      stage: row.stage as Feature['stage'],
      status: row.status as Feature['status'],
      progress,
      startDate: row.startDate,
      plannedDeadline: row.plannedDeadline,
      revisedDeadline: cell(row, 'revisedDeadline'),
      estimatedCompletionDate: row.estimatedCompletionDate,
      onTrackStatus: (cell(row, 'onTrackStatus') ?? 'On Track') as Feature['onTrackStatus'],
      currentTask: row.currentTask,
      nextTask: row.nextTask,
      dependencies: row.dependencies ? row.dependencies.split('|') : [],
      blockerNote: row.blockerNote,
      qaStatus: row.qaStatus,
      designStatus: row.designStatus,
      developmentStatus: row.developmentStatus,
      lastUpdatedBy: row.lastUpdatedBy,
      lastUpdatedAt: row.lastUpdatedAt,
      clientVisibility: row.clientVisibility === 'true',
      executiveSummary: cell(row, 'executiveSummary'),
      mvpUrl: cell(row, 'mvpUrl'),
      srsRequirementId: cell(row, 'srsRequirementId'),
      githubPrUrl: cell(row, 'githubPrUrl'),
      internalNotes: cell(row, 'internalNotes'),
    })
  })

  return { records, errors }
}

export function uploadTemplateHeaders(): string {
  return `${requiredHeaders.join(',')},${optionalHeaders.join(',')}\n`
}
