import nextEnv from '@next/env'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
nextEnv.loadEnvConfig(projectRoot)

function expandEnvironmentVariables(value) {
  return value.replace(/%([^%]+)%/g, (match, name) => process.env[name] || match)
}

function getBackupDirectory() {
  const configured = process.env.STORE_BACKUP_DIR
  const defaultRoot = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const value = configured || path.join(defaultRoot, 'VoltCoreERP', 'backups')
  const expanded = expandEnvironmentVariables(value)

  if (/%[^%]+%/.test(expanded)) {
    throw new Error('STORE_BACKUP_DIR contains an environment variable that is not set.')
  }

  return path.resolve(expanded)
}

function getRetentionDays() {
  const value = Number(process.env.STORE_BACKUP_RETENTION_DAYS || 30)
  if (!Number.isInteger(value) || value < 1 || value > 3650) {
    throw new Error('STORE_BACKUP_RETENTION_DAYS must be a whole number between 1 and 3650.')
  }
  return value
}

function getPostgresTools() {
  const configuredDump = process.env.PG_DUMP_PATH
  const defaultDump = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe'
  const pgDump = configuredDump || (process.platform === 'win32' && requireFile(defaultDump) ? defaultDump : 'pg_dump')

  if (configuredDump && !requireFile(configuredDump)) {
    throw new Error('PG_DUMP_PATH does not point to an existing pg_dump executable.')
  }

  const configuredRestore = process.env.PG_RESTORE_PATH
  const adjacentRestore = path.join(path.dirname(pgDump), process.platform === 'win32' ? 'pg_restore.exe' : 'pg_restore')
  const pgRestore = configuredRestore || (requireFile(adjacentRestore) ? adjacentRestore : 'pg_restore')
  if (configuredRestore && !requireFile(configuredRestore)) {
    throw new Error('PG_RESTORE_PATH does not point to an existing pg_restore executable.')
  }

  return { pgDump, pgRestore }
}

function requireFile(filePath) {
  return Boolean(filePath && existsSync(filePath))
}

function getDatabaseEnvironment() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.')
  }

  const url = new URL(connectionString)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol.')
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  if (!database || !url.hostname) {
    throw new Error('DATABASE_URL must specify a database and host.')
  }

  const env = { ...process.env }
  env.PGHOST = url.hostname
  env.PGPORT = url.port || '5432'
  env.PGDATABASE = database
  if (url.username) env.PGUSER = decodeURIComponent(url.username)
  if (url.password) env.PGPASSWORD = decodeURIComponent(url.password)

  const sslMode = url.searchParams.get('sslmode')
  if (sslMode) env.PGSSLMODE = sslMode

  return { env, database }
}

function run(executable, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    child.stderr.setEncoding('utf8')
    child.stderr.on('data', chunk => {
      if (stderr.length < 8192) stderr += chunk
    })
    child.once('error', reject)
    child.once('close', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${path.basename(executable)} exited with code ${code}: ${stderr.trim() || 'no error details'}`))
      }
    })
  })
}

function formatTimestamp(date) {
  const pad = value => String(value).padStart(2, '0')
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}-${milliseconds}`
}

async function pruneOldBackups(directory, retentionDays, now) {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000
  const entries = await readdir(directory, { withFileTypes: true })
  let removed = 0

  for (const entry of entries) {
    if (!entry.isFile() || !/^voltcore-erp-\d{8}-\d{6}(?:-\d{3})?\.dump$/.test(entry.name)) continue
    const filePath = path.join(directory, entry.name)
    if ((await stat(filePath)).mtimeMs < cutoff) {
      await rm(filePath)
      removed += 1
    }
  }

  return removed
}

async function createBackup() {
  const directory = getBackupDirectory()
  const retentionDays = getRetentionDays()
  const { pgDump, pgRestore } = getPostgresTools()
  const { env, database } = getDatabaseEnvironment()
  const now = new Date()
  const fileName = `voltcore-erp-${formatTimestamp(now)}.dump`
  const destination = path.join(directory, fileName)
  const temporary = `${destination}.partial-${process.pid}`

  await mkdir(directory, { recursive: true })

  try {
    await run(pgDump, ['--format=custom', '--no-owner', '--no-acl', `--file=${temporary}`], env)
    const backupStat = await stat(temporary)
    if (backupStat.size === 0) throw new Error('pg_dump created an empty backup.')
    await run(pgRestore, ['--list', temporary], env)
    await rename(temporary, destination)
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }

  const removed = await pruneOldBackups(directory, retentionDays, now)
  console.log(`Created PostgreSQL backup for ${database}: ${destination} (${(await stat(destination)).size} bytes).`)
  console.log(`Retention: ${retentionDays} days; removed ${removed} expired backup(s).`)
}

createBackup().catch(error => {
  console.error(`Database backup failed: ${error.message}`)
  process.exitCode = 1
})
