import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { setTheme } from '@gum-jsx/core'
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

// must run before anything pulls in an add-on: GUM resolves names against the
// live ELEMS registry at render time rather than snapshotting it at module load
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
  assert.ok(!('Latex' in GUM), 'Latex should not be registered before @gum-jsx/math loads')
  const { Latex } = GUM // destructured before the add-on loads

  await import('@gum-jsx/math')

  assert.ok('Latex' in GUM, 'registerElements should be picked up after module load')
  assert.equal(typeof GUM.Latex, 'function')
  assert.ok(Object.keys(GUM).length > before, 'add-on elements should show up in Object.keys')

  const root = createGumRoot()
  root.render(<Latex>x^2</Latex>)
  assert.ok(root.getSvg().includes('<svg'), 'an element destructured before registration should render after it')
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
  setTheme('light')
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

// a component bundled from outside the project must share the CLI's element
// registry, otherwise its registerElements calls never reach the renderer
function assertCliSharesRegistry() {
  withTempDir('gum-react-registry-', dir => {
    const component = join(dir, 'component.tsx')
    writeFileSync(component, `
      import { Circle, registerElements } from '@gum-jsx/core'
      import { GUM } from 'react-gum-jsx'

      class Blob extends Circle {}
      registerElements({ Blob })

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
      import { GUM } from 'react-gum-jsx'

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
      import { GUM } from 'react-gum-jsx'

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
  assertRendering,
  assertThemeSwitch,
  assertCliOutput,
  assertCliSharesRegistry,
  assertCliRawImport,
  assertCliRawImportCwd,
]

for (const test of TESTS) {
  await test()
  console.log(`ok — ${test.name}`)
}
