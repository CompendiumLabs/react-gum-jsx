#! /usr/bin/env bun

import type { BuildArtifact, BunPlugin } from 'bun'
import { program } from 'commander'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, isAbsolute, join, resolve } from 'path'
import type { ComponentType } from 'react'

import { setTheme, type ThemeName } from 'gum-jsx'
import { rasterizeSvg, formatImage } from 'gum-jsx/render'
import { createGumRoot } from 'react-gum-jsx'

type OutputFormat = 'svg' | 'png' | 'kitty'

interface CliOptions {
  output?: string
  format: OutputFormat
  size: number
  theme: ThemeName
  background?: string
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

const PROVIDED_MODULE_FILTERS: readonly RegExp[] = [
  /^react-gum-jsx$/,
  /^gum-jsx(?:\/.*)?$/,
  /^react$/,
  /^react\/jsx-runtime$/,
  /^react\/jsx-dev-runtime$/,
]
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

function parseFormat(value: string): OutputFormat {
  if (value == 'kitty' || value == 'svg' || value == 'png') return value
  throw new Error(`invalid format: ${value}`)
}

function saveOutput(out: string | Buffer, encoding: 'utf-8' | 'binary', output?: string) {
  if (output != null) {
    writeFileSync(output, out, encoding)
  } else {
    console.log(out)
  }
}

function getPackageName(path: string): string {
  if (path.startsWith('@')) {
    const [scope = '', name = ''] = path.split('/')
    return `${scope}/${name}`
  }
  return path.split('/')[0] ?? path
}

function hasLocalPackage(path: string, importer: string): boolean {
  const packageName = getPackageName(path)
  let dir = importer == '' ? process.cwd() : dirname(importer)

  while (true) {
    if (existsSync(join(dir, 'node_modules', packageName))) return true

    const parent = dirname(dir)
    if (parent == dir) return false
    dir = parent
  }
}

function resolveProvidedModule(path: string, importer: string): string {
  if (hasLocalPackage(path, importer)) {
    return Bun.resolveSync(path, importer)
  }

  if (path == 'react-gum-jsx') return resolve(import.meta.dir, '../src/index.ts')
  return Bun.resolveSync(path, import.meta.path)
}

const providedModulesPlugin: BunPlugin = {
  name: 'gum-react-provided-modules',
  setup(build) {
    for (const filter of PROVIDED_MODULE_FILTERS) {
      build.onResolve({ filter }, args => ({
        path: resolveProvidedModule(args.path, args.importer),
      }))
    }
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

  return {
    Component,
    cleanup() {
      rmSync(outdir, { recursive: true, force: true })
    },
  }
}

async function main() {
  program
    .argument('<component>', 'path to component .tsx file')
    .option('-o, --output <output>', 'output file')
    .option('-f, --format <format>', 'format to output', parseFormat, 'kitty')
    .option('-s, --size <size>', 'output size in pixels', parseSize, 2000)
    .option('-t, --theme <theme>', 'color theme (light or dark)', parseTheme, 'light')
    .option('-b, --background <background>', 'background color')
    .option('-c, --cwd <dir>', 'data directory for relative ?raw imports')
    .parse()

  const input = program.args[0]
  if (input == null) throw new Error('component path is required')

  let { output, format, size, theme, background, cwd } = program.opts<CliOptions>()

  if (theme == 'light' && background == null) background = 'white'
  if (output != null && format == 'kitty') format = 'png'
  if (output != null && format == null) {
    if (output.endsWith('.svg')) format = 'svg'
    if (output.endsWith('.png')) format = 'png'
  }

  setTheme(theme)

  let cleanup = () => {}

  try {
    const bundle = await loadComponentBundle(input, { cwd })
    cleanup = bundle.cleanup

    const root = createGumRoot({ size })
    root.render(<bundle.Component theme={theme} />)

    const svg = root.getSvg()
    if (format == 'svg') {
      saveOutput(svg, 'utf-8', output)
      return
    }

    const png = rasterizeSvg(svg, { background })
    if (format == 'png') {
      saveOutput(png, 'binary', output)
      return
    }

    const kitty = formatImage(png)
    saveOutput(kitty, 'utf-8', output)
  } finally {
    cleanup()
  }
}

await main()
