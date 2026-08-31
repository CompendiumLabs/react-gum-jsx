# @gum-jsx/react

A custom React renderer for [gum.jsx](https://github.com/CompendiumLabs/gum-jsx), a vector graphics library. Uses `react-reconciler` to let you compose graphics with JSX and render to SVG.

## Architecture

```
React Component Tree
    ↓ createElement
GumHostInstance Tree (virtual DOM in renderer.ts)
    ↓ renderContainer (triggered by resetAfterCommit)
Gum Element Tree (runtime.ts converts via instanceToGum)
    ↓ .svg()
SVG String
    ↓ canvas.tsx sets innerHTML (or printed to stdout via gum-react CLI)
<div>
```

### Source files

| File | Role |
|---|---|
| `src/index.ts` | Public API exports (`createGumRoot`, `Gum`, `GUM`) |
| `src/types.ts` | Virtual host tree types (`GumHostInstance`, `GumHostText`, `GumContainer`) and tree manipulation helpers |
| `src/primitives.tsx` | Single `GUM` record that maps every element of the default `Env` (`defaultEnv().elems` from `@gum-jsx/core`) to a React component wrapper. Destructure the primitives you need. |
| `src/canvas.tsx` | `<Gum>` component — the boundary between React DOM and the custom renderer |
| `src/runtime.ts` | Converts the virtual host tree into actual gum.jsx `Element` instances and renders to SVG |
| `src/renderer.ts` | `react-reconciler` host config and `createGumRoot()` factory |
| `scripts/test.tsx` | Smoke test (run with `bun run test`) |
| `scripts/gum-react.tsx` | CLI that renders a `.tsx` component file to SVG on stdout (shipped as the `gum-react` bin) |
| `test/component.tsx` | Shared fixture component used by the test suite and handy for manual CLI runs |

### Key patterns

- **Primitives as one record**: `GUM` is a `Proxy` over the default Env's live element registry. Each entry is a thin wrapper that calls `createElement(name, props, children)`, memoized per name. Users destructure (`const { Circle, Plot } = GUM`) rather than importing each component.
- **Live registry**: the default Env starts with core's elements and grows as plugins are used (`gum.use(math)` for `Latex`, `Tex`, …, possibly after a consumer destructured them at module scope). `GUM` hands out a wrapper for any name and only looks the constructor up at render time — in the Env the root renders against (`container.env ?? defaultEnv()`), so an element registered on a root's own Env works there too. Unknown names are excluded from `in`/`Object.keys` and fail at render with `Unsupported gum primitive`. Never cache `Object.keys(GUM)` at module scope.
- **The Env**: `renderContainer` (`src/runtime.ts`) derives the Env for a render — the container's `env` (default: the default Env) `with` the container's `theme` — and passes it into every gum element it constructs (`{ ...props, children, env }`), so the theme is per root and nothing is set globally.
- **Type prefixing**: React elements carry bare names (`Rectangle`), normalized to `gum.Rectangle` in the host tree, then stripped back when constructing gum elements via `env.elems[name]`.
- **Dirty flag batching**: Mutations mark the container dirty; `resetAfterCommit` flushes once per commit batch, avoiding redundant renders.
- **Parent-linked tree**: Every child holds a parent reference, enabling efficient dirty propagation up to the root.
- **Props filtering**: Reserved props (`key`, `ref`, `__self`, `__source`, `children`) are stripped before passing to gum constructors. Remaining keys are converted kebab-to-snake (`point-shape` → `point_shape`).
- **Function props**: Values that are functions get wrapped so that any `ReactElement` they return is converted to a gum `Element` on demand (enables callbacks like `point-shape={(x) => <Square />}`).
- **Custom component unwrapping**: If a JSX element's `type` is a function (not a string), `runtime.ts` calls it with its props and recurses on the result — so user-defined React components nest inside the gum tree.
- **Text handling**: JSX text children are trimmed; non-empty strings are passed as children to gum constructors.
- **Render errors**: Captured on the container and rethrown from `root.render()` so React doesn't swallow them.

## Usage

### As a React component (inside a React DOM app)

```tsx
import { Gum, GUM } from '@gum-jsx/react'
const { HStack, Rectangle, Circle, Text } = GUM

function Demo() {
  return <Gum size={[640, 360]}>
    <HStack>
      <Rectangle fill="blue" />
      <Circle fill="red" />
      <Text>Hello</Text>
    </HStack>
  </Gum>
}
```

The `<Gum>` component accepts `size` (number or `[w, h]`), `theme` (`'light' | 'dark'`, default `'light'`), plus `className`/`style` for the host `<div>`. Any extra props are forwarded as top-level `Svg` props, with the same kebab-to-snake conversion as element props (e.g. `unit-size={32}` or `unit_size={32}` for pixel-sized strokes on a 32px icon).

### Headless (no DOM)

```tsx
import { createGumRoot, GUM } from '@gum-jsx/react'
const { HStack, Rectangle, Circle, Text } = GUM

function Demo() {
  return <Gum size={[640, 360]}>
    <HStack>
      <Rectangle fill="blue" />
      <Circle fill="red" />
      <Text>Hello</Text>
    </HStack>
  </Gum>
}

const root = createGumRoot({ size: [640, 360] })
root.render(<Demo />)

const svg = root.getSvg()
console.log(svg)
```

`createGumRoot(options)` accepts `{ size, theme, env, props, onRender }` and returns `{ container, render, unmount, setSize, setTheme, setEnv, setProps, setRenderCallback, getSvg, getSize }`.

### `gum-react` CLI

The package ships a `gum-react` binary (`scripts/gum-react.tsx`) that renders a React component file to SVG on stdout. The target `.tsx` file must `export default` a component (typically zero-arg, optionally taking `{ theme }`). It does SVG only — pipe it somewhere else for rasterization.

```sh
bun gum-react path/to/component.tsx
bun gum-react component.tsx -s 800 -t dark > out.svg
```

Options: `-s/--size <px>` (default `2000`), `-u/--unit-size <px>` (the image size at which `stroke_width = 1` is one pixel, default `1000`; set it to the size for pixel strokes on a small icon), `-t/--theme <light|dark>` (default `light`), `-c/--cwd <dir>` (base for relative `?raw` imports).

The CLI bundles the component with `Bun.build`, but treats `react`, `@gum-jsx/react` and the `@gum-jsx/*` packages as **external** and symlinks them into the bundle's temp `node_modules` (see `linkProvidedPackages`). This matters: it is what makes the default Env a component extends (`gum.use(...)`) the one the renderer reads from, instead of a private bundled copy. The CLI also applies `@gum-jsx/math` to the default Env itself, so `<Latex>` works without the component asking for it.

## Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode, ESM-only)
- **React**: 19.x with `react-reconciler` 0.33.x
- **CLI**: `commander` 14.x
- **Graphics**: `@gum-jsx/core` (a peer dependency, like `react` and `react-dom`: the host's single copy owns the default Env), plus `@gum-jsx/math` (Latex, a regular dependency). In the `gum-org` bun workspace these resolve to the sibling checkouts

## gum.jsx reference

gum.jsx is split into scoped packages under `node_modules/@gum-jsx/`. Key things to know:

- `@gum-jsx/core` is the graphics library proper: elements, layout, theming, the `Env` (registries plus theme/strict/fonts; `gum` is the default one) and `evaluateGum` (under `@gum-jsx/core/eval`).
- `@gum-jsx/math` adds the LaTeX elements (`Latex`, `Tex`, …) and KaTeX fonts as a plugin: `gum.use(math)`. Importing it has no side effects.
- `@gum-jsx/node` provides `rasterizeSvg` and `formatImage` for PNG/kitty output. This repo does not use it — the CLI emits SVG only — and it pulls in the native `canvas` package, so don't add it back without a reason.
- `gum-jsx` (unscoped) is the batteries-included umbrella that re-exports all of the above. This repo depends on the pieces it needs instead.
- The full set of primitives is driven by the default Env's `elems` — whatever is registered there is automatically available on `GUM`.
- Categories include layout (Box, Frame, Stack, Grid), geometry (Line, Circle, Rectangle, Path), text (Span, Text), plotting (Plot, Axis, Legend, Graph), network (Node, Edge, Network), and presentation (Slide).
- `Element` is the base class; `Group` extends it with children support. Rendering calls `.svg()` to produce an SVG string.
- Themes are per root: `createGumRoot({ theme })` / `<Gum theme>`, or an Env of your own (`createGumRoot({ env: new Env({ theme: 'dark' }) })`). `renderContainer` derives the Env for each render; there is no global theme.
- Helpers like `pi`, `sin`, `r2d`, and color constants (`blue`, `red`, ...) are imported directly from `@gum-jsx/core`, not re-exported here.
