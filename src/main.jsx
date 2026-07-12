import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Accessibility, AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Check,
  ChevronRight, CircleHelp, CloudOff, Gauge, Headphones, Info, MapPin,
  Menu, Mic, Navigation, Pause, Play, Radar, Radio, Route, Settings2,
  ShieldCheck, Sparkles, Timer, TriangleAlert, Volume2, VolumeX, Wifi, WifiOff, X,
  Flag, CloudRain, TrendingUp, Zap, Camera, ScanLine, Lock, SwitchCamera,
  LogIn, User, Eye, Keyboard, LogOut
} from 'lucide-react'
import './styles.css'
import { AlbertParkMap } from './components/AlbertParkMap'
import { destinationFacilityMap, facilityForCommand, venueFacilities } from './data/albertParkVenue'
import { applyVoiceRoutingPreference, defaultRoutingPreferences, planVenueRoute } from './routing/venueRouter'
import { PIPER_VOICES, SpeechPriority, speechService } from './services/SpeechService'

const destinations = [
  { id: 'bathroom', name: 'Accessible bathroom', detail: 'East concourse · open', time: '4 min', distance: '318 m', icon: Accessibility, aliases: ['toilet', 'bathroom', 'restroom', 'loo'] },
  { id: 'exit', name: 'Nearest exit', detail: 'Gate 1 · step-free', time: '5 min', distance: '405 m', icon: LogOut, aliases: ['exit', 'gate', 'leave', 'way out'] },
  { id: 'grandstand', name: 'Grandstand 2', detail: 'Accessible platform', time: '6 min', distance: '470 m', icon: MapPin, aliases: ['grandstand', 'stand', 'viewing'] },
  { id: 'seat', name: 'Seat finder', detail: 'Section and row lookup', time: '7 min', distance: '520 m', icon: User, aliases: ['seat', 'row', 'section', 'place', 'placing'] },
  { id: 'street', name: 'Street pickup point', detail: 'Named street exit', time: '8 min', distance: '640 m', icon: Navigation, aliases: ['street', 'road', 'avenue', 'drive'] },
  { id: 'quiet', name: 'Quiet area', detail: 'Low sensory zone', time: '3 min', distance: '215 m', icon: Headphones },
  { id: 'medical', name: 'Medical station', detail: 'Staffed now', time: '5 min', distance: '390 m', icon: ShieldCheck },
]

const baseInstructions = [
  { title: 'Continue forward', detail: '35 metres along the east concourse', icon: Navigation },
  { title: 'Turn left', detail: 'after the metal barrier', icon: ArrowLeft },
  { title: 'Keep right', detail: 'at the water refill point', icon: ArrowRight },
  { title: 'Destination ahead', detail: 'entrance on your left', icon: MapPin },
]

