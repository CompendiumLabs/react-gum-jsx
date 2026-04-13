import { Children, type ReactElement, type ReactNode } from 'react'

import { ELEMS, Element as GumElement, Svg, is_function, is_string, is_scalar, is_boolean, setTheme } from 'gum-jsx'
import type { ElementConstructor, Point } from 'gum-jsx'

import type { GumContainer, GumHostChild, GumHostInstance, GumHostProps } from './types'

const RESERVED_PROPS = new Set([
  'children',
  'key',
  'ref',
  '__self',
  '__source',
])

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

function getGumConstructor(type: string): ElementConstructor {
  const name = stripGumType(type)
  const ctor = ELEMS[name]
  if (ctor == null) {
    throw new Error(`Unsupported gum primitive: ${name}`)
  }
  return ctor
}

function reactElementToGum(el: ReactElement): GumElement | null {
  // if type is a component function (e.g. GumPrimitive), call it to unwrap
  if (is_function(el.type)) {
    const inner = (el.type as Function)(el.props)
    if (isReactElement(inner)) return reactElementToGum(inner)
    return null // components might want to return null
  }

  // we don't support fragments here (<>...</>)
  if (!is_string(el.type)) {
    throw new Error(`Non-standard React element: ${el.type}`)
  }

  // here we're expecting some kind of gum primitive
  const ctor = getGumConstructor(el.type)
  const props = toGumProps(el.props as GumHostProps)
  const children = reactChildrenToGum((el.props as GumHostProps).children as ReactNode)
  const args = children.length > 0 ? { ...props, children } : props
  return new ctor(args)
}

function ensureReactConvert<T>(value: T | ReactElement): T | GumElement | null {
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

function reactNodeToGumChild(node: ReactNode): GumElement | string | null {
  if (node == null || is_boolean(node)) return null
  if (isReactElement(node)) return reactElementToGum(node)
  if (is_string(node) || is_scalar(node)) {
    const text = String(node).trim()
    return text.length > 0 ? text : null
  }
  return null
}

function reactChildrenToGum(children: ReactNode): (GumElement | string)[] {
  return Children.toArray(children)
    .map((child) => reactNodeToGumChild(child))
    .filter((child): child is GumElement | string => child != null)
}

function toGumProps(props: GumHostProps): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (RESERVED_PROPS.has(key)) continue
    out[toGumKey(key)] = toGumValue(value)
  }
  return out
}

function instanceToGum(instance: GumHostInstance): GumElement | null {
  const ctor = getGumConstructor(instance.type)
  const props = toGumProps(instance.props)
  const children = containerChildren(instance.children)
  const args = children.length > 0 ? { ...props, children } : props
  return new ctor(args)
}

function toGumChild(child: GumHostChild): GumElement | string | null {
  if (child.kind === 'text') {
    const text = child.text.trim()
    if (text.length === 0) return null
    return text
  }
  return instanceToGum(child)
}

function containerChildren(children: GumHostChild[]): GumElement[] {
  return children
    .map((child) => toGumChild(child))
    .filter((c): c is GumElement => c != null)
}

export function renderContainer(container: GumContainer): void {
  if (container.theme != null) setTheme(container.theme)
  const size = container.size as Point
  const props = container.props ?? {}
  const children = containerChildren(container.rootChildren)
  const svgElem = new Svg({ size, children, ...props })
  const svg = svgElem.svg()
  container.currentSvg = svg
  container.onRender?.(svg)
}
