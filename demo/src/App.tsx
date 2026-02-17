import * as Babel from '@babel/standalone'
import { javascript } from '@codemirror/lang-javascript'
import CodeMirror from '@uiw/react-codemirror'
import * as React from 'react'
import { useMemo, useState } from 'react'
import { createGumRoot, gum } from '../../src'
import { CONST, UTILS } from 'gum-jsx'

const initialCode = `
<frame padding margin rounded>
  <hstack spacing>
    <circle fill={blue} />
    <square rounded fill={red} />
    <text>Hello</text>
  </hstack>
</frame>
`.trim() + '\n'

type CompiledScene = React.ReactNode | (() => React.ReactNode)
type SceneFunction = (react: typeof React, ...args: unknown[]) => CompiledScene

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

  const inputs = { ...CONST, ...UTILS, ...gum }

  const returned = `return ${compiled}`
  const runner = new Function('React', ...Object.keys(inputs), returned) as SceneFunction

  const output = runner(React, ...Object.values(inputs))
  return typeof output === 'function' ? output() : output
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
  const editorExtensions = useMemo(() => [javascript({ jsx: true, typescript: true })], [])

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
    <main className="grid min-h-screen grid-cols-1 gap-3 bg-[radial-gradient(circle_at_10%_10%,#e6eefb,#f5f8ff_40%,#e9edf7)] p-3 lg:grid-cols-2">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-3.5 py-3 text-[13px] font-bold uppercase tracking-[0.02em] text-slate-800">
          JSX Editor
        </header>
        <div className="flex gap-2.5 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
          <label className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-700">
            W
            <input
              className="w-[86px] rounded-md border border-slate-300 px-2 py-1.5 text-[13px] leading-none text-slate-900 outline-none ring-sky-300 focus:ring"
              value={widthText}
              onChange={(event) => setWidthText(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-700">
            H
            <input
              className="w-[86px] rounded-md border border-slate-300 px-2 py-1.5 text-[13px] leading-none text-slate-900 outline-none ring-sky-300 focus:ring"
              value={heightText}
              onChange={(event) => setHeightText(event.target.value)}
            />
          </label>
        </div>
        <div className="cm-shell min-h-0 flex-1 bg-slate-50">
          <CodeMirror
            value={code}
            className="h-full"
            extensions={editorExtensions}
            theme="light"
            onChange={(value) => setCode(value)}
          />
        </div>
      </section>

      <section className="flex min-h-[45vh] min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:min-h-0">
        <header className="border-b border-slate-200 px-3.5 py-3 text-[13px] font-bold uppercase tracking-[0.02em] text-slate-800">
          Renderer Output
        </header>
        {result.error == null ? (
          <div
            className="grid flex-1 place-items-center overflow-auto bg-slate-50 p-3 [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: result.svg }}
          />
        ) : (
          <pre className="m-0 whitespace-pre-wrap bg-rose-50 p-3.5 font-mono text-[13px] leading-relaxed text-rose-700">
            {result.error}
          </pre>
        )}
      </section>
    </main>
  )
}
