import { createElement, type PropsWithChildren } from 'react'
import { ELEMS, is_string, type Attrs } from '@gum-jsx/core'

type GumPrimitiveProps = PropsWithChildren<Attrs>

export type GumPrimitiveComponent = (props: GumPrimitiveProps) => ReturnType<typeof createElement>

function createPrimitive(name: string): GumPrimitiveComponent {
  return function GumPrimitive(props: GumPrimitiveProps) {
    return createElement(name, props, props.children)
  }
}

// ELEMS is mutable — core fills it on import and add-ons such as @gum-jsx/math
// call registerElements later — so resolve wrappers on demand rather than
// snapshotting the keys at module load time
const CACHE = new Map<string, GumPrimitiveComponent>()

function getPrimitive(name: string): GumPrimitiveComponent | undefined {
  if (!(name in ELEMS)) return undefined
  let prim = CACHE.get(name)
  if (prim == null) {
    prim = createPrimitive(name)
    CACHE.set(name, prim)
  }
  return prim
}

const GUM: Record<string, GumPrimitiveComponent> = new Proxy({} as Record<string, GumPrimitiveComponent>, {
  get: (_target, key) => is_string(key) ? getPrimitive(key) : undefined,
  has: (_target, key) => is_string(key) && key in ELEMS,
  ownKeys: () => Object.keys(ELEMS),
  getOwnPropertyDescriptor: (_target, key) => {
    if (!is_string(key) || !(key in ELEMS)) return undefined
    return { value: getPrimitive(key), enumerable: true, configurable: true, writable: false }
  },
})

export { GUM }
