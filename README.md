# react-gum-jsx

This is a React adapter for `gum.jsx`. You can use it on the web or in a CLI.

## Web Usage

To use Gum in a regular React setting, make a component like this. It's very similar to what you would pass to `evaluateGum` in `gum.jsx` but with an outer `<Gum>` component that manages the DOM. This accepts very similar arguments to `evaluateGum` itself.

```tsx
import { blue, red } from 'gum-jsx'
import { GUM } from 'react-gum-jsx'
const { Gum, Frame, HStack, Square, Circle, Text } = GUM

export function Demo() {
  return <Gum size={[640, 360]}>
    <Frame padding margin rounded>
      <HStack spacing>
        <Square fill={blue} />
        <Circle fill={red} />
        <Text>Hello</Text>
      </HStack>
    </Frame>
  </Gum>
}
```

## CLI Usage

You can also use the `gum-react` CLI to render a React component to SVG, PNG, or kitty. In that case, you omit the outer `<Gum>` component and make sure the file exports a default component. Thus the above example becomes:

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

And you can specify arguments like size and theme from the command line.
