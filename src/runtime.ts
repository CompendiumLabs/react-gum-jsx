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

function isReactElement(value: unknown): value is { type: string; props: Record<string, unknown> } {
  return value != null && typeof value === 'object' && '$$typeof' in value && 'type' in value && 'props' in value
}

function reactElementToGum(el: { type: unknown; props: Record<string, unknown> }): Element | null {
  // if type is a component function (e.g. GumPrimitive), call it to unwrap
  if (typeof el.type === 'function') {
    const inner = (el.type as Function)(el.props)
    if (isReactElement(inner)) return reactElementToGum(inner)
    return null
  }
  if (typeof el.type !== 'string') return null
  const name = el.type.startsWith('gum.') ? el.type.slice(4) : el.type
  const ctor = GUM_CONSTRUCTORS[name]
  if (ctor == null) return null
  return new ctor(toGumProps(el.props))
}

function toGumValue(value: unknown): unknown {
  if (typeof value === 'function') {
    return (...args: unknown[]) => {
      const result = (value as Function)(...args)
      return isReactElement(result) ? reactElementToGum(result) : result
    }
  }
  if (isReactElement(value)) {
    return reactElementToGum(value)
  }
  return value
}

function toGumProps(props: GumHostProps): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (RESERVED_PROPS.has(key)) continue
    out[key] = toGumValue(value)
  }
  return out
}

function toGumChild(child: GumHostChild): Element | string | null {
  if (child.kind === 'text') {
    const text = child.text.trim()
    if (text.length === 0) return null
    return text
  }
  return instanceToGum(child)
}

function containerChildren(children: GumHostChild[]): (Element | string)[] {
  return children
    .map((child) => toGumChild(child))
    .filter((c): c is Element | string => c != null)
}

function instanceToGum(instance: GumHostInstance): Element | null {
  const props = toGumProps(instance.props)
  const type = instance.type.slice(4)
  const ctor = GUM_CONSTRUCTORS[type]
  if (ctor == null) {
    throw new Error(`Unsupported gum component: ${instance.type}`)
  }

  const children = containerChildren(instance.children)
  const args = children.length > 0 ? { ...props, children } : props
  return new ctor(args)
}

export function renderContainer(container: GumContainer): void {
  if (container.theme != null) {
    setTheme(container.theme)
  }
  const children = containerChildren(container.rootChildren)
  const svgElem = new Svg({
    size: [container.width, container.height],
    children,
    ...(container.svgProps ?? {}),
  })
  const svg = svgElem.svg()
  container.currentSvg = svg
  container.onRender?.(svg)
}
