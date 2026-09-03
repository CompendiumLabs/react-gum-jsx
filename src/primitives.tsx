import { createElement, type PropsWithChildren } from 'react'
import { CORE_ELEMS, defaultEnv, is_string, type Attrs } from '@gum-jsx/core'

type GumPrimitiveProps = PropsWithChildren<Attrs>

export type GumPrimitiveComponent = (props: GumPrimitiveProps) => ReturnType<typeof createElement>

function createPrimitive(name: string): GumPrimitiveComponent {
  return function GumPrimitive(props: GumPrimitiveProps) {
    return createElement(name, props, props.children)
  }
}

// the default Env's element registry grows as plugins are used (`gum.use(math)`,
// possibly after a consumer has destructured GUM at module scope), and a root
// may render against another Env altogether, so wrappers are handed out for
// any name and the constructor is only looked up at render time, in the Env
// the root renders against
const CACHE = new Map<string, GumPrimitiveComponent>()

function getPrimitive(name: string): GumPrimitiveComponent {
  let prim = CACHE.get(name)
  if (prim == null) {
    prim = createPrimitive(name)
    CACHE.set(name, prim)
  }
  return prim
}

// core's element names are known statically, so they are typed as always
// present (a plugin's, such as Latex, are only known once it is used and come
// out as possibly undefined under noUncheckedIndexedAccess); the proxy itself
// answers any name
export type GumElements =
  { readonly [K in keyof typeof CORE_ELEMS]: GumPrimitiveComponent } &
  { readonly [name: string]: GumPrimitiveComponent }

const GUM: GumElements = new Proxy({} as GumElements, {
  get: (_target, key) => is_string(key) ? getPrimitive(key) : undefined,
  has: (_target, key) => is_string(key) && key in defaultEnv().elems,
  ownKeys: () => Object.keys(defaultEnv().elems),
  getOwnPropertyDescriptor: (_target, key) => {
    if (!is_string(key) || !(key in defaultEnv().elems)) return undefined
    return { value: getPrimitive(key), enumerable: true, configurable: true, writable: false }
  },
})

export { GUM }
