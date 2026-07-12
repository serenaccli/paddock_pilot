export const SpeechPriority = Object.freeze({
  SAFETY: 100,
  NAVIGATION: 80,
  ROUTE_UPDATE: 60,
  ENVIRONMENT: 40,
  ASSISTANT: 20,
})

export const PIPER_VOICES = [
  { id: 'en_GB-cori-medium', label: 'Cori · British English', description: 'Clear, natural navigation voice' },
  { id: 'en_GB-alan-medium', label: 'Alan · British English', description: 'Calm lower voice' },
  { id: 'en_US-lessac-medium', label: 'Lessac · US English', description: 'Warm, balanced voice' },
]

const DEFAULTS = {
  voiceId: 'en_GB-cori-medium',
  rate: 1,
  pitch: 1,
  volume: 1,
}

const FREQUENT_PHRASES = new Set([
  'Stop. Barrier ahead.',
  'Stop. Obstacle ahead.',
  'Turn left.',
  'Turn right.',
  'Continue forward.',
  'Keep left.',
  'Keep right.',
  'Navigation paused.',
  'Navigation resumed.',
  'You have arrived.',
])

class SpeechService {
  constructor() {
    this.queue = []
    this.current = null
    this.audio = null
    this.objectUrl = null
    this.worker = null
    this.requests = new Map()
    this.requestId = 0
    this.listeners = new Set()
    this.initialized = false
    this.piperReady = false
    this.installedVoices = []
    this.engine = 'initialising'
    this.lastPhrase = { text: '', at: 0 }
    this.config = { ...DEFAULTS, ...this.readSettings() }
  }

  readSettings() {
    try { return JSON.parse(localStorage.getItem('paddock-speech-settings') || '{}') } catch { return {} }
  }

  snapshot() {
    return { ...this.config, engine: this.engine, piperReady: this.piperReady, installedVoices: [...this.installedVoices], speaking: this.isSpeaking() }
  }

