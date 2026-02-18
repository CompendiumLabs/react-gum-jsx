export type GumHostType = `gum.${string}`

export interface GumHostProps {
  children?: unknown
  [key: string]: unknown
}

export interface GumHostText {
  kind: 'text'
  text: string
  parent: GumHostInstance | GumContainer | null
}

export interface GumHostInstance {
  kind: 'instance'
  type: GumHostType
  props: GumHostProps
  children: GumHostChild[]
  parent: GumHostInstance | GumContainer | null
}

export type GumHostChild = GumHostInstance | GumHostText

export interface GumContainer {
  width: number
  height: number
  theme?: string
  svgProps?: Record<string, unknown>
  rootChildren: GumHostChild[]
  currentSvg: string
  renderError?: unknown
  dirty: boolean
  onRender?: (svg: string) => void
}

function isHostInstance(node: GumHostInstance | GumContainer): node is GumHostInstance {
  return (node as GumHostInstance).kind === 'instance'
}

export function createHostInstance(type: GumHostType, props: GumHostProps): GumHostInstance {
  return {
    kind: 'instance',
    type,
    props,
    children: [],
    parent: null,
  }
}

export function createHostText(text: string): GumHostText {
  return {
    kind: 'text',
    text,
    parent: null,
  }
}

function detachFromParent(child: GumHostChild): void {
  const parent = child.parent
  if (parent == null) return
  const list = isHostInstance(parent) ? parent.children : parent.rootChildren
  const index = list.indexOf(child)
  if (index >= 0) list.splice(index, 1)
  child.parent = null
}

export function appendChild(parent: GumHostInstance | GumContainer, child: GumHostChild): void {
  detachFromParent(child)
  child.parent = parent
  if (isHostInstance(parent)) {
    parent.children.push(child)
  } else {
    parent.rootChildren.push(child)
  }
}

export function insertBefore(parent: GumHostInstance | GumContainer, child: GumHostChild, beforeChild: GumHostChild): void {
  detachFromParent(child)
  const list = isHostInstance(parent) ? parent.children : parent.rootChildren
  const index = list.indexOf(beforeChild)
  if (index < 0) {
    child.parent = parent
    list.push(child)
    return
  }
  child.parent = parent
  list.splice(index, 0, child)
}

export function removeChild(parent: GumHostInstance | GumContainer, child: GumHostChild): void {
  const list = isHostInstance(parent) ? parent.children : parent.rootChildren
  const index = list.indexOf(child)
  if (index >= 0) list.splice(index, 1)
  if (child.parent === parent) child.parent = null
}
