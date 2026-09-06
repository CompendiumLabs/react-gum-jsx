import { Children, type ReactElement, type ReactNode } from 'react'

import { Element as GumElement, Svg, is_function, is_string, is_scalar, is_boolean, defaultEnv } from '@gum-jsx/core'
import type { ElementConstructor, Env } from '@gum-jsx/core'

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

// the constructor for a host type, out of the Env's element registry
function getGumConstructor(env: Env, type: string): ElementConstructor {
  const name = stripGumType(type)
  const ctor = env.elems[name]
  if (ctor == null) {
    throw new Error(`Unsupported gum primitive: ${name}`)
  }
  return ctor
}

// every element a render constructs is built against the container's Env
// (theme, strict mode, fonts, ids), so `env` rides along the conversion
function reactElementToGum(el: ReactElement, env: Env): GumElement | null {
  // if type is a component function (e.g. GumPrimitive), call it to unwrap
  if (is_function(el.type)) {
    const inner = (el.type as Function)(el.props)
    if (isReactElement(inner)) return reactElementToGum(inner, env)
    return null // components might want to return null
  }

  // we don't support fragments here (<>...</>)
  if (!is_string(el.type)) {
    throw new Error(`Non-standard React element: ${el.type}`)
  }

  // here we're expecting some kind of gum primitive
  const ctor = getGumConstructor(env, el.type)
  const props = toGumProps(el.props as GumHostProps, env)
  const children = reactChildrenToGum((el.props as GumHostProps).children as ReactNode, env)
  const args = children.length > 0 ? { ...props, children, env } : { ...props, env }
  return new ctor(args)
}

function ensureReactConvert<T>(value: T | ReactElement, env: Env): T | GumElement | null {
  return isReactElement(value) ? reactElementToGum(value, env) : value
}

// inject react->gum conversion if it's a function
function toGumValue(value: unknown, env: Env): unknown {
  if (is_function(value)) {
    return (...args: unknown[]) => {
      const result = (value as Function)(...args)
      return ensureReactConvert(result, env)
    }
  }
  return ensureReactConvert(value, env)
}

function toGumKey(key: string): string {
  return key.replace(/-/g, '_')
}

function reactNodeToGumChild(node: ReactNode, env: Env): GumElement | string | null {
  if (node == null || is_boolean(node)) return null
  if (isReactElement(node)) return reactElementToGum(node, env)
  if (is_string(node) || is_scalar(node)) {
    return String(node)
  }
  return null
}

function reactChildrenToGum(children: ReactNode, env: Env): (GumElement | string)[] {
  return Children.toArray(children)
    .map((child) => reactNodeToGumChild(child, env))
    .filter((child): child is GumElement | string => child != null)
}

function toGumProps(props: GumHostProps, env: Env): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (RESERVED_PROPS.has(key)) continue
    out[toGumKey(key)] = toGumValue(value, env)
  }
  return out
}

function instanceToGum(instance: GumHostInstance, env: Env): GumElement | null {
  const ctor = getGumConstructor(env, instance.type)
  const props = toGumProps(instance.props, env)
  const children = containerChildren(instance.children, env)
  const args = children.length > 0 ? { ...props, children, env } : { ...props, env }
  return new ctor(args)
}

function toGumChild(child: GumHostChild, env: Env): GumElement | string | null {
  if (child.kind === 'text') {
    return child.text
  }
  return instanceToGum(child, env)
}

function containerChildren(children: GumHostChild[], env: Env): GumElement[] {
  return children
    .map((child) => toGumChild(child, env))
    .filter((c): c is GumElement => c != null)
}

// the Env a container renders against: its own (default: the default Env)
// with its theme, so a render never touches the host's Env
export function containerEnv(container: GumContainer): Env {
  const env = container.env ?? defaultEnv()
  return container.theme != null ? env.with({ theme: container.theme }) : env
}

export function renderContainer(container: GumContainer): void {
  const env = containerEnv(container)
  const size = container.size
  const props = toGumProps((container.props ?? {}) as GumHostProps, env)
  const children = containerChildren(container.rootChildren, env)
  const svgElem = new Svg({ size, children, ...props, env })
  const svg = svgElem.svg()
  container.currentSvg = svg
  container.currentSize = svgElem.size
  container.onRender?.(svg)
}
