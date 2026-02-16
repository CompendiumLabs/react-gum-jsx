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
  'group',
  'svg',
  'rect',
  'rectangle',
  'spacer',
  'text',
  'box',
  'frame',
  'stack',
  'vstack',
  'hstack',
  'hwrap',
  'grid',
  'points',
  'anchor',
  'attach',
  'absolute',
  'line',
  'unitline',
  'vline',
  'hline',
  'square',
  'ellipse',
  'circle',
  'dot',
  'ray',
  'shape',
  'triangle',
  'path',
  'spline',
  'roundedrect',
  'arrowhead',
  'arrow',
] as const

type PrimitiveName = (typeof primitiveNames)[number]

export const gum = Object.fromEntries(
  primitiveNames.map((name) => [name, createPrimitive(name)])
) as Record<PrimitiveName, GumPrimitiveComponent>

export const GumGroup = gum.group
export const GumRect = gum.rect
export const GumText = gum.text

export type GumGroupProps = GumPrimitiveProps
export type GumRectProps = GumPrimitiveProps
export type GumTextProps = GumPrimitiveProps
