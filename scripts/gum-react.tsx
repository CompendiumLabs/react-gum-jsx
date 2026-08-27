#! /usr/bin/env bun

import type { BuildArtifact, BunPlugin } from 'bun'
import { program } from 'commander'
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, isAbsolute, join, resolve } from 'path'
import type { ComponentType } from 'react'

import { setTheme, type ThemeName } from '@gum-jsx/core'
import { createGumRoot } from 'react-gum-jsx'

// registers the Latex/Tex elements with core so components can use them
import '@gum-jsx/math'

interface CliOptions {
  size: number
  theme: ThemeName
  cwd?: string
}

interface ComponentProps {
  theme: ThemeName
}

interface ComponentModule {
  default?: ComponentType<ComponentProps>
}

interface LoadedComponentBundle {
  Component: ComponentType<ComponentProps>
  cleanup: () => void
}

interface BundleOptions {
  cwd?: string
}

// packages the CLI has already loaded — a component must share these instances
// rather than get a bundled copy of its own, so that registerElements and
// setTheme calls it makes land in the registry the renderer actually reads
const PROVIDED_PACKAGES: readonly string[] = [
  'react',
  'react-gum-jsx',
  '@gum-jsx/core',
  '@gum-jsx/math',
]
const PROVIDED_FILTER = new RegExp(`^(${PROVIDED_PACKAGES.map(name => name.replace('/', '\\/')).join('|')})(?:\\/.*)?$`)
const RAW_IMPORT_SUFFIX = '?raw'
const RAW_IMPORT_NAMESPACE = 'gum-react-raw'

function parseSize(value: string): number {
  const size = Number.parseInt(value, 10)
  if (Number.isNaN(size)) throw new Error(`invalid size: ${value}`)
  return size
}

function parseTheme(value: string): ThemeName {
  if (value == 'light' || value == 'dark') return value
  throw new Error(`invalid theme: ${value}`)
}

function findPackageRoot(name: string): string | null {
  let dir = import.meta.dir

  while (true) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(candidate)) return candidate

    const parent = dirname(dir)
    if (parent == dir) return null
    dir = parent
  }
}

// resolve against the CLI's own install rather than the component's project:
// the renderer doing the work is ours, so the component has to share our React
// and our element registry for hooks and registerElements to behave
function providedPackageRoot(name: string): string | null {
  if (name == 'react-gum-jsx') return resolve(import.meta.dir, '..')
  return findPackageRoot(name)
}

// Bun emits the original specifier for external imports, so the bundle needs a
// node_modules of its own for them to resolve against at runtime
function linkProvidedPackages(outdir: string): void {
  for (const name of PROVIDED_PACKAGES) {
    const root = providedPackageRoot(name)
    if (root == null) continue
    const link = join(outdir, 'node_modules', name)
    mkdirSync(dirname(link), { recursive: true })
    symlinkSync(root, link, 'dir')
  }
}

const providedModulesPlugin: BunPlugin = {
  name: 'gum-react-provided-modules',
  setup(build) {
    build.onResolve({ filter: PROVIDED_FILTER }, args => ({ path: args.path, external: true }))
  },
}

function resolveRawImport(path: string, importer: string, resolveDir: string, cwd?: string): string {
  const sourcePath = path.slice(0, -RAW_IMPORT_SUFFIX.length)
  if (isAbsolute(sourcePath)) return sourcePath
  if (sourcePath.startsWith('.')) {
    const baseDir = cwd ?? (resolveDir || dirname(importer))
    return resolve(baseDir, sourcePath)
  }
  return Bun.resolveSync(sourcePath, importer || import.meta.path)
}

function makeRawImportsPlugin(cwd?: string): BunPlugin {
  return {
    name: 'gum-react-raw-imports',
    setup(build) {
      build.onResolve({ filter: /\?raw$/ }, args => ({
        path: resolveRawImport(args.path, args.importer, args.resolveDir, cwd),
        namespace: RAW_IMPORT_NAMESPACE,
      }))

      build.onLoad({ filter: /.*/, namespace: RAW_IMPORT_NAMESPACE }, async args => ({
        contents: await Bun.file(args.path).text(),
        loader: 'text',
      }))
    },
  }
}

function getEntryPoint(outputs: BuildArtifact[]): BuildArtifact | undefined {
  return outputs.find(output => output.kind == 'entry-point')
}

async function loadComponentBundle(input: string, options: BundleOptions = {}): Promise<LoadedComponentBundle> {
  const inputPath = resolve(input)
  const outdir = mkdtempSync(join(tmpdir(), 'gum-react-'))
  const cwd = options.cwd != null ? resolve(options.cwd) : undefined
  const cleanup = () => rmSync(outdir, { recursive: true, force: true })

  try {
    linkProvidedPackages(outdir)

    const result = await Bun.build({
      entrypoints: [inputPath],
      outdir,
      // Use absolute asset paths so bundled font imports keep working outside the source project.
      publicPath: `${outdir}/`,
      target: 'bun',
      format: 'esm',
      plugins: [makeRawImportsPlugin(cwd), providedModulesPlugin],
    })

    if (!result.success) {
      const message = result.logs.map(log => log.message).join('\n') || `failed to bundle ${inputPath}`
      throw new Error(message)
    }

    const entry = getEntryPoint(result.outputs)
    if (entry == null) throw new Error(`failed to bundle ${inputPath}`)

    const mod = await import(entry.path) as ComponentModule
    const Component = mod.default
    if (Component == null) throw new Error(`${input} has no default export`)

    return { Component, cleanup }
  } catch (error) {
    cleanup()
    throw error
  }
}

async function main() {
  program
    .argument('<component>', 'path to component .tsx file')
    .option('-s, --size <size>', 'SVG/viewBox size in pixels', parseSize, 2000)
    .option('-t, --theme <theme>', 'color theme (light or dark)', parseTheme, 'light')
    .option('-c, --cwd <dir>', 'data directory for relative ?raw imports')
    .parse()

  const input = program.args[0]
  if (input == null) throw new Error('component path is required')

  const { size, theme, cwd } = program.opts<CliOptions>()
  setTheme(theme)
  let cleanup = () => {}

  try {
    const bundle = await loadComponentBundle(input, { cwd })
    cleanup = bundle.cleanup

    const root = createGumRoot({ size, theme })
    root.render(<bundle.Component theme={theme} />)

    console.log(root.getSvg())
  } finally {
    cleanup()
  }
}

await main()
