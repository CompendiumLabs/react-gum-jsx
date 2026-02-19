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
    ↓ canvas.tsx sets innerHTML
<div>
```

### Source files

| File | Role |
|---|---|
| `src/index.ts` | Public API exports |
| `src/types.ts` | Virtual host tree types (`GumHostInstance`, `GumHostText`, `GumContainer`) and tree manipulation helpers |
| `src/primitives.tsx` | 77 React components wrapping all gum-jsx elements (Rectangle, Circle, Plot, etc.) |
| `src/canvas.tsx` | `<Gum>` component — the boundary between React DOM and the custom renderer |
| `src/runtime.ts` | Converts the virtual host tree into actual gum-jsx `Element` instances and renders to SVG |
| `src/renderer.ts` | `react-reconciler` host config and `createGumRoot()` factory |
| `scripts/test.ts` | Smoke test (run with `bun test`) |

### Key patterns

- **Type prefixing**: React components use bare names (`Rectangle`), normalized to `gum.Rectangle` in the host tree, then stripped back when constructing gum elements.
- **Dirty flag batching**: Mutations mark the container dirty; `resetAfterCommit` flushes once per commit batch, avoiding redundant renders.
- **Parent-linked tree**: Every child holds a parent reference, enabling efficient dirty propagation up to the root.
- **Props filtering**: React-internal props (`key`, `ref`, `__self`, `__source`, `children`) are stripped before passing to gum constructors.
- **Text handling**: JSX text children are stripped of whitespace and passed directly to gum constructors if non-empty.

## Usage

### As a React component (inside a React DOM app)

```tsx
import { Gum, HStack, Rectangle, Circle, Text } from 'react-gum-jsx';

function Demo() {
  return (
    <Gum width={640} height={360}>
      <HStack>
        <Rectangle fill="blue" />
        <Circle fill="red" />
        <Text value="Hello" />
      </HStack>
    </Gum>
  );
}
```

### Headless (no DOM)

```ts
import { createGumRoot, HStack, Circle, Square, Text } from 'react-gum-jsx';
import { createElement } from 'react';

const root = createGumRoot({ width: 500, height: 500 });
root.render(createElement(HStack, null,
  createElement(Circle),
  createElement(Square),
  createElement(Text, { value: 'hi' }),
));
console.log(root.getSvg());
```

## Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode, ESM-only)
- **React**: 19.x with `react-reconciler` 0.33.x
- **Graphics**: gum-jsx (installed from GitHub: `CompendiumLabs/gum.jsx`)

## gum-jsx reference

gum-jsx lives in `node_modules/gum-jsx/`. Key things to know:

- **77 element types** across categories: layout (Box, Frame, Stack, Grid), geometry (Line, Circle, Rectangle, Path), text (Span, Text, Latex), plotting (Plot, Axis, Legend, Graph), network (Node, Edge, Network), presentation (Slide).
- Elements take positional args and keyword props. The React wrapper passes all non-reserved JSX props through as keyword args to gum constructors.
- `Element` is the base class. `Group` extends it with children support. Rendering calls `.svg()` to produce an SVG string.
- Themes are set via `setTheme()` (light/dark). The `<Gum>` component accepts a `theme` prop.
- Useful constants and math utilities (`pi`, `sin`, `cos`, colors like `blue`, `red`, etc.) are exported from gum-jsx and re-exported here.