const routeTemplates = {
  bathroom: baseInstructions,
  exit: [
    { title: 'Continue forward', detail: '45 metres toward the Gate 1 signage', icon: Navigation },
    { title: 'Turn right', detail: 'onto the step-free outbound lane', icon: ArrowRight },
    { title: 'Keep left', detail: 'past the ticket assistance booth', icon: ArrowLeft },
    { title: 'Exit ahead', detail: 'Gate 1 exit is directly ahead', icon: LogOut },
  ],
  grandstand: [
    { title: 'Continue forward', detail: '60 metres along the east concourse', icon: Navigation },
    { title: 'Turn left', detail: 'at the grandstand letter markers', icon: ArrowLeft },
    { title: 'Keep right', detail: 'beside the accessible viewing ramp', icon: ArrowRight },
    { title: 'Grandstand ahead', detail: 'your grandstand entrance is on the right', icon: MapPin },
  ],
  seat: [
    { title: 'Continue forward', detail: '50 metres to the aisle-number boards', icon: Navigation },
    { title: 'Turn left', detail: 'toward the lower bowl accessible ramp', icon: ArrowLeft },
    { title: 'Keep right', detail: 'until the row lettering is announced', icon: ArrowRight },
    { title: 'Seat ahead', detail: 'your seat block is on this aisle', icon: User },
  ],
  street: [
    { title: 'Continue forward', detail: '70 metres toward the external wayfinding signs', icon: Navigation },
    { title: 'Turn right', detail: 'at the street-exit marker', icon: ArrowRight },
    { title: 'Keep left', detail: 'through the accessible pickup lane', icon: ArrowLeft },
    { title: 'Street ahead', detail: 'pickup point is past the steward post', icon: MapPin },
  ],
  quiet: [
    { title: 'Continue forward', detail: '25 metres along the quieter concourse edge', icon: Navigation },
    { title: 'Turn left', detail: 'before the speaker stack', icon: ArrowLeft },
    { title: 'Keep right', detail: 'past the low-noise signage', icon: ArrowRight },
    { title: 'Quiet area ahead', detail: 'entrance is on your left', icon: Headphones },
  ],
  medical: [
    { title: 'Continue forward', detail: '40 metres toward the medical flag', icon: Navigation },
    { title: 'Turn left', detail: 'after the marshal post', icon: ArrowLeft },
    { title: 'Keep right', detail: 'beside the clear access lane', icon: ArrowRight },
    { title: 'Medical station ahead', detail: 'staff are on your left', icon: ShieldCheck },
  ],
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function buildRerouteInstructions(destination, currentInstructions, currentStep, reason = 'temporary barrier') {
  const targetLabel = destination?.name || 'your destination'
  const completedSteps = currentInstructions.slice(0, currentStep)
  const currentInstruction = currentInstructions[currentStep]
  const firstTurn = pickRandom([
    { title: 'Turn left', detail: 'in 6 metres from your current GPS point', icon: ArrowLeft },
    { title: 'Turn right', detail: 'in 8 metres at the steward marker', icon: ArrowRight },
    { title: 'Bear left', detail: 'toward the wider accessible lane', icon: ArrowLeft },
    { title: 'Bear right', detail: 'toward the low-crowd concourse edge', icon: ArrowRight },
  ])
  const bypass = pickRandom([
    { title: 'Continue forward', detail: '32 metres along the steward-marked bypass', icon: Navigation },
    { title: 'Continue forward', detail: '45 metres along the quieter service lane', icon: Navigation },
    { title: 'Follow the barrier line', detail: 'past two marshal posts until the path opens', icon: Navigation },
    { title: 'Proceed slowly', detail: 'through the temporary access lane for 30 metres', icon: Navigation },
  ])
  const rejoin = pickRandom([
    { title: 'Keep left', detail: 'at the next open gap to rejoin the accessible route', icon: ArrowLeft },
    { title: 'Keep right', detail: 'after the water refill point to rejoin the route', icon: ArrowRight },
    { title: 'Turn left', detail: 'at the black-and-white wayfinding sign', icon: ArrowLeft },
    { title: 'Turn right', detail: 'when the concourse widens beside the steward post', icon: ArrowRight },
  ])
  const finalApproach = pickRandom([
    `${targetLabel} is ahead after the bypass`,
    `${targetLabel} is on the left after the bypass`,
    `${targetLabel} is on the right after the next marshal post`,
    `continue to the signed entrance for ${targetLabel}`,
  ])
  const currentContext = currentInstruction ? ` Avoids the blocked "${currentInstruction.title.toLowerCase()}" segment.` : ''
  return [
    ...completedSteps,
    { title: 'Stop and hold position', detail: `possible ${reason} ahead in the route corridor.${currentContext}`, icon: TriangleAlert },
    firstTurn,
    bypass,
    rejoin,
    { title: 'Destination ahead', detail: finalApproach, icon: MapPin },
  ]
}

const knownStreets = ['Aughtie Drive', 'Canterbury Road', 'Fitzroy Street', 'Lakeside Drive', 'Queens Road']

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function extractGrandstandLetter(command) {
  const match = command.match(/\bgrandstand\s+([a-z])\b|\bstand\s+([a-z])\b/)
  return match ? (match[1] || match[2]).toUpperCase() : null
}

function extractSeatPlacement(command) {
  const rowSeatMatch = command.match(/\b(?:seat|place|placing)\s+row\s+([a-z0-9-]+)\s+([a-z0-9-]+)\b/)
  if (rowSeatMatch) return `Row ${rowSeatMatch[1].toUpperCase()}, Seat ${rowSeatMatch[2].toUpperCase()}`
  const sectionSeatMatch = command.match(/\b(?:seat|place|placing)\s+section\s+([a-z0-9-]+)\s+(?:row\s+)?([a-z0-9-]+)\s+([a-z0-9-]+)\b/)
  if (sectionSeatMatch) return `Section ${sectionSeatMatch[1].toUpperCase()}, Row ${sectionSeatMatch[2].toUpperCase()}, Seat ${sectionSeatMatch[3].toUpperCase()}`
  const seatMatch = command.match(/\b(?:seat|place|placing)\s+([a-z0-9-]+)(?:\s+(?:row|section)\s+([a-z0-9-]+))?|\brow\s+([a-z0-9-]+)\s+(?:seat|place|placing)\s+([a-z0-9-]+)/)
  if (!seatMatch) return null
  if (seatMatch[3] && seatMatch[4]) return `Row ${seatMatch[3].toUpperCase()}, Seat ${seatMatch[4].toUpperCase()}`
  const seat = seatMatch[1]?.toUpperCase()
  const row = seatMatch[2]?.toUpperCase()
  return row ? `Row ${row}, Seat ${seat}` : `Seat ${seat}`
}

function extractStreetName(command) {
  const known = knownStreets.find((street) => command.includes(street.toLowerCase()))
  if (known) return known
  const match = command.match(/\b(?:street|road|avenue|drive)\s+([a-z][a-z\s]{1,28})|\b([a-z][a-z\s]{1,28})\s+(street|road|avenue|drive)\b/)
  if (!match) return null
  const name = match[1] ? `${match[1]} street` : `${match[2]} ${match[3]}`
  return titleCase(name.trim().replace(/\s+/g, ' '))
}

function parseDestinationCommand(rawCommand) {
  const command = rawCommand.toLowerCase().trim()
  if (!command) return null
  const grandstandLetter = extractGrandstandLetter(command)
  if (grandstandLetter) {
    return { ...destinations.find((item) => item.id === 'grandstand'), id: `grandstand-${grandstandLetter}`, name: `Grandstand ${grandstandLetter}`, detail: 'Lettered grandstand entry · accessible platform' }
  }
  const seatPlacement = extractSeatPlacement(command)
  if (seatPlacement) {
    return { ...destinations.find((item) => item.id === 'seat'), id: `seat-${seatPlacement.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: seatPlacement, detail: 'Seat placing fetched from venue map' }
  }
  const streetName = extractStreetName(command)
  if (streetName) {
    return { ...destinations.find((item) => item.id === 'street'), id: `street-${streetName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: streetName, detail: 'Street-side pickup and exit routing' }
  }
  return destinations.find((item) => item.aliases?.some((alias) => command.includes(alias)) || command.includes(item.id)) || null
}

const speak = (text, priority = SpeechPriority.ASSISTANT) => speechService.speak(text, priority)

function App() {
  const [signedIn, setSignedIn] = useState(() => localStorage.getItem('paddock-signed-in') === 'true')
  const [mode, setMode] = useState(() => localStorage.getItem('paddock-mode') || 'lowVision')
  const [screen, setScreen] = useState('navigate')
  const [selected, setSelected] = useState(null)
  const [customDestination, setCustomDestination] = useState(null)
  const [pendingNavigation, setPendingNavigation] = useState(false)
  const [prefs, setPrefs] = useState({ crowds: true, quiet: false, stairs: true })
  const [listening, setListening] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [paused, setPaused] = useState(false)
  const [step, setStep] = useState(0)
  const [hazard, setHazard] = useState(false)
  const [rerouteInstructions, setRerouteInstructions] = useState(null)
  const [offline, setOffline] = useState(false)
  const [toast, setToast] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [readTelemetry, setReadTelemetry] = useState(() => localStorage.getItem('paddock-read-telemetry') !== 'false')
  const [navigationSpeech, setNavigationSpeech] = useState(() => localStorage.getItem('paddock-navigation-speech') !== 'false')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const [gpsState, setGpsState] = useState({ status: 'idle', accuracy: null, latitude: null, longitude: null, simulated: true })
  const [venueDestinationId, setVenueDestinationId] = useState('accessible-toilet-east')
  const [routingPreferences, setRoutingPreferences] = useState(defaultRoutingPreferences)
  const timer = useRef(null)
  const recognitionRef = useRef(null)
  const gpsWatchRef = useRef(null)
  const simulatedGpsTimerRef = useRef(null)

  const destination = customDestination || destinations.find((d) => d.id === selected)
  const routeInstructions = rerouteInstructions || routeTemplates[destination?.routeType || destination?.id] || baseInstructions
  const totalDistance = Number.parseInt(destination?.distance, 10) || 318
  const remaining = Math.max(52, totalDistance - step * Math.round(totalDistance / routeInstructions.length))
  const progress = navigating ? Math.min(88, 16 + step * 23) : 0
  const venueRoute = useMemo(() => planVenueRoute('gate1', venueDestinationId, routingPreferences), [venueDestinationId, routingPreferences])

  const routeReason = useMemo(() => {
    const reasons = []
    if (prefs.crowds) reasons.push('predicted Gate 2 congestion')
    if (prefs.quiet) reasons.push('high-noise fan zone')
    if (prefs.stairs) reasons.push('stairs at the west bridge')
    return reasons.length ? `Avoids ${reasons.join(' and ')}` : 'Balances safety, confidence and distance'
  }, [prefs])

  useEffect(() => () => {
    clearTimeout(timer.current)
    stopGpsTracking()
  }, [])
  useEffect(() => {
    speechService.initialize()
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((registration) => registration.update()).catch(() => {})
  }, [])
  useEffect(() => localStorage.setItem('paddock-read-telemetry', String(readTelemetry)), [readTelemetry])
  useEffect(() => localStorage.setItem('paddock-navigation-speech', String(navigationSpeech)), [navigationSpeech])
  useEffect(() => localStorage.setItem('paddock-mode', mode), [mode])

  function say(text, priority = SpeechPriority.ASSISTANT) {
    if (navigationSpeech) speak(text, priority)
  }

  function notify(message) {
    setToast(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 3500)
  }

  function chooseDestination(id) {
    setSelected(id)
    setCustomDestination(null)
    setPendingNavigation(false)
    setRerouteInstructions(null)
    setHazard(false)
    const item = destinations.find((d) => d.id === id)
    if (destinationFacilityMap[id]) setVenueDestinationId(destinationFacilityMap[id])
    say(`${item.name} selected. ${item.time} away.`)
  }

  function setFetchedDestination(item) {
    const routeType = destinations.some((destinationItem) => destinationItem.id === item.id) ? item.id : item.id.split('-')[0]
    const fetchedItem = { ...item, routeType }
    setSelected(fetchedItem.id)
    setCustomDestination(fetchedItem)
    setPendingNavigation(true)
    setRerouteInstructions(null)
    setHazard(false)
    if (item.id === 'bathroom' || item.id === 'exit' || item.id === 'quiet' || item.id === 'medical') setCustomDestination(null)
    say(`Fetched ${item.name}. ${item.distance} away, approximately ${item.time}. ${item.detail}. Begin navigation?`)
    notify(`Fetched · ${item.name} · Begin navigation?`)
  }

  function chooseVenueFacility(facilityId) {
    const facility = venueFacilities.find((item) => item.id === facilityId)
    if (!facility) return
    const route = planVenueRoute('gate1', facilityId, routingPreferences)
    setVenueDestinationId(facilityId)
    setSelected(`venue-${facilityId}`)
    setCustomDestination({
      id: `venue-${facilityId}`,
      name: facility.name,
      detail: facility.status,
      time: route?.unavailable ? 'Unavailable' : `${Math.ceil(route?.minutes || 0)} min`,
      distance: route?.unavailable ? '—' : `${Math.round(route?.distance || 0)} m`,
      routeType: facility.type === 'medical' ? 'medical' : facility.type === 'grandstand' ? 'grandstand' : facility.type.includes('toilet') ? 'bathroom' : 'exit',
    })
    setPendingNavigation(!route?.unavailable)
    setRerouteInstructions(null)
    if (route?.unavailable) say(route.reason)
    else say(`${facility.name}. ${Math.round(route.distance)} metres, approximately ${route.minutes.toFixed(1)} minutes. Begin navigation?`)
  }

  function stopGpsTracking() {
    if (gpsWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchRef.current)
      gpsWatchRef.current = null
    }
    clearInterval(simulatedGpsTimerRef.current)
    simulatedGpsTimerRef.current = null
  }

  function startGpsTracking() {
    stopGpsTracking()
    setGpsState((current) => ({ ...current, status: 'requesting' }))
    if (navigator.geolocation && window.isSecureContext) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setGpsState({
            status: 'live',
            accuracy: Math.round(position.coords.accuracy),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            simulated: false,
          })
        },
        () => {
          setGpsState({ status: 'simulated', accuracy: 7, latitude: -37.8497, longitude: 144.968, simulated: true })
          startSimulatedGps()
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 7000 },
      )
      return
    }
    setGpsState({ status: 'simulated', accuracy: 7, latitude: -37.8497, longitude: 144.968, simulated: true })
    startSimulatedGps()
  }

  function startSimulatedGps() {
    clearInterval(simulatedGpsTimerRef.current)
    simulatedGpsTimerRef.current = setInterval(() => {
      setGpsState((current) => ({
        ...current,
        status: current.status === 'idle' ? 'simulated' : current.status,
        latitude: Number(((current.latitude || -37.8497) + 0.00008).toFixed(6)),
        longitude: Number(((current.longitude || 144.968) + 0.00006).toFixed(6)),
        accuracy: current.accuracy || 7,
        simulated: true,
      }))
    }, 4500)
  }

  function beginNavigation() {
    if (!destination) return
    setPendingNavigation(false)
    setNavigating(true)
    setPaused(false)
    setStep(0)
    setHazard(false)
    setRerouteInstructions(null)
    startGpsTracking()
    const firstInstruction = routeInstructions[0]
    say(`${destination.name} is approximately ${destination.time} away. ${routeReason}. GPS movement tracking is on. Camera safety monitoring is available below. ${firstInstruction.title}. ${firstInstruction.detail}.`, SpeechPriority.NAVIGATION)
  }

  function handleVoiceCommand(rawCommand) {
    const command = rawCommand.toLowerCase().trim()
    setVoiceTranscript(rawCommand)
    setVoiceError('')
    if (pendingNavigation && /^(yes|yeah|yep|begin|start|navigate|go|proceed)\b/.test(command)) {
      beginNavigation()
      return
    }
    if (/(cancel|stop|not now|no)\b/.test(command) && pendingNavigation) {
      setPendingNavigation(false)
      say('Navigation cancelled. Destination remains selected.')
      notify('Navigation cancelled')
      return
    }
    if (command.includes('turn on low vision') || command.includes('enable low vision')) {
      setMode('lowVision')
      say('Low-vision assistance on. Camera safety features are available. GPS and the venue map remain the primary navigation source.')
      return
    }
    if (command.includes('turn off low vision') || command.includes('disable low vision')) {
      setMode('standard')
      say('Low-vision assistance off. Standard voice navigation remains available.')
      return
    }
    if (navigating && /stop navigation|end navigation/.test(command)) {
      setNavigating(false)
      stopGpsTracking()
      say('Navigation stopped.')
      return
    }
    if (command.includes('simplest route') || command.includes('fastest route') || command.includes('avoid stairs') || command.includes('avoid steep') || command.includes('fewer turns') || command.includes('close to assistance') || command.includes('prefer indoor') || command.includes('prefer shade') || command.includes('limit the walk')) {
      const updated = applyVoiceRoutingPreference(command, routingPreferences)
      setRoutingPreferences(updated)
      const preferenceName = command.includes('fastest') ? 'fastest route' : command.includes('simplest') ? 'simplest route' : 'route preference'
      say(`${preferenceName} selected. I will recalculate using the venue accessibility graph.`)
      notify('Route preferences updated')
      return
    }
    if (command.includes('route preview') || command.includes('preview route')) {
      if (!venueRoute || venueRoute.unavailable) say(venueRoute?.reason || 'Select a venue destination first.')
      else say(`Route preview to ${venueRoute.destination.name}. ${Math.round(venueRoute.distance)} metres, approximately ${venueRoute.minutes.toFixed(1)} minutes, ${venueRoute.turns} turns, and ${venueRoute.indoorTransitions} indoor transitions. Confidence is ${Math.round(venueRoute.confidence * 100)} percent.`)
      return
    }
    if (command.includes('what is nearby') || command.includes('what is near me')) {
      say('Near Gate 1: Jones Grandstand, the south medical centre, an emergency exit, and the south concourse junction.')
      return
    }
    if (command.includes('orientation') || command.includes('which way am i facing')) {
      say('You are near Gate 1, facing approximately north toward the south concourse.')
      return
    }
    if (command.includes('request help') || command === 'help' || command.includes('find assistance')) {
      setVenueDestinationId('assistance-hub')
      say('The accessibility assistance hub is inside the central precinct. I have prepared a route.')
      return
    }
    const venueFacility = facilityForCommand(command)
    if (venueFacility) {
      chooseVenueFacility(venueFacility.id)
      notify(`Mapped · ${venueFacility.name}`)
      return
    }
    const match = parseDestinationCommand(rawCommand)
    if (match) {
      if (command.includes('avoid crowd')) setPrefs((current) => ({ ...current, crowds: true }))
      if (destinationFacilityMap[match.routeType || match.id]) setVenueDestinationId(destinationFacilityMap[match.routeType || match.id])
      setFetchedDestination(match)
      return
    }
    if (command.includes('where am i')) {
      say('You are at Gate 1, near the east concourse entrance. Location confidence is high.')
      notify('Gate 1 · East concourse entrance')
      return
    }
    if (command.includes('repeat')) {
      say(navigating ? `${routeInstructions[step].title}. ${routeInstructions[step].detail}.` : pendingNavigation ? `Fetched ${destination.name}. Begin navigation?` : 'No active navigation instruction.')
      return
    }
    setVoiceError('Try: grandstand C, seat row H 14, nearest exit, bathroom or Fitzroy Street.')
    say('I did not recognise that destination. Try grandstand C, seat row H 14, nearest exit, bathroom or Fitzroy Street.')
  }

  async function startVoiceAssistant() {
    if (listening) return
    if (!window.isSecureContext) {
      const secureMessage = 'Microphone access requires a secure HTTPS connection on this phone.'
      setVoiceError(secureMessage)
      if (navigationSpeech) speak(secureMessage)
      return
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      const unavailableMessage = 'This browser does not support speech recognition. Try a current version of Chrome or Safari.'
      setVoiceError(unavailableMessage)
      if (navigationSpeech) speak(unavailableMessage)
      return
    }
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      permissionStream.getTracks().forEach((track) => track.stop())
      const recognition = new Recognition()
      recognition.lang = 'en-AU'
      recognition.interimResults = false
      recognition.continuous = false
      recognition.maxAlternatives = 1
      recognitionRef.current = recognition
      recognition.onstart = () => { setListening(true); setVoiceError(''); speechService.stop() }
      recognition.onspeechstart = () => setVoiceTranscript('I can hear you…')
      recognition.onresult = (event) => handleVoiceCommand(event.results[0][0].transcript)
      recognition.onnomatch = () => {
        const noMatchMessage = 'I did not understand that. Try saying, where is the nearest toilet?'
        setVoiceError(noMatchMessage)
        if (navigationSpeech) speak(noMatchMessage)
      }
      recognition.onerror = (event) => {
        const recognitionErrors = {
          'not-allowed': 'Microphone permission is off. Enable it in your browser settings, then try again.',
          'audio-capture': 'I cannot access the microphone. Check that another app is not using it.',
          'no-speech': 'I did not hear any speech. Hold the button and try again.',
          'network': 'Speech recognition needs a network connection in this browser.',
        }
        const errorMessage = recognitionErrors[event.error] || 'I could not hear that clearly. Please try again.'
        setVoiceError(errorMessage)
        if (navigationSpeech) speak(errorMessage)
      }
      recognition.onend = () => setListening(false)
      recognition.start()
    } catch {
      const permissionMessage = 'Microphone permission was not enabled. Allow microphone access and press the voice button again.'
      setListening(false)
      setVoiceError(permissionMessage)
      if (navigationSpeech) speak(permissionMessage)
    }
  }

  function advance() {
    if (paused) return
    if (step >= routeInstructions.length - 1) {
      setNavigating(false)
      setStep(0)
      stopGpsTracking()
      say(`You have arrived at ${destination.name}.`)
      notify('Destination reached')
      return
    }
    const next = step + 1
    setStep(next)
      say(`${routeInstructions[next].title}. ${routeInstructions[next].detail}.`, SpeechPriority.NAVIGATION)
  }

  function triggerHazard(reason = 'temporary barrier') {
    const hazardReason = typeof reason === 'string' ? reason : 'temporary barrier'
    const updatedInstructions = buildRerouteInstructions(destination, routeInstructions, step, hazardReason)
    setHazard(true)
    setRerouteInstructions(updatedInstructions)
    setStep(step)
    if (navigationSpeech) {
      speechService.interruptAndSpeak('Stop. Obstacle ahead.').then(() => {
        speechService.speak(`${hazardReason} detected. Rerouting. Turn left in six metres. The alternative adds about one minute.`, SpeechPriority.ROUTE_UPDATE)
      })
    }
    notify(`Route updated · ${hazardReason} avoided`)
  }

  if (!signedIn) return <SignInFlow onComplete={(selectedMode) => { setMode(selectedMode); setSignedIn(true); localStorage.setItem('paddock-signed-in', 'true'); localStorage.setItem('paddock-mode', selectedMode) }} />

  const lowVisionHome = mode === 'lowVision' && screen === 'navigate' && !navigating
  const content = screen === 'operator'
    ? <OperatorView readTelemetry={readTelemetry} onBack={() => setScreen('navigate')} />
    : navigating
      ? <JourneyView mode={mode} speechEnabled={navigationSpeech} destination={destination} instructions={routeInstructions} step={step} remaining={remaining} progress={progress} paused={paused} hazard={hazard} offline={offline} routeReason={routeReason} readTelemetry={readTelemetry} gpsState={gpsState} onPause={() => { setPaused(!paused); say(paused ? 'Navigation resumed.' : 'Navigation paused.') }} onAdvance={advance} onHazard={triggerHazard} onOffline={() => { setOffline(!offline); say(!offline ? 'Network lost. Continuing with cached venue data.' : 'Connection restored.') }} onRepeat={() => say(`${routeInstructions[step].title}. ${routeInstructions[step].detail}.`)} onEnd={() => { setNavigating(false); stopGpsTracking() }} />
    : lowVisionHome
      ? <LowVisionPilot listening={listening} transcript={voiceTranscript} error={voiceError} pendingNavigation={pendingNavigation} destination={destination} speechEnabled={navigationSpeech} onListen={startVoiceAssistant} onStart={beginNavigation} onSettings={() => setSettingsOpen(true)} onHazard={triggerHazard} />
      : <StartView mode={mode} selected={selected} pendingNavigation={pendingNavigation} selectedDestination={destination} prefs={prefs} listening={listening} readTelemetry={readTelemetry} venueDestinationId={venueDestinationId} venueRoute={venueRoute} routingPreferences={routingPreferences} onVenueDestination={chooseVenueFacility} onRoutingPreferences={setRoutingPreferences} onSelect={chooseDestination} onPrefs={setPrefs} onListen={startVoiceAssistant} onCommand={handleVoiceCommand} onStart={beginNavigation} />

  return (
    <div className={`app-shell ${lowVisionHome ? 'low-vision-shell' : ''}`}>
      {!lowVisionHome && <Header mode={mode} screen={screen} menuOpen={menuOpen} readTelemetry={readTelemetry} onSettings={() => setSettingsOpen(true)} onMenu={() => setMenuOpen(!menuOpen)} onNavigate={() => { setScreen('navigate'); setMenuOpen(false) }} onOperator={() => { setScreen('operator'); setMenuOpen(false) }} />}
      {!lowVisionHome && menuOpen && <MobileMenu screen={screen} onNavigate={() => { setScreen('navigate'); setMenuOpen(false) }} onOperator={() => { setScreen('operator'); setMenuOpen(false) }} />}
      <main id="main">{content}</main>
      <ModeToggle mode={mode} onChange={(nextMode) => { setMode(nextMode); say(nextMode === 'lowVision' ? 'Low-vision assistance on.' : 'Low-vision assistance off. Standard voice navigation remains available.') }}/>
      {settingsOpen && <SettingsDialog mode={mode} navigationSpeech={navigationSpeech} readTelemetry={readTelemetry} onMode={setMode} onNavigationSpeech={(value) => { setNavigationSpeech(value); if (value) speak('Navigation text to speech on.') }} onReadTelemetry={(value) => { setReadTelemetry(value); if (navigationSpeech) speak(value ? 'Race updates will be read aloud.' : 'Spoken race updates off.') }} onSignOut={() => { speechService.stop(); localStorage.removeItem('paddock-signed-in'); setSignedIn(false); setSettingsOpen(false) }} onClose={() => setSettingsOpen(false)} />}
      {toast && <div className="toast" role="status"><Check size={18} aria-hidden="true" />{toast}</div>}
    </div>
  )
}

