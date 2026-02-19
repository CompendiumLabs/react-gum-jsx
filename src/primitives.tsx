import { createElement, type PropsWithChildren } from 'react'

export interface GumPrimitiveProps {
  value?: string | number
  [key: string]: unknown
}

export type GumPrimitiveComponent = (props: PropsWithChildren<GumPrimitiveProps>) => ReturnType<typeof createElement>

function createPrimitive(name: string): GumPrimitiveComponent {
  return function GumPrimitive(props: PropsWithChildren<GumPrimitiveProps>) {
    return createElement(name, props, props.children)
  }
}

const primitiveNames = [
  'Element', 'Group', 'Svg', 'Box', 'Frame', 'Stack', 'HWrap', 'VStack', 'HStack', 'Grid', 'Points', 'Anchor', 'Attach', 'Absolute', 'Spacer', 'Ray', 'Line', 'UnitLine', 'HLine', 'VLine', 'Rectangle', 'Rect', 'RoundedRect', 'Square', 'Ellipse', 'Circle', 'Dot', 'Shape', 'Path', 'Command', 'MoveCmd', 'LineCmd', 'ArcCmd', 'CornerCmd', 'CubicSplineCmd', 'Spline', 'Triangle', 'Arrow', 'Field', 'Span', 'Text', 'TextBox', 'TextFrame', 'TextStack', 'TextFlex', 'Bold', 'Italic', 'Latex', 'Equation', 'TitleBox', 'TitleFrame', 'ArrowHead', 'ArrowSpline', 'Node', 'Edge', 'Network', 'SymPoints', 'SymLine', 'SymSpline', 'SymShape', 'SymFill', 'SymField', 'Bar', 'VBar', 'HBar', 'Bars', 'VBars', 'HBars', 'Scale', 'VScale', 'HScale', 'Labels', 'VLabels', 'HLabels', 'Axis', 'HAxis', 'VAxis', 'BoxLabel', 'Mesh', 'HMesh', 'VMesh', 'Mesh2D', 'Graph', 'Plot', 'BarPlot', 'Legend', 'Slide',
] as const

type PrimitiveName = (typeof primitiveNames)[number]

const CONTEXT = Object.fromEntries(
  primitiveNames.map((name) => [name, createPrimitive(name)])
) as Record<PrimitiveName, GumPrimitiveComponent>

export { CONTEXT }

export const {
  Element, Group, Svg, Box, Frame, Stack, VStack, HStack, HWrap, Grid, Points, Anchor, Attach, Absolute, Spacer, Ray, Line, UnitLine, HLine, VLine, Rectangle, Rect, RoundedRect, Square, Ellipse, Circle, Dot, Shape, Path, Command, MoveCmd, LineCmd, ArcCmd, CornerCmd, CubicSplineCmd, Spline, Triangle, Arrow, Field, Span, Text, TextBox, TextFrame, TextStack, TextFlex, Bold, Italic, Latex, Equation, TitleBox, TitleFrame, ArrowHead, ArrowSpline, Node, Edge, Network, SymPoints, SymLine, SymSpline, SymShape, SymFill, SymField, Bar, VBar, HBar, Bars, VBars, HBars, Scale, VScale, HScale, Labels, VLabels, HLabels, Axis, HAxis, VAxis, BoxLabel, Mesh, HMesh, VMesh, Mesh2D, Graph, Plot, BarPlot, Legend, Slide
} = CONTEXT
