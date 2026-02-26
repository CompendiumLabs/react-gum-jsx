import { createGumRoot, Square, SymPoints, Graph } from '../src/index'
import { setTheme, pi, sin, r2d } from 'gum-jsx'

setTheme('dark')

function makeScene() {
  return <Graph ylim={[-1.5, 1.5]} padding={0.15} aspect={2}>
    <SymPoints
      fy={sin} xlim={[0, 2*pi]} size={0.5} N={100}
      shape={(x: number) => <Square rounded spin={r2d*x} />}
    />
  </Graph>
}

const root = createGumRoot()
root.render(makeScene())

console.log(root.getSvg())
root.unmount()
