import { strict as assert } from 'node:assert'

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

console.log(plotSvg)
root.unmount()