function SignInFlow({ onComplete }) {
  const [stage, setStage] = useState('signIn')
  const [email, setEmail] = useState('')
  return <main className="auth-page">
    <section className="auth-brand"><span className="brand-mark"><Navigation fill="currentColor"/></span><div><b>PADDOCK</b><strong>PILOT</strong></div></section>
    {stage === 'signIn' ? <section className="auth-card" aria-labelledby="sign-in-title">
      <div className="eyebrow"><span>WELCOME</span> ACCESSIBLE RACE-DAY NAVIGATION</div>
      <h1 id="sign-in-title">Sign in to your <em>race day.</em></h1>
      <p>Your preferences, audio settings and venue package will be ready when you return.</p>
      <form onSubmit={(event) => { event.preventDefault(); setStage('mode') }}>
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="email"/>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" placeholder="••••••••" required autoComplete="current-password"/>
        <button type="submit"><LogIn/> Sign in <ChevronRight/></button>
      </form>
      <small className="auth-notice"><Lock/> Your sign-in stays on this device.</small>
    </section> : <section className="auth-card mode-card" aria-labelledby="mode-title">
      <div className="eyebrow"><span>ONE MORE STEP</span> PERSONALISE PADDOCK PILOT</div>
      <h1 id="mode-title">How would you like to <em>navigate?</em></h1>
      <p>You can change modes later in settings.</p>
      <div className="mode-choices">
        <button onClick={() => onComplete('lowVision')}><span><Eye/></span><div><b>Low-vision pilot</b><p>Voice runs the experience, with spoken answers, persistent microphone access and optional rear-camera hazard detection.</p><em>Audio-first · Camera optional</em></div><ChevronRight/></button>
        <button onClick={() => onComplete('standard')}><span><Navigation/></span><div><b>Standard navigator</b><p>The full route, telemetry and operator experience without camera or persistent voice controls.</p><em>Visual navigation · No camera</em></div><ChevronRight/></button>
      </div>
      <button className="auth-back" onClick={() => setStage('signIn')}><ArrowLeft/> Back to sign in</button>
    </section>}
  </main>
}

