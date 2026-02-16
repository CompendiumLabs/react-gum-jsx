import Reconciler from 'react-reconciler'
import { createContext } from 'react'
import type { ReactNode } from 'react'
import { renderContainer } from './runtime'
import {
  appendChild,
  createHostInstance,
  createHostText,
  insertBefore,
  removeChild,
} from './types'
import type { GumContainer, GumHostChild, GumHostInstance, GumHostProps, GumHostType } from './types'

const DEFAULT_EVENT_PRIORITY = 0
let currentUpdatePriority = DEFAULT_EVENT_PRIORITY
const HOST_CONTEXT = {}
const NOOP = () => {}

export interface GumRoot {
  container: GumContainer
  render: (children: ReactNode) => void
  unmount: () => void
  setSize: (width: number, height: number) => void
  setRenderCallback: (fn?: (svg: string) => void) => void
  getSvg: () => string
}

export interface GumRootOptions {
  width?: number
  height?: number
  theme?: string
  svgProps?: Record<string, unknown>
  onRender?: (svg: string) => void
}

function normalizeType(type: string): GumHostType {
  if (type.startsWith('gum.')) return type as GumHostType
  return `gum.${type}` as GumHostType
}

function isEqualProps(a: GumHostProps, b: GumHostProps): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false
  }
  return true
}

const hostConfig: any = {
  rendererVersion: '0.1.0',
  rendererPackageName: '@gum-jsx/react',
  extraDevToolsConfig: null,
  now: Date.now,
  getRootHostContext: () => HOST_CONTEXT,
  getChildHostContext: () => HOST_CONTEXT,
  getPublicInstance: (instance: GumHostInstance) => instance,
  prepareForCommit: () => null,
  resetAfterCommit: (container: GumContainer) => {
    if (!container.dirty) return
    renderContainer(container)
    container.dirty = false
  },
  shouldSetTextContent: () => false,
  createInstance: (type: string, props: GumHostProps) => createHostInstance(normalizeType(type), props),
  createTextInstance: (text: string) => createHostText(text),
  appendInitialChild: (parent: GumHostInstance, child: GumHostChild) => appendChild(parent, child),
  finalizeInitialChildren: () => false,
  prepareUpdate: (instance: GumHostInstance, _type: string, oldProps: GumHostProps, newProps: GumHostProps) => {
    if (isEqualProps(oldProps, newProps)) return null
    return newProps
  },
  commitUpdate: (instance: GumHostInstance, ...args: unknown[]) => {
    const maybeType = args[0]
    const nextProps = typeof maybeType === 'string'
      ? (args[2] as GumHostProps | undefined)
      : (args[0] as GumHostProps | undefined)
    if (nextProps != null) {
      instance.props = nextProps
    }
    let parent = instance.parent
    while (parent != null && (parent as GumHostInstance).kind === 'instance') {
      parent = (parent as GumHostInstance).parent
    }
    if (parent != null) (parent as GumContainer).dirty = true
  },
  commitTextUpdate: (textInstance: { text: string }, _oldText: string, newText: string) => {
    textInstance.text = newText
    const parent = (textInstance as any).parent
    let node = parent
    while (node != null && node.kind === 'instance') {
      node = node.parent
    }
    if (node != null) node.dirty = true
  },
  appendChild: (parent: GumHostInstance, child: GumHostChild) => {
    appendChild(parent, child)
    let root: any = parent
    while (root?.kind === 'instance') root = root.parent
    if (root != null) root.dirty = true
  },
  appendChildToContainer: (container: GumContainer, child: GumHostChild) => {
    appendChild(container, child)
    container.dirty = true
  },
  insertBefore: (parent: GumHostInstance, child: GumHostChild, beforeChild: GumHostChild) => {
    insertBefore(parent, child, beforeChild)
    let root: any = parent
    while (root?.kind === 'instance') root = root.parent
    if (root != null) root.dirty = true
  },
  insertInContainerBefore: (container: GumContainer, child: GumHostChild, beforeChild: GumHostChild) => {
    insertBefore(container, child, beforeChild)
    container.dirty = true
  },
  removeChild: (parent: GumHostInstance, child: GumHostChild) => {
    removeChild(parent, child)
    let root: any = parent
    while (root?.kind === 'instance') root = root.parent
    if (root != null) root.dirty = true
  },
  removeChildFromContainer: (container: GumContainer, child: GumHostChild) => {
    removeChild(container, child)
    container.dirty = true
  },
  clearContainer: (container: GumContainer) => {
    container.rootChildren = []
    container.dirty = true
    return false
  },
  preparePortalMount: () => null,
  detachDeletedInstance: () => null,
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: false,
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  getCurrentEventPriority: () => DEFAULT_EVENT_PRIORITY,
  trackSchedulerEvent: NOOP,
  resolveEventType: () => null,
  resolveEventTimeStamp: () => Date.now(),
  shouldAttemptEagerTransition: () => false,
  setCurrentUpdatePriority: (priority: number) => {
    currentUpdatePriority = priority
  },
  getCurrentUpdatePriority: () => currentUpdatePriority,
  resolveUpdatePriority: () => currentUpdatePriority,
  maySuspendCommit: () => false,
  maySuspendCommitOnUpdate: () => false,
  maySuspendCommitInSyncRender: () => false,
  preloadInstance: () => true,
  startSuspendingCommit: NOOP,
  suspendInstance: NOOP,
  waitForCommitToBeReady: () => null,
  getSuspendedCommitReason: () => null,
  NotPendingTransition: null,
  HostTransitionContext: createContext(null),
  resetFormInstance: NOOP,
  bindToConsole: () => null,
  supportsMicrotasks: true,
  supportsTestSelectors: false,
  resetTextContent: NOOP,
  hideInstance: NOOP,
  hideTextInstance: NOOP,
  unhideInstance: NOOP,
  unhideTextInstance: NOOP,
  commitMount: NOOP,
  beforeActiveInstanceBlur: () => null,
  afterActiveInstanceBlur: () => null,
  requestPostPaintCallback: (callback: (time: number) => void) => callback(Date.now()),
  scheduleMicrotask: (callback: () => void) => queueMicrotask(callback),
}

