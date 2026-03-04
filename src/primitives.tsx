import { createElement, type PropsWithChildren } from 'react'
import { ELEMS, type Attrs } from 'gum-jsx'

type GumPrimitiveProps = PropsWithChildren<Attrs>

export type GumPrimitiveComponent = (props: GumPrimitiveProps) => ReturnType<typeof createElement>

function createPrimitive(name: string): GumPrimitiveComponent {
  return function GumPrimitive(props: GumPrimitiveProps) {
    return createElement(name, props, props.children)
  }
}

const GUM: Record<string, GumPrimitiveComponent> = Object.fromEntries(
  Object.keys(ELEMS).map((name) => [name, createPrimitive(name)])
)

export { GUM }
