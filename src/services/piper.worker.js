import { TtsSession, download, stored } from '@mintplex-labs/piper-tts-web'

const base = import.meta.env.BASE_URL
const wasmPaths = {
  onnxWasm: `${base}piper/ort/`,
  piperData: `${base}piper/piper_phonemize.data`,
  piperWasm: `${base}piper/piper_phonemize.wasm`,
}

let session = null
let activeVoice = null

async function useVoice(voiceId) {
  if (session && activeVoice === voiceId) return session
  TtsSession._instance = null
  session = await TtsSession.create({ voiceId, wasmPaths })
  activeVoice = voiceId
  return session
}

self.onmessage = async ({ data }) => {
  const { id, type, voiceId, text } = data
  try {
    if (type === 'stored') {
      self.postMessage({ id, ok: true, voices: await stored() })
      return
    }
    if (type === 'download') {
      await download(voiceId, ({ loaded, total }) => {
        self.postMessage({ id, progress: total ? loaded / total : 0 })
      })
      await useVoice(voiceId)
      self.postMessage({ id, ok: true })
      return
    }
    if (type === 'init') {
      const installed = await stored()
      if (!installed.includes(voiceId)) {
        self.postMessage({ id, ok: false, modelMissing: true, voices: installed })
        return
      }
      await useVoice(voiceId)
      self.postMessage({ id, ok: true, voices: installed })
      return
    }
    if (type === 'synthesize') {
      const engine = await useVoice(voiceId)
      const wav = await engine.predict(text)
      const audio = await wav.arrayBuffer()
      self.postMessage({ id, ok: true, audio }, [audio])
    }
  } catch (error) {
    self.postMessage({ id, ok: false, error: error?.message || 'Piper failed' })
  }
}
