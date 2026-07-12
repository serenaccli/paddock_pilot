import { readFile, writeFile } from 'node:fs/promises'

const runtimePath = new URL('../node_modules/@mintplex-labs/piper-tts-web/dist/piper-tts-web.js', import.meta.url)
let runtime = await readFile(runtimePath, 'utf8')

runtime = runtime.replace(
  '__privateGet(this, _ort).env.wasm.numThreads = navigator.hardwareConcurrency;',
  '__privateGet(this, _ort).env.wasm.numThreads = globalThis.crossOriginIsolated ? Math.min(navigator.hardwareConcurrency || 1, 4) : 1;',
)
if (!runtime.includes('return writeBlob(url, await fetchBlob')) {
  runtime = runtime.replace(
    'writeBlob(url, await fetchBlob(url, url.endsWith(".onnx") ? callback : void 0));',
    'return writeBlob(url, await fetchBlob(url, url.endsWith(".onnx") ? callback : void 0));',
  )
}

await writeFile(runtimePath, runtime)
