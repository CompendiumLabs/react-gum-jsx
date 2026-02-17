# gum.jsx React adapter (MVP)

This folder contains an MVP custom React renderer for gum.jsx.

Implemented from `react.md`:
- custom `react-reconciler` host config
- host primitives: `group`, `rect`, `text`
- child append/insert/remove/reorder support
- prop updates via `commitUpdate`
- one render per commit batch (`dirty` + `resetAfterCommit`)
- unmount / clear container support
- expanded primitive coverage for `core`, `layout`, and `geometry` (MVP subset)

## Usage

```tsx
import { GumCanvas, HStack, Rectangle, Circle, Text, blue, red } from './react-gum-jsx'

export function Demo() {
  return <GumCanvas width={640} height={360}>
    <HStack>
      <Rectangle fill={blue} />
      <Circle fill={red} />
      <Text>Hello</Text>
    </HStack>
  </GumCanvas>
}
```

Or use the imperative root:

```ts
import { createGumRoot, blue } from './react-gum-jsx'

const root = createGumRoot({
  width: 500,
  height: 500,
  onRender: (svg) => {
    document.getElementById('mount')!.innerHTML = svg
  },
})

root.render(<Rectangle rounded fill={blue} />)
```

## Notes

- This is an MVP bridge. It does not yet include a Gum event system.
- Raw text children are supported, but `gum.text` with a `value` prop is the clearest path.
- The current implementation rebuilds gum element objects from the host tree once per committed batch.
- Supported primitives now include:
  `group`, `svg`, `rect`, `rectangle`, `spacer`, `text`,
  `box`, `frame`, `stack`, `vstack`, `hstack`, `hwrap`, `grid`, `points`, `anchor`, `attach`, `absolute`,
  `line`, `unitline`, `vline`, `hline`, `square`, `ellipse`, `circle`, `dot`, `ray`, `shape`, `triangle`, `path`, `spline`, `roundedrect`, `arrowhead`, `arrow`.
