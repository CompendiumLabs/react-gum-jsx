import { setTheme, Element, Group, Svg, Box, Frame, Stack, VStack, HStack, HWrap, Grid, Points, Anchor, Attach, Absolute, Spacer, Ray, Line, UnitLine, HLine, VLine, Rectangle, RoundedRect, Square, Ellipse, Circle, Dot, Shape, Path, Spline, Triangle, Arrow, Field, Span, Text, TextBox, TextFrame, TextStack, TextFlex, Bold, Italic, Latex, Equation, TitleBox, TitleFrame, ArrowHead, ArrowSpline, Node, Edge, Network, SymPoints, SymLine, SymSpline, SymShape, SymFill, SymField, Bar, VBar, HBar, Bars, VBars, HBars, Scale, VScale, HScale, Labels, VLabels, HLabels, Axis, HAxis, VAxis, BoxLabel, Mesh, HMesh, VMesh, Mesh2D, Graph, Plot, BarPlot, Legend, Slide } from 'gum-jsx'
import type { GumContainer, GumHostChild, GumHostInstance, GumHostProps } from './types'

const RESERVED_PROPS = new Set([
  'children',
  'key',
  'ref',
  '__self',
  '__source',
])

type GumElemCtor = new (args?: Record<string, unknown>) => Element

const GUM_CONSTRUCTORS: Record<string, GumElemCtor> = {
  Element, Group, Svg, Box, Frame, Stack, VStack, HStack, HWrap, Grid, Points, Anchor, Attach, Absolute, Spacer, Ray, Line, UnitLine, HLine, VLine, Rectangle, RoundedRect, Square, Ellipse, Circle, Dot, Shape, Path, Spline, Triangle, Arrow, Field, Span, Text, TextBox, TextFrame, TextStack, TextFlex, Bold, Italic, Latex, Equation, TitleBox, TitleFrame, ArrowHead, ArrowSpline, Node, Edge, Network, SymPoints, SymLine, SymSpline, SymShape, SymFill, SymField, Bar, VBar, HBar, Bars, VBars, HBars, Scale, VScale, HScale, Labels, VLabels, HLabels, Axis, HAxis, VAxis, BoxLabel, Mesh, HMesh, VMesh, Mesh2D, Graph, Plot, BarPlot, Legend, Slide
}

function scalarText(value: unknown): string {
  if (value == null) return ''
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

function toGumProps(props: GumHostProps): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (RESERVED_PROPS.has(key)) continue
    out[key] = value
  }
  return out
}

function childrenText(children: GumHostChild[]): string {
  return children
    .map((child) => {
      if (child.kind !== 'text') return ''
      return child.text
    })
    .join('')
}

function toGumElement(child: GumHostChild): Element | null {
  if (child.kind === 'text') {
    const text = child.text.trim()
    if (text.length === 0) return null
    return new Span({ children: text })
  }
  return instanceToGum(child)
}

function instanceToGum(instance: GumHostInstance): Element | null {
  const props = toGumProps(instance.props)
  const type = instance.type.slice(4)

  if (type === 'Text') {
    const value = scalarText((props as any).value)
    const text = value.length > 0 ? value : childrenText(instance.children)
    if (text.trim().length === 0) return null
    const { value: _value, ...rest } = props
    return new Span({ ...rest, children: text })
  }

  const ctor = GUM_CONSTRUCTORS[type]
  if (ctor == null) {
    throw new Error(`Unsupported gum component: ${instance.type}`)
  }

  const children = instance.children
    .map((child) => toGumElement(child))
    .filter((elem): elem is Element => elem != null)
  const args = children.length > 0 ? { ...props, children } : props
  return new ctor(args)
}

function containerChildren(container: GumContainer): Element[] {
  return container.rootChildren
    .map((child) => toGumElement(child))
    .filter((elem): elem is Element => elem != null)
}

export function renderContainer(container: GumContainer): void {
  if (container.theme != null) {
    setTheme(container.theme)
  }
  const children = containerChildren(container)
  const svgElem = new Svg({
    size: [container.width, container.height],
    children,
    ...(container.svgProps ?? {}),
  })
  const svg = svgElem.svg()
  container.currentSvg = svg
  container.onRender?.(svg)
}
