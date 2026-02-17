import { createElement, type PropsWithChildren } from 'react'

export interface GumPrimitiveProps {
  value?: string | number
  [key: string]: unknown
}

type GumPrimitiveComponent = (props: PropsWithChildren<GumPrimitiveProps>) => ReturnType<typeof createElement>

function createPrimitive(name: string): GumPrimitiveComponent {
  return function GumPrimitive(props: PropsWithChildren<GumPrimitiveProps>) {
    return createElement(`gum.${name}`, props, props.children)
  }
}

const primitiveNames = [
  'Group',
  'Svg',
  'Rectangle',
  'Spacer',
  'Text',
  'Box',
  'Frame',
  'Stack',
  'VStack',
  'HStack',
  'HWrap',
  'Grid',
  'Points',
  'Anchor',
  'Attach',
  'Absolute',
  'Line',
  'UnitLine',
  'VLine',
  'HLine',
  'Square',
  'Ellipse',
  'Circle',
  'Dot',
  'Ray',
  'Shape',
  'Triangle',
  'Path',
  'Spline',
  'RoundedRect',
  'ArrowHead',
  'Arrow',
] as const

type PrimitiveName = (typeof primitiveNames)[number]

export const gum = Object.fromEntries(
  primitiveNames.map((name) => [name, createPrimitive(name)])
) as Record<PrimitiveName, GumPrimitiveComponent>