const GumReconciler = Reconciler(hostConfig)

function createInternalRoot(container: GumContainer): any {
  const create = (GumReconciler as any).createContainer
  try {
    return create(container, 0, null, false, null, '', console.error, null)
  } catch {
    return create(container, 0, null, false, null, '', console.error, null, null)
  }
}

function updateInternalRoot(root: any, children: ReactNode, callback?: () => void): void {
  const reconcilerAny = GumReconciler as any
  if (typeof reconcilerAny.updateContainerSync === 'function') {
    reconcilerAny.updateContainerSync(children, root, null, callback ?? null)
    if (typeof reconcilerAny.flushSyncWork === 'function') {
      reconcilerAny.flushSyncWork()
    }
    return
  }
  reconcilerAny.updateContainer(children, root, null, callback ?? null)
}

export function createGumRoot(options: GumRootOptions = {}): GumRoot {
  const {
    width = 500,
    height = 500,
    theme,
    svgProps,
    onRender,
  } = options

  const container: GumContainer = {
    width,
    height,
    theme,
    svgProps,
    rootChildren: [],
    currentSvg: '',
    dirty: true,
    onRender,
  }

  const internalRoot = createInternalRoot(container)

  return {
    container,
    render(children: ReactNode): void {
      updateInternalRoot(internalRoot, children)
      if (container.dirty) {
        renderContainer(container)
        container.dirty = false
      }
    },
    unmount(): void {
      updateInternalRoot(internalRoot, null)
      if (container.dirty) {
        renderContainer(container)
        container.dirty = false
      }
    },
    setSize(nextWidth: number, nextHeight: number): void {
      if (container.width === nextWidth && container.height === nextHeight) return
      container.width = nextWidth
      container.height = nextHeight
      container.dirty = true
      renderContainer(container)
      container.dirty = false
    },
    setRenderCallback(fn?: (svg: string) => void): void {
      container.onRender = fn
    },
    getSvg(): string {
      return container.currentSvg
    },
  }
}
