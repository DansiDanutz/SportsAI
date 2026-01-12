import { cp, rm } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = process.cwd()
const src = path.join(repoRoot, 'Sports_Ai', 'frontend', 'dist')
const dest = path.join(repoRoot, 'dist')

async function main() {
  // Clean destination first (works cross-platform)
  await rm(dest, { recursive: true, force: true })
  await cp(src, dest, { recursive: true })
  console.log(`[copy-frontend-dist] Copied ${src} -> ${dest}`)
}

await main()

