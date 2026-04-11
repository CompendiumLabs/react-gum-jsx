/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { useLayoutEffect, useRef } from 'react'
import { createGumRoot, type GumRoot } from './renderer'

import type { CSSProperties, PropsWithChildren } from 'react'
import type { Size, ThemeName } from 'gum-jsx'

export interface GumProps {
  size?: number | Size
  theme?: ThemeName
  className?: string
  style?: CSSProperties
  [key: string]: unknown
}

export function Gum({
  size = 500,
  theme = 'light',
  className,
  style,
  children,
  ...props
}: PropsWithChildren<GumProps>) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<GumRoot | null>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (host == null) return

    const root = createGumRoot({
      size,
      theme,
      props: props,
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
    rootRef.current?.setSize(size)
  }, [size])

  useLayoutEffect(() => {
    rootRef.current?.setTheme(theme)
  }, [theme])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (root == null) return
    root.container.props = props
    root.render(children)
  }, [children, props])

  return <div ref={hostRef} className={className} style={style} />
}
