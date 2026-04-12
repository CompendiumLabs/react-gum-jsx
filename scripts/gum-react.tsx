// Render a standalone React gum component to SVG or PNG.

import { program } from 'commander'
import { resolve } from 'path'
import { writeFileSync } from 'fs'
import { exit } from 'process'

import { setTheme } from 'gum-jsx'
import { rasterizeSvg, formatImage } from 'gum-jsx/render'
import { createGumRoot } from 'react-gum-jsx'

// parse command line arguments
program
  .argument('<component>', 'path to component .tsx file')
  .option('-o, --output <output>', 'output file')
  .option('-f, --format <format>', 'format to output', 'kitty')
  .option('-s, --size <size>', 'output size in pixels', (value: string) => parseInt(value), 2000)
  .option('-t, --theme <theme>', 'color theme (light or dark)', 'light')
  .option('-b, --background <background>', 'background color')
  .parse()

// get arguments
const [input] = program.args
let { output, format, size, theme, background } = program.opts()

// add white background for light theme
if (theme == 'light' && background == null) background = 'white'

// don't output kitty to file
if (output != null && format == 'kitty') format = 'png'

// auto-detect format when output is a file
if (output != null && format == null) {
  if (output.endsWith('.svg')) format = 'svg'
  if (output.endsWith('.png')) format = 'png'
}

// create output channel
function saver(out: string | Buffer, encoding: 'utf-8' | 'binary') {
  if (output != null) {
    writeFileSync(output, out, encoding)
  } else {
    console.log(out)
  }
  exit(0)
}

// set theme for rendering
setTheme(theme)

// load the component
const mod = await import(resolve(input))
const Component = mod.default
if (!Component) throw new Error(`${input} has no default export`)

// render component
const root = createGumRoot({ size })
root.render(Component({ theme }))

// render to SVG
const svg = root.getSvg()
if (format == 'svg') saver(svg, 'utf-8')

// rasterize to PNG
const png = rasterizeSvg(svg, { background })
if (format == 'png') saver(png, 'binary')

// can only be kitty here
const fmt = formatImage(png)
console.log(fmt)
