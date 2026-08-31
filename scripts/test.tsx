import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { gum, Env, Circle as GumCircle } from '@gum-jsx/core'
import { math } from '@gum-jsx/math'
import { createGumRoot, GUM } from '../src/index'
import Scene from '../test/component'

const ROOT = resolve(import.meta.dir, '..')
const CLI = './scripts/gum-react.tsx'

const { Plot, Circle, VAxis, VLabel, Text } = GUM

function runCli(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, encoding: 'utf-8' })
}

function withTempDir(prefix: string, fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

//
// primitives
//

// must run before anything applies a plugin to the default Env: GUM resolves
// names against its live registry at render time rather than snapshotting it
// at module load
async function assertRegistryIsLive() {
  assert.ok(Object.keys(GUM).length > 0, 'GUM should expose the core elements')
  assert.equal(typeof GUM.Circle, 'function')

  // unknown names still hand out a wrapper (so consumers can destructure before
  // an add-on has registered), but are not enumerated and fail at render time
  assert.equal(typeof GUM.NotAnElement, 'function')
  assert.ok(!('NotAnElement' in GUM), 'unregistered names should not be reported as present')
  assert.throws(() => {
    const NotAnElement = GUM.NotAnElement
    createGumRoot().render(<NotAnElement />)
  }, /Unsupported gum primitive: NotAnElement/)

  const before = Object.keys(GUM).length
  assert.ok(!('Latex' in GUM), 'Latex should not be registered before the math plugin is used')
  const { Latex } = GUM // destructured before the plugin is used

  gum.use(math)

  assert.ok('Latex' in GUM, 'a plugin used on the default Env should be picked up')
  assert.equal(typeof GUM.Latex, 'function')
  assert.ok(Object.keys(GUM).length > before, 'plugin elements should show up in Object.keys')

  const root = createGumRoot()
  root.render(<Latex>x^2</Latex>)
  assert.ok(root.getSvg().includes('<svg'), 'an element destructured before registration should render after it')
}

// a root renders against its own Env: an element only registered there works
// on it and nowhere else, and its settings are read while rendering
function assertRootEnv() {
  class Blorp extends GumCircle {}
  const env = new Env({ theme: 'dark' }).use({ elems: { Blorp } })
  const { Blorp: BlorpPrim } = GUM
  const root = createGumRoot({ env })
  root.render(<BlorpPrim fill="red" />)
  assert.ok(root.getSvg().includes('fill="red"'), 'an element registered on the root Env should render')
  assert.throws(() => createGumRoot().render(<BlorpPrim />), /Unsupported gum primitive: Blorp/)

  const dark = createGumRoot({ theme: 'dark' })
  dark.render(<Circle />)
  const viaEnv = createGumRoot({ env })
  viaEnv.render(<Circle />)
  assert.equal(viaEnv.getSvg(), dark.getSvg(), 'the Env theme should apply')
  const overridden = createGumRoot({ env, theme: 'light' })
  overridden.render(<Circle />)
  assert.notEqual(overridden.getSvg(), dark.getSvg(), 'the theme option should override the Env theme')
  assert.equal(env.theme, 'dark', 'rendering must not change the Env')
}

//
// rendering
//

function AxisWithLabel() {
  return <VAxis lim={[0, 1]}>
    <VLabel loc={0.5}>Hello</VLabel>
  </VAxis>
}

function PlotWithCustomAxis() {
  return <Plot xlim={[0, 1]} ylim={[0, 1]} yaxis={<AxisWithLabel />}>
    <Circle pos={[0.5, 0.5]} size={0.1} />
  </Plot>
}

function assertRendering() {
  const root = createGumRoot()

  root.render(<Scene />)
  assert.ok(root.getSvg().includes('<svg'), 'scene should render an svg')
  const [ width, height ] = root.getSize()
  assert.ok(width > 0 && height > 0, 'root should report the rendered size')

  root.render(<PlotWithCustomAxis />)
  assert.ok(
    root.getSvg().includes('Hello'),
    'custom axis labels passed through props should preserve children',
  )

  root.render(<Text>Reused</Text>)
  assert.ok(root.getSvg().includes('Reused'), 'text children should render')

  root.unmount()
}

function assertThemeSwitch() {
  const light = createGumRoot({ theme: 'light' })
  light.render(<Circle />)

  const dark = createGumRoot({ theme: 'dark' })
  dark.render(<Circle />)

  assert.notEqual(light.getSvg(), dark.getSvg(), 'theme should affect the rendered svg')
  const again = createGumRoot()
  again.render(<Circle />)
  assert.equal(again.getSvg(), light.getSvg(), 'a dark render must not leak into the next root')
}

//
// cli
//

function assertCliOutput() {
  const result = runCli(['test/component.tsx', '-s', '400'])
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.ok(result.stdout.startsWith('<svg'), 'the cli should print svg to stdout')
  assert.ok(result.stdout.includes('width="400"'), '--size should set the svg dimensions')
}

// the stroke unit scales with the image relative to unit_size, so at size 32
// strokes are hairlines unless the image is declared as designed at 32
function assertUnitSize() {
  const { Circle } = GUM
  const widths = (svg: string) => (svg.match(/stroke-width="([^"]*)"/g) ?? []).map(s => Number(s.slice(14, -1)))

  const scaled = createGumRoot({ size: 32 })
  scaled.render(<Circle stroke_width={2} />)
  assert.deepEqual(widths(scaled.getSvg()), [0.03, 0.06], 'strokes should scale down with the image by default')

  const pixel = createGumRoot({ size: 32, props: { unit_size: 32 } })
  pixel.render(<Circle stroke_width={2} />)
  assert.deepEqual(widths(pixel.getSvg()), [1, 2], 'unit_size equal to the size should give pixel strokes')

  pixel.setSize(64)
  assert.deepEqual(widths(pixel.getSvg()), [2, 4], 'a larger render should scale the strokes up')

  // root props take the same kebab-to-snake conversion as element props
  const kebab = createGumRoot({ size: 32, props: { 'unit-size': 32 } })
  kebab.render(<Circle stroke_width={2} />)
  assert.deepEqual(widths(kebab.getSvg()), [1, 2], 'kebab-case root props should reach Svg')

  const result = runCli(['test/component.tsx', '-s', '32', '-u', '32'])
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.ok(result.stdout.includes('stroke-width="1"'), '--unit-size should set the stroke unit')
}

// a component bundled from outside the project must share the CLI's default
// Env, otherwise the elements it adds to it never reach the renderer
function assertCliSharesRegistry() {
  withTempDir('gum-react-registry-', dir => {
    const component = join(dir, 'component.tsx')
    writeFileSync(component, `
      import { Circle, gum } from '@gum-jsx/core'
      import { GUM } from '@gum-jsx/react'

      class Blob extends Circle {}
      gum.use({ elems: { Blob } })

      export default function CustomElement() {
        return <GUM.Blob fill="red" />
      }
    `, 'utf-8')

    const result = runCli([component])
    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.ok(result.stdout.includes('fill="red"'), 'elements registered by a component should render')
  })
}

function assertCliRawImport() {
  withTempDir('gum-react-raw-import-', dir => {
    const dataPath = join(dir, 'data.csv')
    const componentPath = join(dir, 'component.tsx')

    writeFileSync(dataPath, 'label,value\nraw import works,42\n', 'utf-8')
    writeFileSync(componentPath, `
      import csv from './data.csv?raw'
      import { GUM } from '@gum-jsx/react'

      const { Text } = GUM

      export default function RawImportTest() {
        return <Text>{csv}</Text>
      }
    `, 'utf-8')

    const result = runCli([componentPath])
    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.ok(result.stdout.includes('works,42'), '?raw file imports should render as text')
  })
}

function assertCliRawImportCwd() {
  withTempDir('gum-react-raw-import-cwd-', dir => {
    const componentDir = join(dir, 'components')
    const dataDir = join(dir, 'data')
    const dataPath = join(dataDir, 'data.csv')
    const componentPath = join(componentDir, 'component.tsx')

    mkdirSync(componentDir)
    mkdirSync(dataDir)
    writeFileSync(dataPath, 'label,value\ncwd import works,84\n', 'utf-8')
    writeFileSync(componentPath, `
      import csv from './data.csv?raw'
      import { GUM } from '@gum-jsx/react'

      const { Text } = GUM

      export default function RawImportCwdTest() {
        return <Text>{csv}</Text>
      }
    `, 'utf-8')

    const result = runCli([componentPath, '--cwd', dataDir])
    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.ok(result.stdout.includes('works,84'), '--cwd should resolve relative ?raw imports from the data directory')
  })
}

//
// run
//

const TESTS = [
  assertRegistryIsLive,
  assertRootEnv,
  assertRendering,
  assertThemeSwitch,
  assertCliOutput,
  assertUnitSize,
  assertCliSharesRegistry,
  assertCliRawImport,
  assertCliRawImportCwd,
]

for (const test of TESTS) {
  await test()
  console.log(`ok — ${test.name}`)
}
