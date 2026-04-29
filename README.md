# react-gum-jsx

This is a React adapter for [gum.jsx](https://github.com/CompendiumLabs/gum.jsx). You can use it on the web or in the CLI.

## Installation

```bash
bun i react-gum-jsx
```

This will install the `react-gum-jsx` package and the `gum-react` command. Add a `-g` flag to install globally.

## Usage

To use Gum in a regular React setting, make a standalone component. It's very similar to what you would pass to `evaluateGum` but as a default export:

```tsx
import { blue, red } from 'gum-jsx'
import { GUM } from 'react-gum-jsx'
const { Gum, Frame, HStack, Square, Circle, Text } = GUM

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

In a CLI setting, you can use the `gum-react` command to render a React component to SVG, PNG, or kitty. This takes very similar arguments to the regular `gum` command.

If you are in a web setting, you can use the `<Gum>` component to manage the DOM. This accepts very similar arguments to `evaluateGum` itself. For example:

```tsx
import { Gum } from 'react-gum-jsx'
<Gum size={[640, 360]}>
  <Demo />
</Gum>
```

If the inner component has an `aspect` it will be embedded inside the given size bounds. If it is aspectless, it will be stretched to fill the given size bounds.