function LowVisionPilot({ listening, transcript, error, pendingNavigation, destination, speechEnabled, onListen, onStart, onSettings, onHazard }) {
  return <div className="low-vision-pilot">
    <section className={`assistant-zone ${listening ? 'listening' : ''}`} aria-labelledby="assistant-zone-title">
      <button className="low-vision-settings" onClick={onSettings} aria-label="Open accessibility settings"><Settings2/></button>
      <button className="assistant-hero-button" onClick={onListen} aria-pressed={listening}>
        <span className="assistant-mic"><Mic/></span>
        <span id="assistant-zone-title">{listening ? 'Listening' : 'Ask Paddock Pilot'}</span>
        <small>{error || (pendingNavigation && destination ? `Fetched ${destination.name}. Say “begin” or press Begin navigation.` : transcript && transcript !== 'I can hear you…' ? `Last heard: ${transcript}` : listening ? 'Say “grandstand C”, “seat row H 14”, “exit”, “bathroom” or a street name' : 'Press, then ask where you need to go')}</small>
      </button>
      {pendingNavigation && destination && <button className="begin-navigation-prompt" onClick={onStart}><Navigation/> Begin navigation?</button>}
    </section>
    <CameraScanner minimal speechEnabled={speechEnabled} onHazard={onHazard}/>
  </div>
}

function VoiceAssistantDock({ listening, transcript, error, onListen, onCommand }) {
  const [typedCommand, setTypedCommand] = useState('')
  return <aside className={`voice-dock ${listening ? 'listening' : ''}`} aria-label="Paddock Pilot voice assistant">
    <button className="voice-dock-mic" onClick={onListen} aria-pressed={listening} aria-label={listening ? 'Listening for a destination' : 'Ask Paddock Pilot'}><Mic/></button>
    <div className="voice-dock-copy"><b>{listening ? 'Listening…' : 'Ask Paddock Pilot'}</b><small>{error || (transcript ? `Last heard: “${transcript}”` : '“Where is the nearest toilet?”')}</small></div>
    <form onSubmit={(event) => { event.preventDefault(); if (typedCommand.trim()) { onCommand(typedCommand); setTypedCommand('') } }}>
      <Keyboard/>
      <input value={typedCommand} onChange={(event) => setTypedCommand(event.target.value)} aria-label="Type a question for Paddock Pilot" placeholder="Type a destination…"/>
      <button type="submit" aria-label="Send typed question"><ChevronRight/></button>
    </form>
  </aside>
}

function ModeToggle({ mode, onChange }) {
  const enabled = mode === 'lowVision'
  return <button className={`low-vision-toggle ${enabled ? 'enabled' : ''}`} onClick={() => onChange(enabled ? 'standard' : 'lowVision')} aria-pressed={enabled} aria-label={`Low-vision assistance ${enabled ? 'on' : 'off'}. Press to turn ${enabled ? 'off' : 'on'}.`}>
    <Eye/><span>{enabled ? 'Low vision on' : 'Low vision off'}</span>
  </button>
}

function Header({ mode, screen, menuOpen, readTelemetry, onSettings, onMenu, onNavigate, onOperator }) {
  return <header className="topbar">
    <button className="brand" onClick={onNavigate} aria-label="Paddock Pilot home">
      <span className="brand-mark"><Navigation size={20} fill="currentColor" /></span>
      <span><b>PADDOCK</b><strong>PILOT</strong></span>
    </button>
    <nav aria-label="Primary navigation">
      <button className={screen === 'navigate' ? 'active' : ''} onClick={onNavigate}>Navigation</button>
      <button className={screen === 'operator' ? 'active' : ''} onClick={onOperator}>Operator view</button>
    </nav>
    <div className="system-status"><span className="status-dot" /> {mode === 'lowVision' ? 'Low-vision pilot' : 'Standard navigator'}</div>
    <button className="settings-button" onClick={onSettings} aria-label={`Settings. Spoken race updates ${readTelemetry ? 'on' : 'off'}`}><Settings2/><span>Settings</span><i className={readTelemetry ? 'on' : ''}>{readTelemetry ? 'Audio on' : 'Audio off'}</i></button>
    <button className="icon-button menu-button" onClick={onMenu} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X /> : <Menu />}</button>
  </header>
}

function MobileMenu({ screen, onNavigate, onOperator }) {
  return <div className="mobile-menu">
    <button className={screen === 'navigate' ? 'active' : ''} onClick={onNavigate}>Navigation <ChevronRight /></button>
    <button className={screen === 'operator' ? 'active' : ''} onClick={onOperator}>Operator view <ChevronRight /></button>
  </div>
}

