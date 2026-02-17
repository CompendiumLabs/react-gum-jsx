import { createElement } from 'react'
import { createGumRoot, gum } from '../src/index'
import { none, blue, red } from 'gum-jsx'

function makeScene() {
  return createElement(
    gum.hstack,
    { spacing: 0.1 },
    createElement(gum.circle, { fill: blue, stroke: none}),
    createElement(gum.square, { rounded: true, fill: red, stroke: none }),
  )
}

const root = createGumRoot({
  width: 640,
  height: 360,
})

root.render(makeScene())
const firstSvg = root.getSvg()
console.log(firstSvg)

root.unmount()
