#! /usr/bin/env bun

import { program } from 'commander'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join, resolve } from 'path'

import { setTheme } from 'gum-jsx'
import { rasterizeSvg, formatImage } from 'gum-jsx/render'
import { createGumRoot } from 'react-gum-jsx'

const PROVIDED_MODULE_FILTERS = [
  /^react-gum-jsx$/,
  /^gum-jsx(?:\/.*)?$/,
  /^react$/,
  /^react\/jsx-runtime$/,
  /^react\/jsx-dev-runtime$/,
]

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

async function loadComponentBundle(input: string) {
  const inputPath = resolve(input)
  const outdir = mkdtempSync(join(tmpdir(), 'gum-react-'))

  const result = await Bun.build({
    entrypoints: [inputPath],
    outdir,
    // Use absolute asset paths so bundled font imports keep working outside the source project.
    publicPath: `${outdir}/`,
    target: 'bun',
    format: 'esm',
    plugins: [{
      name: 'gum-react-provided-modules',
      setup(build) {
        for (const filter of PROVIDED_MODULE_FILTERS) {
          build.onResolve({ filter }, args => ({
            path: resolveProvidedModule(args.path, args.importer),
          }))
        }
      },
    }],
  })

  if (!result.success) {
    const message = result.logs.map(log => log.message).join('\n') || `failed to bundle ${inputPath}`
    throw new Error(message)
  }

  const entry = result.outputs.find(output => output.kind == 'entry-point')
  if (entry == null) throw new Error(`failed to bundle ${inputPath}`)

  const mod = await import(entry.path)
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
    .option('-f, --format <format>', 'format to output', 'kitty')
    .option('-s, --size <size>', 'output size in pixels', (value: string) => parseInt(value), 2000)
    .option('-t, --theme <theme>', 'color theme (light or dark)', 'light')
    .option('-b, --background <background>', 'background color')
    .parse()

  const [input] = program.args
  let { output, format, size, theme, background } = program.opts()

  if (theme == 'light' && background == null) background = 'white'
  if (output != null && format == 'kitty') format = 'png'
  if (output != null && format == null) {
    if (output.endsWith('.svg')) format = 'svg'
    if (output.endsWith('.png')) format = 'png'
  }

  setTheme(theme)

  let cleanup = () => {}

  try {
    const bundle = await loadComponentBundle(input)
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