function StartView({ mode, selected, pendingNavigation, selectedDestination, prefs, listening, readTelemetry, venueDestinationId, venueRoute, routingPreferences, onVenueDestination, onRoutingPreferences, onSelect, onPrefs, onListen, onCommand, onStart }) {
  const [typedCommand, setTypedCommand] = useState('')
  return <div className="start-layout">
    <section className="hero-panel">
      <div className="eyebrow"><span>LIVE NAVIGATION</span> ALBERT PARK · GATE 1</div>
      <h1>Your race day.<br/><em>On your terms.</em></h1>
      <p className="hero-copy">Audio-first guidance that anticipates crowds, adapts to hazards and keeps you confidently moving.</p>
      <button className={`talk-button ${listening ? 'listening' : ''}`} onClick={onListen} aria-pressed={listening}>
        <span className="mic-orbit"><Mic size={30} /></span>
        <span><b>{listening ? 'Listening…' : 'Ask Paddock Pilot'}</b><small>{listening ? 'Say your destination' : 'Press to speak'}</small></span>
        {listening && <span className="wave" aria-hidden="true"><i/><i/><i/><i/></span>}
      </button>
      <div className="voice-example"><Volume2 size={18}/><span>Try: “Find the nearest accessible toilet”, “use the simplest route”, or “turn on low-vision mode”.</span></div>
      <button className="map-jump" onClick={() => document.getElementById('venue-map-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><MapPin/> Open Albert Park map <ChevronRight/></button>
    </section>

    <section className="destination-panel" aria-labelledby="destinations-heading">
      <div className="section-heading">
        <div><span className="section-number">01</span><h2 id="destinations-heading">Where are you heading?</h2></div>
        <button className="text-button"><CircleHelp size={16}/> Voice commands</button>
      </div>
      <div className="destination-grid">
        {destinations.map((item) => {
          const Icon = item.icon
          return <button key={item.id} className={`destination-card ${selected === item.id ? 'selected' : ''}`} onClick={() => onSelect(item.id)} aria-pressed={selected === item.id}>
            <span className="destination-icon"><Icon size={23}/></span>
            <span className="destination-info"><b>{item.name}</b><small>{item.detail}</small></span>
            <span className="destination-meta"><b>{item.time}</b><small>{item.distance}</small></span>
            <span className="select-indicator">{selected === item.id ? <Check size={15}/> : <ChevronRight size={18}/>}</span>
          </button>
        })}
      </div>

      <form className="command-fetcher" onSubmit={(event) => { event.preventDefault(); if (typedCommand.trim()) { onCommand(typedCommand); setTypedCommand('') } }}>
        <Keyboard/>
        <input value={typedCommand} onChange={(event) => setTypedCommand(event.target.value)} aria-label="Fetch a destination by command" placeholder="Navigate to grandstand C, seat row H 14, exit, bathroom, Fitzroy Street…"/>
        <button type="submit"><ChevronRight/> Fetch</button>
      </form>

      <div className="preferences">
        <div className="section-heading compact"><div><span className="section-number">02</span><h2>Route preferences</h2></div><span className="auto-saved"><Check size={13}/> Saved automatically</span></div>
        <div className="preference-row">
          <Toggle icon={Radar} label="Avoid crowds" note="Use predicted flow" checked={prefs.crowds} onChange={() => onPrefs({ ...prefs, crowds: !prefs.crowds })}/>
          <Toggle icon={Headphones} label="Prefer quiet" note="Reduce noise exposure" checked={prefs.quiet} onChange={() => onPrefs({ ...prefs, quiet: !prefs.quiet })}/>
          <Toggle icon={Accessibility} label="No stairs" note="Hard route constraint" checked={prefs.stairs} onChange={() => onPrefs({ ...prefs, stairs: !prefs.stairs })}/>
        </div>
      </div>

      <button className="primary-action" disabled={!selected} onClick={onStart}>
        <span><Navigation size={20} fill="currentColor"/> {pendingNavigation ? 'Begin navigation?' : 'Start guidance'}</span>
        <span>{selectedDestination ? selectedDestination.name : selected ? 'Route ready' : 'Choose a destination'} <ChevronRight size={18}/></span>
      </button>
    </section>

    <AlbertParkMap route={venueRoute} destinationId={venueDestinationId} onDestination={onVenueDestination} preferences={routingPreferences} onPreferences={onRoutingPreferences}/>

    <aside className="trust-strip" aria-label="System capabilities">
      <div><ShieldCheck/><span><b>Privacy first</b><small>Camera stays on-device</small></span></div>
      <div><CloudOff/><span><b>Offline ready</b><small>Venue map is cached</small></span></div>
      <div><Sparkles/><span><b>Predictive</b><small>Avoids crowd surges</small></span></div>
      <p><Info size={15}/> Follow venue signs and staff directions when conditions change.</p>
    </aside>
    <TelemetryFeed compact readAloud={readTelemetry} />
  </div>
}

function Toggle({ icon: Icon, label, note, checked, onChange }) {
  return <button className={`preference ${checked ? 'on' : ''}`} onClick={onChange} aria-pressed={checked}>
    <span className="preference-icon"><Icon size={21}/></span>
    <span><b>{label}</b><small>{note}</small></span>
    <span className="toggle" aria-hidden="true"><i/></span>
  </button>
}

function JourneyView({ mode, speechEnabled, destination, instructions, step, remaining, progress, paused, hazard, offline, routeReason, readTelemetry, gpsState, onPause, onAdvance, onHazard, onOffline, onRepeat, onEnd }) {
  const current = instructions[step]
  const CurrentIcon = current.icon
  const gpsLabel = gpsState.status === 'live' ? `GPS live · ${gpsState.accuracy} m` : gpsState.status === 'requesting' ? 'GPS requesting permission' : gpsState.status === 'simulated' ? 'GPS route tracking' : 'GPS standby'
  return <div className="journey-page">
    <div className="journey-header">
      <button className="back-button" onClick={onEnd}><ArrowLeft size={18}/> End guidance</button>
      <div className="journey-destination"><span>Guiding to</span><b>{destination.name}</b></div>
      <div className={`connection ${offline ? 'offline' : ''}`}>{offline ? <WifiOff/> : <Wifi/>}{offline ? 'Offline · cached route' : 'Live conditions'}</div>
    </div>

    {mode === 'lowVision' && <CameraScanner promptOnLoad navigationLead speechEnabled={speechEnabled} onHazard={onHazard} />}

    <section className={`guidance-card ${hazard ? 'hazard-state' : ''}`} aria-live="polite">
      <div className="guidance-kicker">{paused ? 'NAVIGATION PAUSED' : hazard ? 'ROUTE UPDATED' : 'NEXT INSTRUCTION'}</div>
      <div className="instruction-icon"><CurrentIcon size={42}/></div>
      <h1>{paused ? 'Paused' : current.title}</h1>
      <p>{paused ? 'Route state is saved. Resume when you are ready.' : current.detail}</p>
      <div className="instruction-actions">
        <button onClick={onRepeat}><Volume2/> Repeat</button>
        <button className="pause-action" onClick={onPause}>{paused ? <Play fill="currentColor"/> : <Pause fill="currentColor"/>}{paused ? 'Resume' : 'Pause'}</button>
      </div>
    </section>

    <section className="route-progress" aria-label="Journey progress">
      <div className="metric"><small>Remaining</small><b>{remaining} m</b></div>
      <div className="progress-track"><i style={{ width: `${progress}%` }}/><span style={{ left: `${progress}%` }}><Navigation size={16} fill="currentColor"/></span></div>
      <div className="metric right"><small>Estimated</small><b>{Math.max(1, 5 - step)} min</b></div>
    </section>

    <section className="movement-strip" aria-label="GPS and camera monitoring">
      <div><MapPin/><span><b>{gpsLabel}</b><small>{gpsState.latitude && gpsState.longitude ? `${gpsState.latitude.toFixed(5)}, ${gpsState.longitude.toFixed(5)}` : 'Movement tracking starts with navigation'}</small></span></div>
      <div><Camera/><span><b>Camera safety monitor</b><small>{mode === 'lowVision' ? 'Rear camera controls are at the top of this screen' : 'Low-vision mode can enable camera hazard scanning'}</small></span></div>
    </section>

    <div className="journey-grid">
      <section className="route-story">
        <div className="card-label"><Route/> YOUR ROUTE</div>
        <div className="route-reason"><ShieldCheck/><div><b>Safer route selected</b><p>{routeReason}.</p></div></div>
        <div className="step-list">
          {instructions.map((item, i) => {
            const Icon = item.icon
            return <div key={item.title} className={`${i === step ? 'current' : ''} ${i < step ? 'done' : ''}`}><span>{i < step ? <Check/> : <Icon/>}</span><div><b>{item.title}</b><small>{item.detail}</small></div>{i === step && <em>Now</em>}</div>
          })}
        </div>
      </section>
      <section className="journey-controls">
        <div className="card-label"><Gauge/> JOURNEY CONTROLS</div>
        <p>Manage your route and respond to changing venue conditions.</p>
        <button onClick={onAdvance}><Play/> Advance journey<span>Next GPS point</span></button>
        <button className="danger-control" onClick={() => onHazard()}><TriangleAlert/> Detect barrier<span>Trigger reroute</span></button>
        <button onClick={onOffline}>{offline ? <Wifi/> : <WifiOff/>}{offline ? 'Restore connection' : 'Lose connection'}<span>{offline ? 'Resume live data' : 'Use venue cache'}</span></button>
      </section>
    </div>
    <TelemetryFeed navigationPriority={!paused} readAloud={readTelemetry} />
  </div>
}

function OperatorView({ onBack, readTelemetry }) {
  const [surge, setSurge] = useState(false)
  return <div className="operator-page">
    <div className="operator-hero">
      <div><div className="eyebrow"><span>OPERATOR</span> LIVE VENUE INTELLIGENCE</div><h1>Albert Park <em>overview</em></h1><p>Privacy-safe signals reveal access friction without exposing individual journeys.</p></div>
      <button className="outline-action" onClick={onBack}><Navigation/> Open navigator</button>
    </div>
    <div className="metrics-grid">
      <Metric icon={Route} value="148" label="Routes completed" change="+12% today"/>
      <Metric icon={AlertTriangle} value={surge ? '9' : '6'} label="Active barriers" change="3 need review" warning/>
      <Metric icon={Radar} value={surge ? 'High' : 'Moderate'} label="Gate 2 forecast" change="8 min horizon" warning={surge}/>
      <Metric icon={ShieldCheck} value="94%" label="Route confidence" change="Across active routes"/>
    </div>
    <div className="operator-grid">
      <section className="venue-map-card">
        <div className="card-top"><div><span className="card-label"><MapPin/> ACCESSIBILITY SIGNALS</span><h2>Venue pressure map</h2></div><div className="legend"><span className="low"/> Clear <span className="medium"/> Watch <span className="high"/> Act</div></div>
        <VenueMap surge={surge}/>
        <div className="map-note"><ShieldCheck/> Locations appear only after five independent observations.</div>
      </section>
      <section className="insights-card">
        <div className="card-top"><div><span className="card-label"><BarChart3/> PRIORITY INSIGHTS</span><h2>Needs attention</h2></div></div>
        <div className="insight urgent"><span><TriangleAlert/></span><div><b>Temporary barrier · East concourse</b><p>8 reports · causing 2.4 min average detour</p></div><em>P1</em></div>
        <div className="insight"><span><Radar/></span><div><b>Gate 2 surge predicted</b><p>Session ending · opposing pedestrian flows</p></div><em>P2</em></div>
        <div className="insight"><span><Accessibility/></span><div><b>West bridge accessibility debt</b><p>No step-free connection · 410 m detour</p></div><em>P2</em></div>
        <button className="surge-button" onClick={() => setSurge(!surge)}><Radio/> {surge ? 'Clear crowd surge' : 'Session ending crowd surge'}<ChevronRight/></button>
      </section>
    </div>
    <section className="activity-card">
      <div className="card-top"><div><span className="card-label"><Timer/> INCIDENT TIMELINE</span><h2>What changed today</h2></div><button className="text-button">View all activity <ChevronRight/></button></div>
      <div className="timeline">
        <div><time>14:42</time><span className="event-dot red"/><p><b>Barrier corroborated</b><small>East concourse · 5th independent report</small></p><em>Action needed</em></div>
        <div><time>14:36</time><span className="event-dot amber"/><p><b>Crowd forecast increased</b><small>Gate 2 · qualifying ends in 14 minutes</small></p><em>Monitoring</em></div>
        <div><time>14:18</time><span className="event-dot green"/><p><b>Accessible toilet reopened</b><small>Fan zone south · confirmed by venue staff</small></p><em>Resolved</em></div>
      </div>
    </section>
    <TelemetryFeed operator readAloud={readTelemetry} />
  </div>
}

function SettingsDialog({ mode, navigationSpeech, readTelemetry, onMode, onNavigationSpeech, onReadTelemetry, onSignOut, onClose }) {
  const [speechState, setSpeechState] = useState(() => speechService.snapshot())
  const [downloading, setDownloading] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [speechError, setSpeechError] = useState('')

  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  useEffect(() => speechService.subscribe(setSpeechState), [])

  async function installVoice(voiceId) {
    setDownloading(voiceId)
    setDownloadProgress(0)
    setSpeechError('')
    try {
      await speechService.downloadVoice(voiceId, setDownloadProgress)
      speak('Piper voice installed and ready.', SpeechPriority.ASSISTANT)
    } catch (error) {
      console.error('Piper voice install failed', error)
      setSpeechError('Voice could not be installed. Check your connection and available device storage, then try again.')
    } finally {
      setDownloading(null)
    }
  }

  return <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="dialog-head"><div><span>PROFILE & ACCESSIBILITY</span><h2 id="settings-title">Pilot settings</h2></div><button onClick={onClose} aria-label="Close settings"><X/></button></div>
      <p className="dialog-intro">Choose your navigation mode and which information Paddock Pilot reads aloud.</p>
      <div className="mode-setting" role="group" aria-label="Navigation mode">
        <button className={mode === 'lowVision' ? 'selected' : ''} onClick={() => onMode('lowVision')} aria-pressed={mode === 'lowVision'}><Eye/><span><b>Low-vision pilot</b><small>Voice assistant and camera hazards</small></span></button>
        <button className={mode === 'standard' ? 'selected' : ''} onClick={() => onMode('standard')} aria-pressed={mode === 'standard'}><Navigation/><span><b>Standard navigator</b><small>Visual navigation without camera</small></span></button>
      </div>
      <button className={`setting-row ${navigationSpeech ? 'enabled' : ''}`} onClick={() => onNavigationSpeech(!navigationSpeech)} aria-pressed={navigationSpeech}>
        <span className="setting-icon"><Volume2/></span>
        <span><b>Navigation text to speech</b><small>Directions, destination answers and hazard warnings</small></span>
        <span className="large-toggle" aria-hidden="true"><i/></span>
      </button>
      <button className={`setting-row ${readTelemetry ? 'enabled' : ''}`} onClick={() => onReadTelemetry(!readTelemetry)} aria-pressed={readTelemetry}>
        <span className="setting-icon"><Volume2/></span>
        <span><b>Read race updates aloud</b><small>Race control, timing, weather and session changes</small></span>
        <span className="large-toggle" aria-hidden="true"><i/></span>
      </button>
      <section className="speech-settings" aria-labelledby="speech-settings-title">
        <div className="speech-settings-head"><span><b id="speech-settings-title">Offline Piper voice</b><small>{speechState.piperReady ? 'Piper ready · works offline' : 'Install a voice once to enable offline speech'}</small></span><em className={speechState.piperReady ? 'ready' : ''}>{speechState.piperReady ? 'Offline ready' : 'Voice setup'}</em></div>
        <label htmlFor="piper-voice">Voice model</label>
        <select id="piper-voice" value={speechState.voiceId} onChange={(event) => speechService.setVoice(event.target.value)}>
          {PIPER_VOICES.map((voice) => <option key={voice.id} value={voice.id} disabled={!speechState.installedVoices.includes(voice.id)}>{voice.label}{speechState.installedVoices.includes(voice.id) ? ' · installed' : ' · download required'}</option>)}
        </select>
        <div className="voice-downloads">
          {PIPER_VOICES.filter((voice) => !speechState.installedVoices.includes(voice.id)).map((voice) => <button key={voice.id} onClick={() => installVoice(voice.id)} disabled={Boolean(downloading)}><span><b>{voice.label}</b><small>{voice.description}</small></span><em>{downloading === voice.id ? (downloadProgress > 0 ? `${Math.round(downloadProgress * 100)}%` : 'Starting…') : 'Download'}</em></button>)}
          {PIPER_VOICES.every((voice) => speechState.installedVoices.includes(voice.id)) && <p>All recommended voices are installed on this device.</p>}
        </div>
        {!speechState.piperReady && speechState.installedVoices.includes(speechState.voiceId) && <button className="repair-voice" onClick={() => installVoice(speechState.voiceId)} disabled={Boolean(downloading)}>{downloading === speechState.voiceId ? 'Repairing voice…' : 'Repair selected voice'}</button>}
        {speechError && <p className="speech-error" role="alert">{speechError}</p>}
        <div className="speech-sliders">
          <label>Rate <output>{speechState.rate.toFixed(2)}×</output><input type="range" min="0.75" max="1.35" step="0.05" value={speechState.rate} onChange={(event) => speechService.configure({ rate: event.target.value })}/></label>
          <label>Pitch <output>{speechState.pitch.toFixed(2)}×</output><input type="range" min="0.7" max="1.4" step="0.05" value={speechState.pitch} onChange={(event) => speechService.configure({ pitch: event.target.value })}/><small>Piper keeps its natural pitch; this applies when supported by the system voice.</small></label>
          <label>Volume <output>{Math.round(speechState.volume * 100)}%</output><input type="range" min="0" max="1" step="0.05" value={speechState.volume} onChange={(event) => speechService.configure({ volume: event.target.value })}/></label>
        </div>
        <button className="test-voice" onClick={() => speak('Paddock Pilot voice guidance is ready.', SpeechPriority.NAVIGATION)}><Volume2/> Test selected voice</button>
      </section>
      <div className="priority-note"><ShieldCheck/><span><b>Safety audio always wins</b><small>Turn guidance, hazards and emergency messages interrupt race updates.</small></span></div>
      <button className="dialog-done" onClick={onClose}>Done</button>
      <button className="sign-out-button" onClick={onSignOut}><LogOut/> Sign out</button>
    </section>
  </div>
}

function CameraScanner({ minimal = false, promptOnLoad = false, navigationLead = false, speechEnabled, onHazard }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const modelRef = useRef(null)
  const analysisTimerRef = useRef(null)
  const startPromptAnnouncedRef = useRef(false)
  const persistenceRef = useRef({ crowd: 0, person: 0, vehicle: 0, object: 0, pole: 0, wall: 0 })
  const lastAlertRef = useRef(0)
  const [cameraState, setCameraState] = useState('off')
  const [facingMode, setFacingMode] = useState('environment')
  const [modelState, setModelState] = useState('idle')
  const [detections, setDetections] = useState([])
  const [fps, setFps] = useState(0)
  const [message, setMessage] = useState('Camera is off. Navigation continues using location and venue data.')

  useEffect(() => () => stopStream(), [])
  useEffect(() => {
    if (!promptOnLoad || startPromptAnnouncedRef.current) return
    startPromptAnnouncedRef.current = true
    setMessage('Camera ready. Press Start rear camera to enable forward hazard detection.')
    if (speechEnabled) speak('Camera ready. Press start rear camera to begin hazard detection.', SpeechPriority.NAVIGATION)
  }, [promptOnLoad, speechEnabled])

  function stopStream() {
    clearTimeout(analysisTimerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  async function loadDetector() {
    if (modelRef.current) return modelRef.current
    setModelState('loading')
    setMessage('Preparing on-device obstacle detection.')
    const tf = await import('@tensorflow/tfjs')
    try {
      await tf.setBackend('webgl')
    } catch {
      await tf.setBackend('cpu')
    }
    await tf.ready()
    const cocoSsd = await import('@tensorflow-models/coco-ssd')
    modelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2', modelUrl: `${import.meta.env.BASE_URL}models/coco-ssd/model.json` })
    setModelState('ready')
    return modelRef.current
  }

  async function startCamera(requestedFacing = facingMode) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable')
      setMessage('Camera is unavailable in this browser. You can still scan the route for an obstacle alert.')
      return
    }
    setCameraState('requesting')
    setMessage(`Waiting for ${requestedFacing === 'environment' ? 'rear' : 'front'} camera permission.`)
    try {
      stopStream()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: requestedFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraState('active')
      setFacingMode(requestedFacing)
      setMessage(`${requestedFacing === 'environment' ? 'Rear' : 'Front'} camera active. Loading on-device hazard detection.`)
      if (speechEnabled) speak(`${requestedFacing === 'environment' ? 'Rear' : 'Front'} camera active. Forward hazard scanning is on.`, SpeechPriority.ENVIRONMENT)
      try {
        await loadDetector()
        setMessage('Detection active. Analysing the forward route corridor on this device.')
        scheduleAnalysis()
      } catch (error) {
        console.error('Hazard detector could not initialise; using proximity scanning.', error)
        setModelState('error')
        setMessage('Basic proximity detection active. Forward corridor scanning is running on this device.')
        scheduleAnalysis()
        if (speechEnabled) speak('Camera active. Basic forward hazard scanning is on.', SpeechPriority.ROUTE_UPDATE)
      }
    } catch {
      setCameraState('blocked')
      setMessage('Camera access was not enabled. Navigation still works without the camera.')
    }
  }

  function stopCamera() {
    stopStream()
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraState('off')
    setDetections([])
    setFps(0)
    setMessage('Camera is off. Navigation continues using location and venue data.')
    if (speechEnabled) speak('Camera off.', SpeechPriority.ENVIRONMENT)
  }

  async function flipCamera() {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment'
    setMessage(`Switching to the ${nextFacing === 'environment' ? 'rear' : 'front'} camera.`)
    await startCamera(nextFacing)
  }

  function detectSceneGeometry(video) {
    const canvas = canvasRef.current
    if (!canvas || video.videoWidth === 0) return null
    const width = 96
    const height = 72
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(video, 0, 0, width, height)
    const pixels = context.getImageData(0, 0, width, height).data
    const luminance = new Float32Array(width * height)
    for (let index = 0; index < luminance.length; index += 1) {
      const offset = index * 4
      luminance[index] = pixels[offset] * .2126 + pixels[offset + 1] * .7152 + pixels[offset + 2] * .0722
    }
    let sum = 0
    let sumSq = 0
    let edges = 0
    let samples = 0
    for (let y = 16; y < 68; y += 1) {
      for (let x = 19; x < 77; x += 1) {
        const value = luminance[y * width + x]
        sum += value
        sumSq += value * value
        edges += Math.abs(value - luminance[y * width + x - 1])
        samples += 1
      }
    }
    const mean = sum / samples
    const variance = sumSq / samples - mean * mean
    const averageEdge = edges / samples
    if (variance < 270 && averageEdge < 11.5 && mean > 18 && mean < 235) return { type: 'wall', label: 'wall very close ahead', confidence: .72 }

    let strongestPole = 0
    let poleRows = 0
    for (let x = 22; x < 74; x += 1) {
      let contrast = 0
      let matchingRows = 0
      for (let y = 8; y < 67; y += 1) {
        const centre = luminance[y * width + x]
        const surround = (luminance[y * width + x - 4] + luminance[y * width + x + 4]) / 2
        const difference = Math.abs(centre - surround)
        contrast += difference
        if (difference > 30) matchingRows += 1
      }
      const averageContrast = contrast / 59
      if (averageContrast > strongestPole) {
        strongestPole = averageContrast
        poleRows = matchingRows
      }
    }
    if (strongestPole > 27 && poleRows > 28) return { type: 'pole', label: 'pole or narrow obstruction ahead', confidence: .66 }
    return null
  }

  function persistentHazard(type, label, confidence, requiredFrames = 3) {
    for (const key of Object.keys(persistenceRef.current)) {
      persistenceRef.current[key] = key === type ? (persistenceRef.current[key] || 0) + 1 : 0
    }
    if (persistenceRef.current[type] < requiredFrames || Date.now() - lastAlertRef.current < 10000) return
    lastAlertRef.current = Date.now()
    persistenceRef.current[type] = 0
    const confidenceText = confidence >= .8 ? 'high confidence' : 'moderate confidence'
    setCameraState('active-hazard')
    setMessage(`Possible ${label} detected in the route corridor with ${confidenceText}.`)
    onHazard(label)
  }

  async function analyseFrame() {
    const startedAt = performance.now()
    const video = videoRef.current
    const model = modelRef.current
    if (!video || !streamRef.current || video.readyState < 2) return
    try {
      const predictions = model ? await model.detect(video, 12, .5) : []
      const width = video.videoWidth
      const height = video.videoHeight
      const people = predictions.filter((item) => item.class === 'person' && item.score >= .55)
      const enriched = predictions.map((item) => {
        const [x, y, boxWidth, boxHeight] = item.bbox
        return { ...item, centreX: (x + boxWidth / 2) / width, bottom: (y + boxHeight) / height, area: boxWidth * boxHeight / (width * height), heightRatio: boxHeight / height }
      })
      const closePeople = enriched.filter((item) => item.class === 'person' && item.score >= .55 && item.centreX > .16 && item.centreX < .84 && (item.area > .1 || item.heightRatio > .48 || item.bottom > .92))
      const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle']
      const vehicles = enriched.filter((item) => vehicleClasses.includes(item.class) && item.score >= .52 && item.bottom > .42 && (item.area > .025 || item.centreX > .18 && item.centreX < .82))
      const obstacleClasses = ['chair', 'bench', 'suitcase', 'backpack', 'dog', 'umbrella', 'potted plant', 'dining table', 'traffic light', 'stop sign', 'fire hydrant', 'sports ball']
      const corridorObjects = enriched.filter((item) => obstacleClasses.includes(item.class) && item.score >= .52 && item.centreX > .18 && item.centreX < .82 && item.bottom > .46 && (item.area > .018 || item.bottom > .82))
      const geometryHazard = detectSceneGeometry(video)
      setDetections(predictions.filter((item) => item.score >= .55).slice(0, 12))
      if (people.length >= 3 && people.some((item) => item.bbox[1] + item.bbox[3] > height * .58)) {
        persistentHazard('crowd', `crowd of ${people.length} people close ahead`, Math.min(.95, Math.max(...people.map((item) => item.score))), 2)
      } else if (closePeople.length) {
        persistentHazard('person', 'person very close ahead', Math.max(...closePeople.map((item) => item.score)), 2)
      } else if (vehicles.length) {
        const nearestVehicle = vehicles.sort((a, b) => b.area - a.area)[0]
        const roadLabel = vehicles.length > 1 ? 'vehicle traffic crossing the route' : `${nearestVehicle.class} close to the walking route`
        persistentHazard('vehicle', roadLabel, nearestVehicle.score, 2)
      } else if (corridorObjects.length) {
        const nearest = corridorObjects.sort((a, b) => b.area - a.area)[0]
        persistentHazard('object', `${nearest.class} close ahead`, nearest.score, 2)
      } else if (geometryHazard) {
        persistentHazard(geometryHazard.type, geometryHazard.label, geometryHazard.confidence, geometryHazard.type === 'wall' ? 3 : 4)
      } else {
        persistenceRef.current = { crowd: 0, person: 0, vehicle: 0, object: 0, pole: 0, wall: 0 }
        if (cameraState === 'active-hazard') setCameraState('active')
      }
      setFps(Math.max(1, Math.round(1000 / Math.max(1, performance.now() - startedAt))))
    } catch {
      setMessage('Detection paused temporarily. Camera navigation support is reduced.')
    }
  }

  function scheduleAnalysis() {
    clearTimeout(analysisTimerRef.current)
    const tick = async () => {
      await analyseFrame()
      if (streamRef.current) analysisTimerRef.current = setTimeout(tick, 650)
    }
    analysisTimerRef.current = setTimeout(tick, 300)
  }

  function scanRoute() {
    setCameraState('detecting')
    setMessage('Scanning the forward route corridor.')
    setTimeout(() => {
      setCameraState(streamRef.current ? 'active-hazard' : 'route-hazard')
      setMessage('Possible temporary barrier detected ahead with high confidence.')
      onHazard()
    }, 1100)
  }

  const active = cameraState === 'active' || cameraState === 'active-hazard' || cameraState === 'detecting'
  const detected = cameraState === 'active-hazard' || cameraState === 'route-hazard'

  const cameraVisual = <div className="camera-view" aria-label="Forward camera preview">
    <video ref={videoRef} muted playsInline aria-hidden={!active}/>
    <canvas ref={canvasRef} hidden/>
    {!active && <div className="camera-placeholder"><Camera/><b>Rear camera off</b><small>Point the phone toward the route ahead</small></div>}
    {active && <div className="scan-overlay" aria-hidden="true"><i/><span>ROUTE CORRIDOR</span></div>}
    {active && detections.map((item, index) => <div className={`object-box ${item.class === 'person' ? 'person' : ''}`} key={`${item.class}-${index}`} aria-hidden="true" style={{ left: `${item.bbox[0] / Math.max(1, videoRef.current?.videoWidth || 1) * 100}%`, top: `${item.bbox[1] / Math.max(1, videoRef.current?.videoHeight || 1) * 100}%`, width: `${item.bbox[2] / Math.max(1, videoRef.current?.videoWidth || 1) * 100}%`, height: `${item.bbox[3] / Math.max(1, videoRef.current?.videoHeight || 1) * 100}%` }}><span>{item.class} · {Math.round(item.score * 100)}%</span></div>)}
    {detected && <div className="detection-box" aria-hidden="true"><span>STOP · OBSTACLE AHEAD</span><b>IMMINENT</b></div>}
    {!active && navigationLead && <button className="camera-start-overlay" onClick={() => startCamera('environment')} disabled={cameraState === 'requesting'}><Camera/><span><b>{cameraState === 'requesting' ? 'Waiting for permission…' : 'Start rear camera'}</b><small>Tap to enable forward hazard alerts</small></span></button>}
  </div>

  if (minimal) return <section className={`vision-zone ${active ? 'active' : ''} ${detected ? 'imminent' : ''}`} aria-labelledby="vision-zone-title">
    <h2 id="vision-zone-title" className="sr-only">Forward hazard camera</h2>
    {cameraVisual}
    <div className="vision-controls">
      {!active && <button className="vision-start" onClick={() => startCamera('environment')} disabled={cameraState === 'requesting'}><Camera/>{cameraState === 'requesting' ? 'Waiting for camera permission' : 'Start rear camera'}</button>}
      {active && <><button onClick={flipCamera}><SwitchCamera/> Use {facingMode === 'environment' ? 'front' : 'rear'} camera</button><button onClick={stopCamera}><X/> Camera off</button></>}
      <button className="vision-scan" onClick={scanRoute} disabled={cameraState === 'detecting'}><ScanLine/> Scan for obstacles</button>
    </div>
    <div className="vision-spoken-status" role="status" aria-live={detected ? 'assertive' : 'polite'}>{detected ? 'Stop. Imminent obstacle ahead.' : message}</div>
  </section>

  return <section className={`camera-panel ${navigationLead ? 'navigation-camera-first' : ''} ${active ? 'active' : ''} ${detected ? 'detected' : ''}`} aria-labelledby="camera-title">
    <div className="camera-copy">
      <span className="card-label"><Camera/> FORWARD CAMERA</span>
      <h2 id="camera-title">Hazard scan</h2>
      <p>Live on-device detection watches the route corridor for sustained crowds, vehicles, loose objects and possible solid obstructions.</p>
      <div className="privacy-chip"><Lock/><span><b>On-device only</b><small>No recording, upload or face recognition</small></span></div>
      <div className="camera-meta"><span><b>{facingMode === 'environment' ? 'Rear camera' : 'Front camera'}</b><small>{modelState === 'ready' ? `Detector ready${fps ? ` · ${fps} FPS` : ''}` : modelState === 'loading' ? 'Loading detector…' : modelState === 'error' ? 'Detector unavailable' : 'Detector starts with camera'}</small></span>{active && <button onClick={flipCamera}><SwitchCamera/> Use {facingMode === 'environment' ? 'front' : 'rear'} camera</button>}</div>
      <div className="camera-status" role="status"><span className={`camera-dot ${detected ? 'danger' : active ? 'live' : ''}`}/>{message}</div>
      <div className="camera-actions">
        {active ? <button className="camera-secondary" onClick={stopCamera}><X/> Turn camera off</button> : <button className="camera-primary" onClick={() => startCamera('environment')} disabled={cameraState === 'requesting'}><Camera/> {cameraState === 'requesting' ? 'Waiting for permission…' : 'Start rear camera'}</button>}
        <button className="camera-secondary" onClick={scanRoute} disabled={cameraState === 'detecting'}><ScanLine/> {cameraState === 'detecting' ? 'Scanning…' : 'Scan route'}</button>
      </div>
    </div>
    {cameraVisual}
  </section>
}

const telemetryEvents = [
  { type: 'Race control', title: 'Yellow flag · Turn 6', detail: 'Debris reported on circuit', time: '14:44:08', tone: 'yellow', icon: Flag },
  { type: 'Timing', title: 'PIA improves to P2', detail: '+0.182 to session leader', time: '14:43:51', tone: 'green', icon: TrendingUp },
  { type: 'Weather', title: 'Light rain expected', detail: 'In approximately 12 minutes', time: '14:43:22', tone: 'blue', icon: CloudRain },
  { type: 'Session', title: 'Track status clear', detail: 'Green flag conditions restored', time: '14:42:57', tone: 'green', icon: Zap },
  { type: 'Race control', title: 'DRS enabled', detail: 'Race control has enabled DRS for the session', time: '14:42:31', tone: 'green', icon: Flag },
  { type: 'Timing', title: 'VER starts a flying lap', detail: 'Personal best first sector', time: '14:41:58', tone: 'blue', icon: Timer },
  { type: 'Pit lane', title: 'RUS leaves the garage', detail: 'Medium tyres fitted for this run', time: '14:41:36', tone: 'green', icon: Zap },
  { type: 'Timing', title: 'HAM moves into P5', detail: '0.438 seconds behind the leader', time: '14:41:11', tone: 'green', icon: TrendingUp },
  { type: 'Race control', title: 'Track limits warning', detail: 'Lap time deleted at Turn 4', time: '14:40:47', tone: 'yellow', icon: Flag },
  { type: 'Weather', title: 'Track temperature falling', detail: 'Down 1.8 degrees in the last ten minutes', time: '14:40:15', tone: 'blue', icon: CloudRain },
  { type: 'Session', title: 'Five minutes remaining', detail: 'Qualifying session clock approaching zero', time: '14:39:55', tone: 'yellow', icon: Timer },
  { type: 'Timing', title: 'ALO sets a personal best', detail: 'Improves by 0.214 seconds', time: '14:39:29', tone: 'green', icon: TrendingUp },
  { type: 'Race control', title: 'Double yellow · Turn 11', detail: 'Car moving slowly near the exit', time: '14:39:03', tone: 'yellow', icon: Flag },
  { type: 'Session', title: 'Pit lane queue forming', detail: 'Seven cars preparing for final runs', time: '14:38:42', tone: 'blue', icon: Radio },
]

const driverNames = {
  NOR: 'Lando Norris',
  PIA: 'Oscar Piastri',
  LEC: 'Charles Leclerc',
  VER: 'Max Verstappen',
  RUS: 'George Russell',
  HAM: 'Lewis Hamilton',
  ALO: 'Fernando Alonso',
}

function expandDriverNames(text) {
  return text.replace(/\b(NOR|PIA|LEC)\b/g, (code) => driverNames[code] || code)
}

function TelemetryFeed({ compact = false, navigationPriority = false, operator = false, readAloud = false }) {
  const [running, setRunning] = useState(true)
  const [elapsed, setElapsed] = useState(418)
  const [activeEvent, setActiveEvent] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setElapsed((value) => value + 1)
      setActiveEvent((current) => {
        let next = current
        while (next === current) next = Math.floor(Math.random() * telemetryEvents.length)
        return next
      })
    }, 12000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!running || !readAloud) return
    const event = telemetryEvents[activeEvent]
    const spokenTitle = expandDriverNames(event.spokenTitle || event.title)
    const spokenDetail = expandDriverNames(event.spokenDetail || event.detail)
    speak(`${event.type} update. ${spokenTitle}. ${spokenDetail}.`, SpeechPriority.ENVIRONMENT)
  }, [activeEvent, readAloud, running])

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const seconds = (elapsed % 60).toString().padStart(2, '0')
  const visibleEvents = compact ? telemetryEvents.slice(activeEvent, activeEvent + 1) : telemetryEvents

  return <section className={`telemetry-feed ${compact ? 'compact' : ''} ${operator ? 'operator-feed' : ''}`} aria-labelledby={`telemetry-title-${compact ? 'compact' : operator ? 'operator' : 'journey'}`}>
    <div className="telemetry-head">
      <div className="telemetry-title">
        <span className="live-pulse" aria-hidden="true" />
        <div><span>RACE UPDATES</span><h2 id={`telemetry-title-${compact ? 'compact' : operator ? 'operator' : 'journey'}`}>Race telemetry</h2></div>
      </div>
      <div className="session-clock"><small>Q2 · SESSION CLOCK</small><b>07:{minutes}:{seconds}</b></div>
      <div className="telemetry-actions">
        {readAloud && <span className="audio-suppressed"><Volume2/> Read aloud on{navigationPriority ? ' · navigation priority' : ''}</span>}
        {!readAloud && <span className="audio-suppressed muted"><VolumeX/> Read aloud off</span>}
        <button onClick={() => setRunning(!running)} aria-pressed={!running}>{running ? <Pause/> : <Play/>}<span>{running ? 'Pause feed' : 'Resume feed'}</span></button>
      </div>
    </div>
    <div className="telemetry-body">
      <div className="leaderboard" aria-label="Top three timing positions">
        <div><em>1</em><span><b>NOR</b><small>McLaren</small></span><strong>1:16.742</strong></div>
        <div className="featured"><em>2</em><span><b>PIA</b><small>McLaren</small></span><strong>+0.182</strong></div>
        <div><em>3</em><span><b>LEC</b><small>Ferrari</small></span><strong>+0.291</strong></div>
      </div>
      <div className="telemetry-events" aria-live="off">
        {visibleEvents.map((event, index) => {
          const EventIcon = event.icon
          return <div className={`telemetry-event ${event.tone} ${!compact && index === activeEvent ? 'latest' : ''}`} key={`${event.time}-${compact ? activeEvent : index}`}>
            <span><EventIcon/></span><div><small>{event.type}</small><b>{event.title}</b><p>{event.detail}</p></div><time>{event.time}</time>
          </div>
        })}
      </div>
      <div className="conditions">
        <div><CloudRain/><span><small>TRACK</small><b>29.4°C</b></span></div>
        <div><Gauge/><span><small>WIND</small><b>18 km/h</b></span></div>
        <div><Timer/><span><small>SESSION ENDS</small><b>8 min</b></span></div>
      </div>
    </div>
    <footer><Info/> Race updates remain lower priority than navigation and safety guidance.</footer>
  </section>
}

