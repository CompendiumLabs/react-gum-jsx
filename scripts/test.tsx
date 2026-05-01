import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { createGumRoot, GUM } from '../src/index'
import { setTheme, pi, sin, r2d } from 'gum-jsx'
const { Square, SymPoints, Graph, Plot, Circle, VAxis, VLabel } = GUM

setTheme('dark')

function makeScene() {
  return <Graph ylim={[-1.5, 1.5]} padding={0.15} aspect={2}>
    <SymPoints
      fy={sin} xlim={[0, 2*pi]} size={0.5} N={100}
      point-shape={(x: number) => <Square rounded spin={r2d*x} />}
    />
  </Graph>
}

function AxisWithLabel() {
  return <VAxis lim={[0, 1]}>
    <VLabel loc={0.5}>Hello</VLabel>
  </VAxis>
}

function makePlotWithCustomAxis() {
  return <Plot
    xlim={[0, 1]}
    ylim={[0, 1]}
    yaxis={<AxisWithLabel />}
  >
    <Circle pos={[0.5, 0.5]} size={0.1} />
  </Plot>
}

const root = createGumRoot()
root.render(makeScene())

const sceneSvg = root.getSvg()
assert.ok(sceneSvg.includes('<svg'))

root.render(makePlotWithCustomAxis())
const plotSvg = root.getSvg()
assert.ok(plotSvg.includes('Hello'), 'custom axis labels passed through props should preserve children')

function assertCliRawImport() {
  const dir = mkdtempSync(join(tmpdir(), 'gum-react-raw-import-'))

  try {
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

    const result = spawnSync(process.execPath, [
      './scripts/gum-react.tsx',
      componentPath,
      '-f',
      'svg',
    ], {
      cwd: resolve(import.meta.dir, '..'),
      encoding: 'utf-8',
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.ok(result.stdout.includes('works,42'), '?raw file imports should render as text')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function assertCliRawImportCwd() {
  const dir = mkdtempSync(join(tmpdir(), 'gum-react-raw-import-cwd-'))

  try {
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

    const result = spawnSync(process.execPath, [
      './scripts/gum-react.tsx',
      componentPath,
      '-f',
      'svg',
      '--cwd',
      dataDir,
    ], {
      cwd: resolve(import.meta.dir, '..'),
      encoding: 'utf-8',
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.ok(result.stdout.includes('works,84'), '--cwd should resolve relative ?raw imports from the data directory')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

assertCliRawImport()
assertCliRawImportCwd()

console.log(plotSvg)
root.unmount()