  subscribe(listener) {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  emit() { this.listeners.forEach((listener) => listener(this.snapshot())) }

  async initialize() {
    if (this.initialized) return this.snapshot()
    this.initialized = true
    try {
      this.worker = new Worker(new URL('./piper.worker.js', import.meta.url), { type: 'module' })
      this.worker.onmessage = ({ data }) => {
        const pending = this.requests.get(data.id)
        if (!pending) return
        if (typeof data.progress === 'number') {
          pending.onProgress?.(data.progress)
          return
        }
        this.requests.delete(data.id)
        data.ok ? pending.resolve(data) : pending.reject(Object.assign(new Error(data.error || 'Piper unavailable'), data))
      }
      this.worker.onerror = () => this.markFallback()
      const result = await this.callWorker('init', { voiceId: this.config.voiceId })
      this.installedVoices = result.voices || []
      this.piperReady = true
      this.engine = 'piper'
      this.preCacheFrequentPhrases()
    } catch (error) {
      console.error('Piper initialisation failed', error)
      this.installedVoices = error.voices || await this.getStoredVoices().catch(() => [])
      this.markFallback(error.modelMissing ? 'Piper voice download required' : undefined)
    }
    this.emit()
    return this.snapshot()
  }

  markFallback(reason) {
    this.piperReady = false
    this.engine = this.nativeBridge() ? 'system' : ('speechSynthesis' in window ? 'system' : 'unavailable')
    this.fallbackReason = reason || 'Piper could not initialise'
    this.emit()
  }

  callWorker(type, payload = {}, onProgress) {
    if (!this.worker) return Promise.reject(new Error('Piper worker unavailable'))
    const id = ++this.requestId
    return new Promise((resolve, reject) => {
      this.requests.set(id, { resolve, reject, onProgress })
      this.worker.postMessage({ id, type, ...payload })
    })
  }

  async getStoredVoices() {
    const result = await this.callWorker('stored')
    this.installedVoices = result.voices || []
    this.emit()
    return this.installedVoices
  }

  async downloadVoice(voiceId, onProgress) {
    await this.initialize()
    const piper = await import('@mintplex-labs/piper-tts-web')
    await piper.download(voiceId, onProgress)
    this.installedVoices = await piper.stored()
    if (!this.installedVoices.includes(voiceId)) throw new Error('Voice model was not saved')
    await this.setVoice(voiceId)
    return this.snapshot()
  }

  async setVoice(voiceId) {
    this.config.voiceId = voiceId
    this.persistSettings()
    if (this.installedVoices.includes(voiceId)) {
      try {
        await this.callWorker('init', { voiceId })
        this.piperReady = true
        this.engine = 'piper'
      } catch (error) {
        console.error('Piper voice activation failed', error)
        this.markFallback()
      }
    } else {
      this.piperReady = false
      this.markFallback('Selected Piper voice is not installed')
    }
    this.emit()
  }

  configure(values) {
    this.config = {
      ...this.config,
      ...values,
      rate: Math.min(1.35, Math.max(.75, Number(values.rate ?? this.config.rate))),
      pitch: Math.min(1.4, Math.max(.7, Number(values.pitch ?? this.config.pitch))),
      volume: Math.min(1, Math.max(0, Number(values.volume ?? this.config.volume))),
    }
    this.persistSettings()
    if (this.audio) {
      this.audio.playbackRate = this.config.rate
      this.audio.volume = this.config.volume
    }
    this.emit()
  }

  persistSettings() { localStorage.setItem('paddock-speech-settings', JSON.stringify(this.config)) }

  speak(text, priority = SpeechPriority.ASSISTANT) {
    const concise = String(text || '').replace(/\s+/g, ' ').trim()
    if (!concise) return Promise.resolve(false)
    if (concise === this.lastPhrase.text && Date.now() - this.lastPhrase.at < 1800) return Promise.resolve(false)
    this.lastPhrase = { text: concise, at: Date.now() }
    return new Promise((resolve) => {
      const item = { text: concise, priority: this.resolvePriority(priority), resolve, order: Date.now() + Math.random() }
      if (item.priority === SpeechPriority.SAFETY) {
        this.interruptAndSpeak(concise, resolve)
        return
      }
      if (item.priority <= SpeechPriority.ENVIRONMENT) {
        this.queue = this.queue.filter((queued) => {
          if (queued.priority <= SpeechPriority.ENVIRONMENT) queued.resolve(false)
          return queued.priority > SpeechPriority.ENVIRONMENT
        })
      }
      this.queue.push(item)
      this.queue.sort((a, b) => b.priority - a.priority || a.order - b.order)
      this.processQueue()
    })
  }

  interruptAndSpeak(text, existingResolve) {
    this.stop()
    return new Promise((resolve) => {
      const done = existingResolve || resolve
      this.queue.unshift({ text: String(text).trim(), priority: SpeechPriority.SAFETY, resolve: done, order: 0 })
      this.processQueue()
      if (existingResolve) resolve(true)
    })
  }

  stop() {
    this.queue.splice(0).forEach((item) => item.resolve(false))
    this.stopCurrent(true)
  }

  stopCurrent(resolveCurrent) {
    this.playbackResolver?.()
    this.playbackResolver = null
    this.audio?.pause()
    if (this.audio) this.audio.currentTime = 0
    this.nativeBridge()?.stop?.()
    window.speechSynthesis?.cancel()
    if (resolveCurrent && this.current) this.current.resolve(false)
    this.cleanupAudio()
    this.current = null
    this.emit()
  }

  isSpeaking() { return Boolean(this.current || this.audio || window.speechSynthesis?.speaking) }

  async processQueue() {
    if (this.current || !this.queue.length) return
    const item = this.queue.shift()
    this.current = item
    this.emit()
    try {
      await this.initialize()
      if (this.piperReady) await this.playPiper(item.text)
      else await this.playFallback(item.text)
      item.resolve(true)
    } catch {
      if (this.current !== item) {
        item.resolve(false)
        return
      }
      this.markFallback()
      try { await this.playFallback(item.text); item.resolve(true) } catch { item.resolve(false) }
    } finally {
      if (this.current !== item) return
      this.cleanupAudio()
      this.current = null
      this.emit()
      this.processQueue()
    }
  }

  cacheKey(text) {
    const key = `${this.config.voiceId}:${text}`
    return `${location.origin}${import.meta.env.BASE_URL}__speech_cache__/${encodeURIComponent(key)}`
  }

  async cachedAudio(text) {
    if (!('caches' in window) || !FREQUENT_PHRASES.has(text)) return null
    return (await caches.open('paddock-pilot-piper-phrases-v1')).match(this.cacheKey(text))
  }

  async playPiper(text) {
    let blob
    const cached = await this.cachedAudio(text)
    if (cached) blob = await cached.blob()
    else {
      const result = await this.callWorker('synthesize', { voiceId: this.config.voiceId, text })
      blob = new Blob([result.audio], { type: 'audio/wav' })
      if ('caches' in window && FREQUENT_PHRASES.has(text)) {
        const cache = await caches.open('paddock-pilot-piper-phrases-v1')
        await cache.put(this.cacheKey(text), new Response(blob.clone(), { headers: { 'Content-Type': 'audio/wav' } }))
      }
    }
    await this.playBlob(blob)
  }

  playBlob(blob) {
    return new Promise((resolve, reject) => {
      this.playbackResolver = resolve
      this.objectUrl = URL.createObjectURL(blob)
      this.audio = new Audio(this.objectUrl)
      this.audio.volume = this.config.volume
      this.audio.playbackRate = this.config.rate
      this.audio.preservesPitch = true
      this.audio.onended = () => { this.playbackResolver = null; resolve() }
      this.audio.onerror = reject
      this.audio.play().catch(reject)
    })
  }

  nativeBridge() { return window.PaddockPilotSystemTTS || null }

  async playFallback(text) {
    const nativeVoice = this.nativeBridge()
    if (nativeVoice?.speak) {
      const result = nativeVoice.speak(text, JSON.stringify({ rate: this.config.rate, pitch: this.config.pitch, volume: this.config.volume }))
      if (result?.then) await result
      else await new Promise((resolve) => setTimeout(resolve, Math.max(700, text.split(/\s+/).length * 330 / this.config.rate)))
      return
    }
    if (!('speechSynthesis' in window)) throw new Error('No speech engine available')
    await new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = this.config.rate
      utterance.pitch = this.config.pitch
      utterance.volume = this.config.volume
      utterance.onend = resolve
      utterance.onerror = reject
      window.speechSynthesis.speak(utterance)
    })
  }

  cleanupAudio() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
    this.objectUrl = null
    this.audio = null
  }

  resolvePriority(priority) {
    if (typeof priority === 'number') return priority
    const key = String(priority).toUpperCase().replace(/[- ]/g, '_')
    return SpeechPriority[key] || SpeechPriority.ASSISTANT
  }

  async preCacheFrequentPhrases() {
    for (const phrase of [...FREQUENT_PHRASES].slice(0, 3)) {
      if (!this.piperReady || await this.cachedAudio(phrase)) continue
      try {
        const result = await this.callWorker('synthesize', { voiceId: this.config.voiceId, text: phrase })
        const cache = await caches.open('paddock-pilot-piper-phrases-v1')
        await cache.put(this.cacheKey(phrase), new Response(result.audio, { headers: { 'Content-Type': 'audio/wav' } }))
      } catch { break }
    }
  }
}

export const speechService = new SpeechService()