function Metric({ icon: Icon, value, label, change, warning }) {
  return <div className={`metric-card ${warning ? 'warning' : ''}`}><div><span><Icon/></span><small>{label}</small></div><b>{value}</b><p>{change}</p></div>
}

function VenueMap({ surge }) {
  return <div className="venue-map" role="img" aria-label={`Simplified Albert Park venue pressure map. Gate 2 crowd pressure is ${surge ? 'high' : 'moderate'}.`}>
    <svg viewBox="0 0 720 390" aria-hidden="true">
      <defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#d9d8d1" strokeWidth=".6"/></pattern></defs>
      <rect width="720" height="390" fill="url(#grid)"/>
      <path className="lake" d="M268 72c82-49 190-34 226 22 38 60 8 111-54 134-74 28-124 91-196 67-68-23-90-91-45-140 25-27 27-58 69-83Z"/>
      <path className="track" d="M93 259c31-83 102-167 210-193 109-26 239-4 309 62 66 62 37 144-52 177-85 32-200 33-308 29-108-4-192 8-159-75Z"/>
      <path className="track-inner" d="M142 252c29-63 91-126 177-145 87-19 198-3 250 44 45 41 20 89-46 110-73 24-171 25-262 22-81-3-146 3-119-31Z"/>
      <path className="route-line" d="M105 285C175 300 194 247 240 229S315 185 351 201s47 65 97 70 98-25 156-67"/>
      <circle className="map-point start" cx="105" cy="285" r="9"/><circle className="map-point end" cx="604" cy="204" r="9"/>
      <circle className="pulse amber" cx="443" cy="271" r={surge ? '32' : '23'}/><circle className={`pulse ${surge ? 'red' : 'amber'}`} cx="577" cy="170" r={surge ? '42' : '25'}/><circle className="pulse red" cx="251" cy="222" r="27"/>
      <g className="map-label"><rect x="200" y="184" width="105" height="29" rx="5"/><text x="252" y="203">BARRIER · 8</text></g>
      <g className="map-label"><rect x="527" y="124" width="98" height="29" rx="5"/><text x="576" y="143">GATE 2 · {surge ? 'HIGH' : 'WATCH'}</text></g>
      <text className="zone-label" x="83" y="320">GATE 1</text><text className="zone-label" x="570" y="235">EAST CONCOURSE</text><text className="water-label" x="330" y="155">ALBERT PARK LAKE</text>
    </svg>
  </div>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
