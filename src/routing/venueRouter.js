import { venueEdges, venueFacilities, venueNodes } from '../data/albertParkVenue.js'

const nodeById = new Map(venueNodes.map((node) => [node.id, node]))

function edgeTravelMinutes(edge, walkingSpeed = 1.15) {
  let seconds = edge.distance / Math.max(.55, walkingSpeed)
  if (edge.stairs) seconds *= 1.35
  if ((edge.slope || 0) > .04) seconds *= 1.18
  if (edge.indoor) seconds += 18
  if (edge.crossing) seconds += 22
  return seconds / 60
}

function edgeComplexity(edge) {
  return edge.turns * .6
    + edge.intersectionComplexity * 2
    + (edge.stairs ? 1.8 : 0)
    + (edge.indoor ? .45 : 0)
    + (edge.crossing ? 1.1 : 0)
    + (1 - edge.landmarkQuality) * 1.4
    + edge.lowVisionDifficulty
    + (1 - edge.confidence) * 1.2
}

function edgeAllowed(edge, preferences) {
  if (preferences.avoidStairs && edge.stairs) return false
  if (preferences.avoidSteepSlopes && (edge.slope == null || edge.slope > .055)) return false
  if (preferences.wheelchair && edge.wheelchairAccessible !== true) return false
  if (edge.temporaryBarrier) return false
  return true
}

function edgeCost(edge, preferences) {
  const time = edgeTravelMinutes(edge, preferences.walkingSpeed)
  let complexity = edgeComplexity(edge)
  if (preferences.fewerTurns) complexity += edge.turns * 1.3
  if (preferences.preferIndoor && !edge.indoor) complexity += .8
  if (preferences.preferShade) complexity += (1 - (edge.shade ?? .2)) * .9
  if (preferences.keepNearAssistance) complexity += (1 - edge.assistanceProximity) * 1.2
  return preferences.timeWeight * time + preferences.simplicityWeight * complexity
}

function neighbours(nodeId) {
  return venueEdges.flatMap((edge) => {
    if (edge.from === nodeId) return [{ edge, node: edge.to }]
    if (edge.to === nodeId) return [{ edge, node: edge.from }]
    return []
  })
}

export const defaultRoutingPreferences = {
  timeWeight: .48,
  simplicityWeight: .52,
  avoidStairs: true,
  avoidSteepSlopes: false,
  fewerTurns: true,
  keepNearAssistance: false,
  preferIndoor: false,
  preferShade: false,
  wheelchair: false,
  walkingSpeed: 1.15,
  maxDistance: null,
}

export function planVenueRoute(originId, facilityId, preferences = {}) {
  const prefs = { ...defaultRoutingPreferences, ...preferences }
  const destination = venueFacilities.find((item) => item.id === facilityId)
  if (!destination || !nodeById.has(originId)) return null
  const distances = new Map([[originId, 0]])
  const previous = new Map()
  const queue = [{ node: originId, cost: 0 }]
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost)
    const current = queue.shift()
    if (current.node === destination.nodeId) break
    if (current.cost !== distances.get(current.node)) continue
    for (const candidate of neighbours(current.node)) {
      if (!edgeAllowed(candidate.edge, prefs)) continue
      const nextCost = current.cost + edgeCost(candidate.edge, prefs)
      if (nextCost < (distances.get(candidate.node) ?? Infinity)) {
        distances.set(candidate.node, nextCost)
        previous.set(candidate.node, { node: current.node, edge: candidate.edge })
        queue.push({ node: candidate.node, cost: nextCost })
      }
    }
  }
  if (!distances.has(destination.nodeId)) return { destination, unavailable: true, reason: 'No route satisfies the selected hard constraints.' }
  const nodes = [destination.nodeId]
  const edges = []
  let cursor = destination.nodeId
  while (cursor !== originId) {
    const entry = previous.get(cursor)
    if (!entry) break
    edges.unshift(entry.edge)
    nodes.unshift(entry.node)
    cursor = entry.node
  }
  const distance = edges.reduce((sum, edge) => sum + edge.distance, 0)
  if (prefs.maxDistance && distance > prefs.maxDistance) return { destination, unavailable: true, reason: `The shortest matching route is ${distance} metres, above the ${prefs.maxDistance} metre limit.` }
  const minutes = edges.reduce((sum, edge) => sum + edgeTravelMinutes(edge, prefs.walkingSpeed), 0)
  const complexity = edges.reduce((sum, edge) => sum + edgeComplexity(edge), 0)
  const confidence = edges.length ? edges.reduce((sum, edge) => sum + edge.confidence, 0) / edges.length : 1
  return {
    destination,
    nodes,
    edges,
    distance,
    minutes,
    complexity,
    confidence,
    turns: edges.reduce((sum, edge) => sum + edge.turns, 0),
    indoorTransitions: edges.reduce((sum, edge, index) => sum + (index && edge.indoor !== edges[index - 1].indoor ? 1 : 0), 0),
    sources: [...new Set(edges.map((edge) => edge.source))],
  }
}

export function applyVoiceRoutingPreference(command, current) {
  const next = { ...current }
  const text = command.toLowerCase()
  if (text.includes('simplest route')) Object.assign(next, { timeWeight: .25, simplicityWeight: .75, fewerTurns: true })
  if (text.includes('fastest route')) Object.assign(next, { timeWeight: .8, simplicityWeight: .2 })
  if (text.includes('avoid stairs')) next.avoidStairs = true
  if (text.includes('avoid steep')) next.avoidSteepSlopes = true
  if (text.includes('fewer turns')) next.fewerTurns = true
  if (text.includes('close to assistance')) next.keepNearAssistance = true
  if (text.includes('prefer indoor')) next.preferIndoor = true
  if (text.includes('prefer shaded') || text.includes('prefer shade')) next.preferShade = true
  const limit = text.match(/limit (?:the )?walk to (\d+)\s*metres?/)?.[1]
  if (limit) next.maxDistance = Number(limit)
  return next
}
