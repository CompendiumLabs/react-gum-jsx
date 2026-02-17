# gum.jsx React adapter

This folder contains a custom React renderer for `gum.jsx`

- custom `react-reconciler` host config
- child append/insert/remove/reorder support
- prop updates via `commitUpdate`
- one render per commit batch (`dirty` + `resetAfterCommit`)
- unmount / clear container support

## Usage

```tsx
import { Gum, HStack, Rectangle, Circle, Text, blue, red } from './react-gum-jsx'

export function Demo() {
  return <Gum width={640} height={360}>
    <Frame padding margin rounded>
      <HStack>
        <Rectangle fill={blue} />
        <Circle fill={red} />
        <Text>Hello</Text>
      </HStack>
    </Frame>
  </Gum>
}
```
