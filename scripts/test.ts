import { createElement } from 'react'
import { createGumRoot, gum } from '../src/index'
import { none, white, blue } from 'gum-jsx'

function makeScene(fill: string, label: string) {
  return createElement(
    gum.group,
    {},
    createElement(gum.rect, { pos: [0.5, 0.25], rad: 0.2, fill, stroke: none, rounded: true }),
    createElement(gum.text, { pos: [0.5, 0.75], yrad: 0.1, color: white }, label),
  )
}

const root = createGumRoot({
  width: 640,
  height: 360,
})

root.render(makeScene(blue, 'gum.jsx'))
const firstSvg = root.getSvg()
console.log(firstSvg)

root.unmount()
