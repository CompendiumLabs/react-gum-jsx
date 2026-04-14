# react-gum-jsx

A custom React renderer for [gum-jsx](https://github.com/CompendiumLabs/gum.jsx), a vector graphics library. Uses `react-reconciler` to let you compose graphics with JSX and render to SVG.

## Architecture

```
React Component Tree
    ↓ createElement
GumHostInstance Tree (virtual DOM in renderer.ts)
    ↓ renderContainer (triggered by resetAfterCommit)
Gum Element Tree (runtime.ts converts via instanceToGum)
    ↓ .svg()
SVG String
    ↓ canvas.tsx sets innerHTML (or printed to terminal via gum-react CLI)
<div>
```

### Source files

| File | Role |
|---|---|
| `src/index.ts` | Public API exports (`createGumRoot`, `Gum`, `GUM`) |
| `src/types.ts` | Virtual host tree types (`GumHostInstance`, `GumHostText`, `GumContainer`) and tree manipulation helpers |
| `src/primitives.tsx` | Single `GUM` record that maps every `ELEMS` key from gum-jsx to a React component wrapper. Destructure the primitives you need. |
| `src/canvas.tsx` | `<Gum>` component — the boundary between React DOM and the custom renderer |
| `src/runtime.ts` | Converts the virtual host tree into actual gum-jsx `Element` instances and renders to SVG |
| `src/renderer.ts` | `react-reconciler` host config and `createGumRoot()` factory |
| `scripts/test.tsx` | Smoke test (run with `bun test`) |
| `scripts/gum-react.tsx` | CLI that renders a `.tsx` component file to SVG/PNG/kitty (shipped as the `gum-react` bin) |

### Key patterns

- **Primitives as one record**: `GUM` is built at module load from `Object.keys(ELEMS)`. Each entry is a thin wrapper that calls `createElement(name, props, children)`. Users destructure (`const { Circle, Plot } = GUM`) rather than importing each component.
- **Type prefixing**: React elements carry bare names (`Rectangle`), normalized to `gum.Rectangle` in the host tree, then stripped back when constructing gum elements via `ELEMS[name]`.
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
import { Gum, GUM } from 'react-gum-jsx'
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

The `<Gum>` component accepts `size` (number or `[w, h]`), `theme` (`'light' | 'dark'`, default `'light'`), plus `className`/`style` for the host `<div>`. Any extra props are forwarded as top-level `Svg` props.

### Headless (no DOM)

```tsx
import { createGumRoot, GUM } from 'react-gum-jsx'
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

`createGumRoot(options)` accepts `{ size, theme, props, onRender }` and returns `{ container, render, unmount, setSize, setTheme, setRenderCallback, getSvg }`.

### `gum-react` CLI

The package ships a `gum-react` binary (`scripts/gum-react.tsx`) that renders a React component file to the terminal or disk. The target `.tsx` file must `export default` a component (typically zero-arg, optionally taking `{ theme }`).

```sh
bun gum-react path/to/component.tsx          # prints kitty image to stdout
bun gum-react component.tsx -o out.svg       # writes SVG
bun gum-react component.tsx -o out.png       # writes rasterized PNG
bun gum-react component.tsx -f svg           # prints raw SVG
```

Options: `-o/--output <file>`, `-f/--format <kitty|svg|png>` (default `kitty`), `-s/--size <px>` (default `2000`), `-t/--theme <light|dark>` (default `light`), `-b/--background <color>` (auto-set to `white` for light theme). Output format is auto-detected from the file extension when `-o` is given. Rasterization and kitty formatting come from `gum-jsx/render`.

## Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode, ESM-only)
- **React**: 19.x with `react-reconciler` 0.33.x
- **CLI**: `commander` 14.x
- **Graphics**: gum-jsx (linked locally via `"gum-jsx": "link:gum-jsx"`)

## gum-jsx reference

gum-jsx lives in `node_modules/gum-jsx/`. Key things to know:

- The full set of primitives is driven by `ELEMS` — whatever gum-jsx exports there is automatically available on `GUM`.
- Categories include layout (Box, Frame, Stack, Grid), geometry (Line, Circle, Rectangle, Path), text (Span, Text, Latex), plotting (Plot, Axis, Legend, Graph), network (Node, Edge, Network), and presentation (Slide).
- `Element` is the base class; `Group` extends it with children support. Rendering calls `.svg()` to produce an SVG string.
- Themes are set via `setTheme('light' | 'dark')`. `renderContainer` applies the container's theme before each render.
- Helpers like `pi`, `sin`, `r2d`, and color constants (`blue`, `red`, ...) are imported directly from `gum-jsx`, not re-exported here.
- `gum-jsx/render` provides `rasterizeSvg` and `formatImage` (used by the `gum-react` CLI for PNG/kitty output).
