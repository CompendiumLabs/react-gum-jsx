import React, { useLayoutEffect, useRef } from 'react'
import type { CSSProperties, PropsWithChildren } from 'react'
import { createGumRoot, type GumRoot } from './renderer'

export interface GumCanvasProps {
  width?: number
  height?: number
  className?: string
  style?: CSSProperties
  svgProps?: Record<string, unknown>
}

export function GumCanvas({
  width = 500,
  height = 500,
  className,
  style,
  svgProps,
  children,
}: PropsWithChildren<GumCanvasProps>) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<GumRoot | null>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (host == null) return

    const root = createGumRoot({
      width,
      height,
      svgProps,
      onRender: (svg) => {
        host.innerHTML = svg
      },
    })

    rootRef.current = root
    root.render(children)

    return () => {
      root.unmount()
      rootRef.current = null
      host.innerHTML = ''
    }
  }, [])

  useLayoutEffect(() => {
    rootRef.current?.setSize(width, height)
  }, [width, height])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (root == null) return
    root.container.svgProps = svgProps
    root.render(children)
  }, [children, svgProps])

  return <div className={className} style={style} ref={hostRef} />
}
