import { createElement } from 'react'
import { createGumRoot, HStack, Circle, Square, Text } from '../src/index'
import { setTheme, none, blue, red } from 'gum-jsx'

setTheme('dark')

function makeScene() {
  return createElement(
    HStack,
    { spacing: 0.1 },
    createElement(Circle, { fill: blue, stroke: none}),
    createElement(Square, { rounded: true, fill: red, stroke: none }),
    createElement(Text, { value: 'Hello' }),
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
