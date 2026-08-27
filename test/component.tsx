import { GUM } from '../src/index'
const { Graph, SymPoints, Square } = GUM
import { sin, pi, r2d } from '@gum-jsx/core'

export default function makeScene() {
  return <Graph ylim={[-1.5, 1.5]} padding={0.2} aspect={2}>
  <SymPoints
    fy={sin} xlim={[0, 2*pi]} point-size={1} N={100}
    point-shape={(x: number) => <Square rounded spin={r2d*x} />}
  />
</Graph>
}