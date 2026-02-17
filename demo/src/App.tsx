import * as Babel from '@babel/standalone'
import * as React from 'react'
import { useMemo, useState } from 'react'
import { createGumRoot, gum } from '../../src'

const initialCode = `
<gum.frame padding margin rounded>
  <gum.hstack spacing>
    <gum.circle fill="#0ea5e9" />
    <gum.square rounded fill="#f43f5e" />
    <gum.text>Hello</gum.text>
  </gum.hstack>
</gum.frame>
`.trim() + '\n'

function compileScene(code: string): React.ReactNode {
  const trimmed = code.replace(/^\s*\/\/.*\n/gm, '').trim()
  const wrapped = /^\s*</.test(trimmed) ? trimmed : `function run() { "use strict"; ${trimmed} }`

  const transformed = Babel.transform(wrapped, {
    filename: 'scene.tsx',
    presets: [
      [Babel.availablePresets.react, { runtime: 'classic' }],
      Babel.availablePresets.typescript,
    ],
  })

  const compiled = transformed.code
  if (compiled == null) {
    throw new Error('Compilation failed: no output')
  }

  const returned = `return ${compiled}`
  const run = new Function('React', 'gum', returned) as (react: typeof React, gumApi: typeof gum) => React.ReactNode
  return run(React, gum)
}

function renderSvg(node: React.ReactNode, width: number, height: number): string {
  const root = createGumRoot({ width, height })
  root.render(node)
  const svg = root.getSvg()
  root.unmount()
  return svg
}

export default function App() {
  const [code, setCode] = useState(initialCode)
  const [widthText, setWidthText] = useState('720')
  const [heightText, setHeightText] = useState('420')

  const result = useMemo(() => {
    try {
      const width = Number(widthText)
      const height = Number(heightText)
      if (!Number.isFinite(width) || width <= 0) throw new Error('Width must be a positive number')
      if (!Number.isFinite(height) || height <= 0) throw new Error('Height must be a positive number')

      const scene = compileScene(code)
      const svg = renderSvg(scene, width, height)

      return {
        svg,
        error: null,
      }
    } catch (error) {
      return {
        svg: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }, [code, widthText, heightText])

  return (
    <main className="app-shell">
      <section className="pane editor-pane">
        <header className="pane-header">JSX Editor</header>
        <div className="toolbar">
          <label className="field">
            W
            <input value={widthText} onChange={(event) => setWidthText(event.target.value)} />
          </label>
          <label className="field">
            H
            <input value={heightText} onChange={(event) => setHeightText(event.target.value)} />
          </label>
        </div>
        <textarea className="editor" value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} />
      </section>

      <section className="pane preview-pane">
        <header className="pane-header">Renderer Output</header>
        {result.error == null ? (
          <div className="preview" dangerouslySetInnerHTML={{ __html: result.svg }} />
        ) : (
          <pre className="error">{result.error}</pre>
        )}
      </section>
    </main>
  )
}
