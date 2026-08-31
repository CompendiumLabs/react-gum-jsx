# @gum-jsx/react

This is a React adapter for [gum.jsx](https://github.com/CompendiumLabs/gum-jsx). You can use it on the web or in the CLI.

## Installation

```bash
bun i @gum-jsx/react
```

This will install the `@gum-jsx/react` package and the `gum-react` command. Add a `-g` flag to install globally.

## Usage

To use Gum in a regular React setting, make a standalone component. It's very similar to what you would pass to `evaluateGum` but as a default export:

```tsx
import { blue, red } from '@gum-jsx/core'
import { GUM } from '@gum-jsx/react'
const { Frame, HStack, Square, Circle, Text } = GUM

export default function Demo() {
  return <Frame padding margin rounded>
    <HStack spacing>
      <Square fill={blue} />
      <Circle fill={red} />
      <Text>Hello</Text>
    </HStack>
  </Frame>
}
```

`GUM` tracks the default `Env`'s element registry as it is filled in, so any plugin you use shows up on it. Use `@gum-jsx/math` once and `GUM.Latex` is there:

```tsx
import { gum } from '@gum-jsx/core'
import { math } from '@gum-jsx/math'
import { GUM } from '@gum-jsx/react'
gum.use(math)
const { Latex } = GUM
```

A root renders against an `Env` — the default one unless you pass `env` to `createGumRoot` or `<Gum>` — with its `theme` option layered on top, so a dark render never changes the Env itself. An element registered on some other Env (`new Env().use({ elems: { Blob } })`) renders on a root given that Env and nowhere else.

In a CLI setting, you can use the `gum-react` command to render a React component to SVG on stdout:

```bash
gum-react component.tsx
gum-react component.tsx -s 800 -t dark > out.svg
```

It accepts `-s/--size`, `-u/--unit-size` (the image size at which `stroke_width = 1` is one pixel, default `1000`), `-t/--theme` and `-c/--cwd` (base directory for relative `?raw` imports). The math elements are always available here — the CLI loads them for you.

If you are in a web setting, you can use the `<Gum>` component to manage the DOM. This accepts very similar arguments to `evaluateGum` itself (`size`, `theme`, `env`, plus `Svg` props). For example:

```tsx
import { Gum } from '@gum-jsx/react'
<Gum size={[640, 360]}>
  <Demo />
</Gum>
```

If the inner component has an `aspect` it will be embedded inside the given size bounds. If it is aspectless, it will be stretched to fill the given size bounds.
