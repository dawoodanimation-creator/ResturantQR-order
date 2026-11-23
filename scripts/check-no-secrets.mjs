#!/usr/bin/env node

/**
 * Secret Audit Script
 * Fails if:
 * 1. Any .env file other than .env.example is tracked in git or staged.
 * 2. Any migrations contain hardcoded demo passwords.
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let hasErrors = false

// 1. Check Git Tracked and Staged Files
try {
  const trackedFiles = execSync('git ls-files', { encoding: 'utf-8' }).split(/\r?\n/).filter(Boolean)
  const stagedFiles = execSync('git diff --name-only --cached', { encoding: 'utf-8' }).split(/\r?\n/).filter(Boolean)
  const allGitFiles = Array.from(new Set([...trackedFiles, ...stagedFiles]))

  for (const file of allGitFiles) {
    const baseName = path.basename(file)
    if (baseName.startsWith('.env') && baseName !== '.env.example') {
      console.error(`[SECURITY ERROR] Prohibited environment file is tracked or staged in git: ${file}`)
      hasErrors = true
    }
  }
} catch (err) {
  const message = err && typeof err === 'object' && 'message' in err ? err.message : String(err)
  console.warn(`[WARNING] Git check failed: ${message}`)
}

// 2. Check Migrations for Passwords/Secrets
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
if (fs.existsSync(migrationsDir)) {
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
  for (const file of migrationFiles) {
    const fullPath = path.join(migrationsDir, file)
    const content = fs.readFileSync(fullPath, 'utf-8')

    // Check for hardcoded password assignments (e.g. encrypted_password, password123, etc.)
    if (/encrypted_password\s*[:=]\s*['"]|password123|demo_password/i.test(content)) {
      console.error(`[SECURITY ERROR] Potential hardcoded demo password found in migration: ${file}`)
      console.error('Demo passwords must ONLY exist in supabase/seed.sql, never in migrations.')
      hasErrors = true
    }
  }
}

if (hasErrors) {
  console.error('\n[CHECK FAILED] Secret audit checks failed. Please fix before proceeding.')
  process.exit(1)
} else {
  console.log('[SECURITY CHECK PASSED] No prohibited .env files tracked or staged. No demo passwords in migrations.')
  process.exit(0)
}
