import { ReactElement } from 'react'

import { Element, Group, Svg, Box, Frame, Stack, VStack, HStack, HWrap, Grid, Points, Anchor, Attach, Absolute, Spacer, Ray, Line, UnitLine, HLine, VLine, Rectangle, Rect, RoundedRect, Square, Ellipse, Circle, Dot, Shape, Path, Spline, Triangle, Arrow, Field, Span, Text, TextBox, TextFrame, TextStack, TextFlex, Bold, Italic, Latex, Equation, TitleBox, TitleFrame, ArrowHead, ArrowSpline, Node, Edge, Network, SymPoints, SymLine, SymSpline, SymShape, SymFill, SymField, Bar, VBar, HBar, Bars, VBars, HBars, Scale, VScale, HScale, Labels, VLabels, HLabels, Axis, HAxis, VAxis, BoxLabel, Mesh, HMesh, VMesh, Mesh2D, Graph, Plot, BarPlot, Legend, Slide } from 'gum-jsx'

import { is_function, setTheme } from 'gum-jsx'
import type { Point } from 'gum-jsx'

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
  Element, Group, Svg, Box, Frame, Stack, VStack, HStack, HWrap, Grid, Points, Anchor, Attach, Absolute, Spacer, Ray, Line, UnitLine, HLine, VLine, Rectangle, Rect, RoundedRect, Square, Ellipse, Circle, Dot, Shape, Path, Spline, Triangle, Arrow, Field, Span, Text, TextBox, TextFrame, TextStack, TextFlex, Bold, Italic, Latex, Equation, TitleBox, TitleFrame, ArrowHead, ArrowSpline, Node, Edge, Network, SymPoints, SymLine, SymSpline, SymShape, SymFill, SymField, Bar, VBar, HBar, Bars, VBars, HBars, Scale, VScale, HScale, Labels, VLabels, HLabels, Axis, HAxis, VAxis, BoxLabel, Mesh, HMesh, VMesh, Mesh2D, Graph, Plot, BarPlot, Legend, Slide
}

function isReactElement(value: unknown): value is ReactElement {
  return (
    value        !=  null     &&
    typeof value === 'object' &&
    '$$typeof'   in  value    &&
    'type'       in  value    &&
    'props'      in  value
  )
}

function stripGumType(type: string): string {
  return type.startsWith('gum.') ? type.slice(4) : type
}

function getGumConstructor(type: string): GumElemCtor {
  const name = stripGumType(type)
  const ctor = GUM_CONSTRUCTORS[name]
  if (ctor == null) {
    throw new Error(`Unsupported gum primitive: ${name}`)
  }
  return ctor
}

function reactElementToGum(el: ReactElement): Element | null {
  // if type is a component function (e.g. GumPrimitive), call it to unwrap
  if (is_function(el.type)) {
    const inner = (el.type as Function)(el.props)
    if (isReactElement(inner)) return reactElementToGum(inner)
    return null // components might want to return null
  }

  // we don't support fragments here (<>...</>)
  if (typeof el.type !== 'string') {
    throw new Error(`Non-standard React element: ${el.type}`)
  }

  // here we're expecting some kind of gum primitive
  const ctor = getGumConstructor(el.type)
  return new ctor(toGumProps(el.props as GumHostProps))
}

function ensureReactConvert<T>(value: T | ReactElement): T | Element | null {
  return isReactElement(value) ? reactElementToGum(value) : value
}

// inject react->gum conversion if it's a function
function toGumValue(value: unknown): unknown {
  if (is_function(value)) {
    return (...args: unknown[]) => {
      const result = (value as Function)(...args)
      return ensureReactConvert(result)
    }
  }
  return ensureReactConvert(value)
}

function toGumKey(key: string): string {
  return key.replace(/-/g, '_')
}

function toGumProps(props: GumHostProps): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (RESERVED_PROPS.has(key)) continue
    out[toGumKey(key)] = toGumValue(value)
  }
  return out
}

function instanceToGum(instance: GumHostInstance): Element | null {
  const ctor = getGumConstructor(instance.type)
  const props = toGumProps(instance.props)
  const children = containerChildren(instance.children)
  const args = children.length > 0 ? { ...props, children } : props
  return new ctor(args)
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

export function renderContainer(container: GumContainer): void {
  if (container.theme != null) setTheme(container.theme)
  const size = container.size as Point
  const props = container.svgProps ?? {}
  const children = containerChildren(container.rootChildren)
  const svgElem = new Svg({ size, children, ...props })
  const svg = svgElem.svg()
  container.currentSvg = svg
  container.onRender?.(svg)
}
