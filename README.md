# Paddock Pilot

Audio-first navigation prototype for blind and low-vision spectators at the Australian Grand Prix venue in Albert Park.

## Venue map

The prototype venue package combines:

- official Australian Grand Prix circuit and visitor-map references for named event features;
- OpenStreetMap-derived base paths and road context;
- manually digitised temporary paths and facilities; and
- clearly labelled simulated hackathon features.

Every graph edge retains accessibility attributes, confidence and provenance. Missing fields remain `null`; the router never interprets missing accessibility evidence as confirmation.

The weighted graph router balances estimated travel time and route simplicity and supports hard constraints such as avoiding stairs. It is prototype guidance, not a certified mobility aid or live operational map.

## Run locally

```bash
npm install
npm run dev
```

Use HTTPS (or `localhost`) so the browser can use microphone, camera, service-worker caching and origin-private model storage.

## Offline Piper speech

Paddock Pilot uses Piper as its primary speech engine through `src/services/SpeechService.js`. Piper inference runs in a dedicated Web Worker so navigation and camera controls remain responsive. The phonemizer and ONNX WebAssembly runtime are shipped in `public/piper`; no TTS server or cloud API is used.

### Install a voice model

1. Start Paddock Pilot and sign in to the prototype.
2. Open **Settings**.
3. Under **Offline Piper voice**, download one of the listed voices. The default is `en_GB-cori-medium`.
4. Keep the page open until the progress reaches 100%, then use **Test selected voice**.

The model and its JSON configuration are stored in the browser's Origin Private File System. The app shell, Piper WebAssembly files and generated common phrases are cached by the service worker. After the first complete download and one online app load, speech synthesis works offline for that same browser profile and site origin. Clearing site data removes installed voices and speech caches.

Recommended models:

- `en_GB-cori-medium` — default, clear British English;
- `en_GB-alan-medium` — lower British English voice; and
- `en_US-lessac-medium` — warm US English voice.

Additional models can be added to `PIPER_VOICES` in `SpeechService.js`. Each voice consists of a `.onnx` model and matching `.onnx.json` configuration. Piper's command-line downloader can also fetch these files for native deployments:

```bash
python3 -m pip install piper-tts
python3 -m piper.download_voices --data-dir ./voices en_GB-cori-medium
```

### Speech API and priorities

Application modules import the singleton service rather than calling `speechSynthesis` directly:

```js
import { speechService, SpeechPriority } from './services/SpeechService'

speechService.speak('Turn left in ten metres.', SpeechPriority.NAVIGATION)
speechService.interruptAndSpeak('Stop. Barrier ahead.')
speechService.stop()
speechService.isSpeaking()
```

Queue priority is: immediate safety, turn-by-turn navigation, route updates, environmental/telemetry information, then assistant responses. A safety call cancels current audio and clears stale queued speech. Repeated low-priority environmental messages are coalesced so old race updates do not accumulate. Common short navigation and safety phrases are cached as generated WAV audio.

Rate and volume apply to Piper playback. Piper voice models control their own natural pitch, so the pitch setting is used where the Android or browser fallback supports it.

### Android fallback bridge

If Piper is not installed or fails to initialise, the service first looks for an Android bridge at `window.PaddockPilotAndroidTTS` (or the legacy `window.AndroidTTS`) with this contract:

```js
window.PaddockPilotAndroidTTS.speak(text, JSON.stringify({ rate, pitch, volume }))
window.PaddockPilotAndroidTTS.stop()
```

The bridge may return a Promise that resolves when speech finishes. A Capacitor/WebView host should implement those methods with Android's `android.speech.tts.TextToSpeech`. If no Android bridge is present, the web build uses the system Web Speech API as the final graceful fallback.

### Startup sequence

`App` initialises `SpeechService` and registers `public/sw.js`. The service checks installed Piper voices, starts the worker when the selected model exists, and otherwise reports the fallback engine in Settings. Navigation, voice assistant answers, obstacle detection, rerouting, camera status and race notifications all use this single service.
