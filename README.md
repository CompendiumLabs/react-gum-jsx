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
import { GumCanvas, gum } from './react'

export function Demo() {
  return (
    <GumCanvas width={640} height={360}>
      <gum.group rect={[0, 0, 1, 1]}>
        <gum.rect rect={[0.1, 0.15, 0.9, 0.85]} fill="#1e293b" />
        <gum.text rect={[0.15, 0.2, 0.85, 0.35]} value="hello gum + react" fill="white" />
      </gum.group>
    </GumCanvas>
  )
}
```

Or use the imperative root:

```ts
import { createGumRoot, gum } from './react'

const root = createGumRoot({
  width: 500,
  height: 500,
  onRender: (svg) => {
    document.getElementById('mount')!.innerHTML = svg
  },
})

root.render(<gum.rect rect={[0.2, 0.2, 0.8, 0.8]} fill="tomato" />)
```

## Notes

- This is an MVP bridge. It does not yet include a Gum event system.
- Raw text children are supported, but `gum.text` with a `value` prop is the clearest path.
- The current implementation rebuilds gum element objects from the host tree once per committed batch.
- Supported primitives now include:
  `group`, `svg`, `rect`, `rectangle`, `spacer`, `text`,
  `box`, `frame`, `stack`, `vstack`, `hstack`, `hwrap`, `grid`, `points`, `anchor`, `attach`, `absolute`,
  `line`, `unitline`, `vline`, `hline`, `square`, `ellipse`, `circle`, `dot`, `ray`, `shape`, `triangle`, `path`, `spline`, `roundedrect`, `arrowhead`, `arrow`.
