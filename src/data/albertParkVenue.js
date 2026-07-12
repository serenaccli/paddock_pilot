export const VENUE_BOUNDS = {
  north: -37.8379,
  south: -37.8568,
  west: 144.9631,
  east: 144.9824,
}

export const SOURCE_LABELS = {
  official: { label: 'Official event map', colour: '#2f70d0' },
  osm: { label: 'Street map', colour: '#168064' },
  manual: { label: 'Venue facilities', colour: '#b46f12' },
  simulated: { label: 'Event services', colour: '#8a5fa8' },
}

// Normalised x/y values align the route graph to the supplied Albert Park visitor map.
export const venueNodes = [
  // x/y use the supplied 2026 visitor-map image coordinate system (viewBox 0 0 100 72).
  { id: 'gate1', name: 'Gate 1', x: 43.4, y: 61.2, lat: -37.8551, lon: 144.9747, source: 'official', verified: true, landmark: 'Gate 1 entry sign' },
  { id: 'south-junction', name: 'South concourse junction', x: 36.8, y: 55.0, lat: -37.8537, lon: 144.9713, source: 'manual', verified: false, landmark: 'Jones concourse junction' },
  { id: 'lauda', name: 'Lauda precinct', x: 73.0, y: 47.5, lat: -37.8519, lon: 144.9790, source: 'official', verified: true, landmark: 'Lauda grandstand sign' },
  { id: 'west-south', name: 'West lakeside south', x: 24.8, y: 51.5, lat: -37.8495, lon: 144.9665, source: 'manual', verified: false, landmark: 'The Precinct entrance' },
  { id: 'gate3', name: 'Gate 3', x: 6.0, y: 41.8, lat: -37.8468, lon: 144.9650, source: 'official', verified: true, landmark: 'Gate 3 sign' },
  { id: 'west-north', name: 'West lakeside north', x: 9.0, y: 29.4, lat: -37.8433, lon: 144.9658, source: 'osm', verified: true, landmark: 'Stewart grandstand edge' },
  { id: 'gate5', name: 'Gate 5', x: 18.0, y: 12.5, lat: -37.8397, lon: 144.9687, source: 'official', verified: true, landmark: 'Gate 5 tram signs' },
  { id: 'north-junction', name: 'North precinct junction', x: 37.0, y: 18.0, lat: -37.8402, lon: 144.9730, source: 'manual', verified: false, landmark: 'Clark grandstand concourse' },
  { id: 'gate8', name: 'Gate 8', x: 54.0, y: 27.9, lat: -37.8415, lon: 144.9782, source: 'official', verified: true, landmark: 'Gate 8 overpass' },
  { id: 'east-north', name: 'East lakeside north', x: 61.3, y: 32.3, lat: -37.8438, lon: 144.9805, source: 'manual', verified: false, landmark: 'Gate 9 concourse' },
  { id: 'east-centre', name: 'East concourse', x: 67.7, y: 34.2, lat: -37.8469, lon: 144.9812, source: 'official', verified: true, landmark: 'Gate 9 sign' },
  { id: 'gate10', name: 'Gate 10', x: 85.8, y: 50.9, lat: -37.8503, lon: 144.9802, source: 'official', verified: true, landmark: 'Gate 10 pickup signs' },
  { id: 'east-south', name: 'East concourse south', x: 76.2, y: 48.0, lat: -37.8528, lon: 144.9780, source: 'manual', verified: false, landmark: 'Webber and Vettel concourse' },
  { id: 'pit-entry', name: 'Pit entry precinct', x: 58.5, y: 55.5, lat: -37.8520, lon: 144.9752, source: 'official', verified: true, landmark: 'Pit entry suites' },
  { id: 'indoor-hub', name: 'Accessibility hub interior', x: 47.8, y: 47.0, lat: -37.8492, lon: 144.9758, source: 'manual', verified: false, landmark: 'Melbourne Walk assistance desk', indoor: true, level: 0 },
  { id: 'platform', name: 'Accessible viewing platform', x: 43.0, y: 45.2, lat: -37.8488, lon: 144.9739, source: 'official', verified: true, landmark: 'Accessible platform marker', level: 1 },
  { id: 'fan-zone', name: 'Fan zone', x: 30.5, y: 18.5, lat: -37.8449, lon: 144.9701, source: 'official', verified: true, landmark: 'Lakeside precinct audio' },
]

const path = (id, from, to, distance, overrides = {}) => ({
  id, from, to, distance,
  surface: null,
  smoothness: null,
  width: null,
  slope: null,
  stairs: false,
  ramp: false,
  lighting: null,
  shade: null,
  tactilePaving: null,
  handrails: null,
  kerb: null,
  crossing: false,
  temporaryBarrier: false,
  expectedCrowd: .35,
  wheelchairAccessible: null,
  lowVisionDifficulty: .35,
  indoor: false,
  turns: 1,
  intersectionComplexity: .25,
  landmarkQuality: .6,
  assistanceProximity: .5,
  confidence: .7,
  source: 'osm',
  verified: false,
  ...overrides,
})

export const venueEdges = [
  path('e01', 'gate1', 'south-junction', 145, { surface: 'sealed', smoothness: 'good', width: 4.2, shade: .2, wheelchairAccessible: true, confidence: .9, source: 'official', verified: true }),
  path('e02', 'south-junction', 'west-south', 130, { surface: 'sealed', slope: .02, wheelchairAccessible: true, landmarkQuality: .8, confidence: .85 }),
  path('e03', 'west-south', 'gate3', 165, { surface: 'compacted gravel', smoothness: 'fair', slope: .04, expectedCrowd: .48, lowVisionDifficulty: .48 }),
  path('e04', 'gate3', 'west-north', 180, { surface: 'sealed', crossing: true, kerb: 'dropped', tactilePaving: true, intersectionComplexity: .55, wheelchairAccessible: true }),
  path('e05', 'west-north', 'gate5', 205, { surface: 'sealed', shade: .65, expectedCrowd: .58, wheelchairAccessible: true }),
  path('e06', 'gate5', 'north-junction', 240, { surface: 'sealed', crossing: true, tactilePaving: null, intersectionComplexity: .6, lowVisionDifficulty: .55 }),
  path('e07', 'north-junction', 'gate8', 175, { surface: 'sealed', width: 5, expectedCrowd: .72, wheelchairAccessible: true, source: 'manual' }),
  path('e08', 'gate8', 'east-north', 220, { surface: 'sealed', slope: .03, shade: .15, expectedCrowd: .6, wheelchairAccessible: true }),
  path('e09', 'east-north', 'east-centre', 160, { surface: 'sealed', crossing: true, intersectionComplexity: .62, expectedCrowd: .5 }),
  path('e10', 'east-centre', 'gate10', 190, { surface: 'sealed', width: 3.8, lighting: 'event lighting', wheelchairAccessible: true }),
  path('e11', 'gate10', 'east-south', 215, { surface: 'sealed', slope: .01, shade: .3, wheelchairAccessible: true }),
  path('e12', 'east-south', 'lauda', 160, { surface: 'sealed', expectedCrowd: .45, wheelchairAccessible: true, source: 'manual' }),
  path('e13', 'lauda', 'pit-entry', 145, { surface: 'sealed', expectedCrowd: .74, lowVisionDifficulty: .57, landmarkQuality: .75, source: 'official', verified: true }),
  path('e14', 'pit-entry', 'gate1', 155, { surface: 'sealed', width: 4, wheelchairAccessible: true, confidence: .9, source: 'official', verified: true }),
  path('e15', 'south-junction', 'pit-entry', 205, { surface: 'sealed', crossing: true, intersectionComplexity: .5, wheelchairAccessible: true, source: 'manual' }),
  path('e16', 'pit-entry', 'platform', 225, { surface: 'sealed', ramp: true, slope: .055, handrails: true, wheelchairAccessible: true, lowVisionDifficulty: .3, source: 'official', verified: true }),
  path('e17', 'platform', 'indoor-hub', 95, { surface: 'vinyl', smoothness: 'good', width: 2.2, indoor: true, lighting: 'bright', shade: 1, ramp: true, slope: .04, handrails: true, wheelchairAccessible: true, intersectionComplexity: .15, confidence: .65, source: 'manual' }),
  path('e18', 'indoor-hub', 'pit-entry', 140, { surface: 'sealed', indoor: true, lighting: 'bright', wheelchairAccessible: true, turns: 2, source: 'manual' }),
  path('e19', 'west-north', 'fan-zone', 155, { surface: 'grass and matting', smoothness: 'variable', expectedCrowd: .8, lowVisionDifficulty: .65, wheelchairAccessible: null, source: 'manual' }),
  path('e20', 'fan-zone', 'north-junction', 180, { surface: 'temporary matting', expectedCrowd: .85, turns: 2, landmarkQuality: .9, source: 'simulated', confidence: .45 }),
  path('e21', 'fan-zone', 'platform', 210, { surface: 'sealed', crossing: true, slope: .03, wheelchairAccessible: true, expectedCrowd: .62, source: 'manual' }),
  path('e22', 'platform', 'pit-entry', 120, { surface: 'sealed', stairs: true, handrails: true, wheelchairAccessible: false, turns: 1, confidence: .8, source: 'official', verified: true }),
]

// Hand-digitised centre lines follow the recommended paths visible on the supplied 2026 visitor map.
// Coordinates use the same 100 × 72 image coordinate space as venueNodes.
export const venueEdgeGeometry = {
  e01: [[43.4, 61.2], [40.5, 58.3], [36.8, 55.0]],
  e02: [[36.8, 55.0], [31.0, 53.4], [24.8, 51.5]],
  e03: [[24.8, 51.5], [18.2, 49.7], [11.0, 46.1], [6.0, 41.8]],
  e04: [[6.0, 41.8], [6.8, 35.8], [9.0, 29.4]],
  e05: [[9.0, 29.4], [10.7, 22.1], [13.6, 16.2], [18.0, 12.5]],
  e06: [[18.0, 12.5], [25.8, 14.3], [32.0, 16.7], [37.0, 18.0]],
  e07: [[37.0, 18.0], [43.5, 21.0], [49.8, 24.1], [54.0, 27.9]],
  e08: [[54.0, 27.9], [57.2, 29.5], [61.3, 32.3]],
  e09: [[61.3, 32.3], [64.3, 33.1], [67.7, 34.2]],
  e10: [[67.7, 34.2], [74.0, 37.1], [79.8, 42.8], [84.0, 47.2], [85.8, 50.9]],
  e11: [[85.8, 50.9], [81.4, 49.7], [76.2, 48.0]],
  e12: [[76.2, 48.0], [73.0, 47.5]],
  e13: [[73.0, 47.5], [68.0, 50.7], [63.0, 53.2], [58.5, 55.5]],
  e14: [[58.5, 55.5], [53.0, 57.6], [47.6, 59.5], [43.4, 61.2]],
  e15: [[36.8, 55.0], [44.0, 54.0], [51.0, 54.8], [58.5, 55.5]],
  e16: [[58.5, 55.5], [53.0, 52.0], [48.0, 48.0], [43.0, 45.2]],
  e17: [[43.0, 45.2], [45.2, 45.8], [47.8, 47.0]],
  e18: [[47.8, 47.0], [52.5, 50.0], [58.5, 55.5]],
  e19: [[9.0, 29.4], [15.0, 24.0], [22.5, 20.4], [30.5, 18.5]],
  e20: [[30.5, 18.5], [33.5, 17.8], [37.0, 18.0]],
  e21: [[30.5, 18.5], [35.5, 26.0], [39.5, 35.0], [43.0, 45.2]],
  e22: [[43.0, 45.2], [49.0, 49.3], [54.2, 53.0], [58.5, 55.5]],
}

const facility = (id, name, type, nodeId, source, overrides = {}) => ({ id, name, type, nodeId, source, verified: source === 'official', status: 'Check signs on arrival', accessible: null, ...overrides })

export const venueFacilities = [
  facility('gate-1', 'Gate 1', 'gate', 'gate1', 'official', { status: 'Mapped entrance', accessible: true }),
  facility('gate-3', 'Gate 3', 'gate', 'gate3', 'official', { status: 'Mapped entrance', accessible: true }),
  facility('gate-5', 'Gate 5', 'gate', 'gate5', 'official', { status: 'Mapped entrance', accessible: true }),
  facility('gate-8', 'Gate 8', 'gate', 'gate8', 'official', { status: 'Mapped entrance', accessible: true }),
  facility('gate-10', 'Gate 10', 'gate', 'gate10', 'official', { status: 'Mapped entrance', accessible: true }),
  facility('accessible-toilet-east', 'Accessible toilet · East concourse', 'accessible_toilet', 'east-centre', 'manual', { accessible: true }),
  facility('accessible-toilet-south', 'Accessible toilet · Brabham precinct', 'accessible_toilet', 'pit-entry', 'manual', { accessible: true }),
  facility('accessible-toilet-west', 'Accessible toilet · Gate 3', 'accessible_toilet', 'gate3', 'manual', { accessible: true }),
  facility('toilet-north', 'Toilets · North precinct', 'toilet', 'north-junction', 'manual'),
  facility('toilet-lakeside', 'Toilets · Lakeside', 'toilet', 'west-north', 'manual'),
  facility('toilet-lauda', 'Toilets · Lauda precinct', 'toilet', 'lauda', 'manual'),
  facility('toilet-south', 'Toilets · South concourse', 'toilet', 'south-junction', 'manual'),
  facility('medical-south', 'Medical centre · South', 'medical', 'south-junction', 'manual', { accessible: true }),
  facility('first-aid-north', 'First aid · North precinct', 'first_aid', 'north-junction', 'manual', { accessible: true }),
  facility('assistance-hub', 'Accessibility assistance hub', 'assistance', 'indoor-hub', 'manual', { accessible: true }),
  facility('viewing-platform', 'What Ability accessible platform', 'accessible_viewing', 'platform', 'official', { accessible: true }),
  facility('fan-zone-main', 'Fan zone', 'fan_zone', 'fan-zone', 'official'),
  facility('food-east', 'Food and drink · East concourse', 'food', 'east-centre', 'manual'),
  facility('food-north', 'Food and drink · North precinct', 'food', 'north-junction', 'manual'),
  facility('food-lakeside', 'Lakeside food village', 'food', 'fan-zone', 'manual'),
  facility('food-south', 'South concourse food stalls', 'food', 'south-junction', 'manual'),
  facility('food-lauda', 'Lauda precinct food court', 'food', 'lauda', 'manual'),
  facility('merch-superstore', 'Merchandise superstore', 'merchandise', 'gate8', 'official'),
  facility('merch-gate1', 'Official merchandise · Gate 1', 'merchandise', 'gate1', 'manual'),
  facility('merch-lakeside', 'Team merchandise · Lakeside', 'merchandise', 'fan-zone', 'manual'),
  facility('vendor-programmes', 'Race programmes and accessories', 'vendor', 'west-south', 'manual'),
  facility('vendor-local', 'Local makers market', 'vendor', 'east-south', 'manual'),
  facility('grandstand-lauda', 'Lauda Grandstand', 'grandstand', 'lauda', 'official', { accessible: null }),
  facility('grandstand-brabham', 'Brabham Grandstand', 'grandstand', 'pit-entry', 'official', { accessible: true }),
  facility('grandstand-jones', 'Jones Grandstand', 'grandstand', 'gate1', 'official', { accessible: true }),
  facility('hospitality-park', 'The Park hospitality', 'hospitality', 'east-south', 'official'),
  facility('building-melbourne-walk', 'Melbourne Walk', 'building', 'indoor-hub', 'official', { accessible: true }),
  facility('building-paddock', 'F2 and F3 paddock', 'building', 'pit-entry', 'official'),
  facility('building-podium', 'Supercars podium', 'building', 'east-south', 'official'),
  facility('building-main-stage', 'Lakeside main stage', 'building', 'fan-zone', 'official'),
  facility('building-info-east', 'East information booth', 'information', 'east-centre', 'manual', { accessible: true }),
  facility('parking-accessible', 'Accessible pickup and parking', 'accessible_parking', 'gate10', 'manual', { accessible: true }),
  facility('tram-gate5', 'Tram stop · Gate 5', 'public_transport', 'gate5', 'osm', { status: 'Base-map location' }),
  facility('emergency-south', 'Emergency exit · South', 'emergency_exit', 'gate1', 'simulated'),
  facility('lift-hub', 'Accessibility hub lift', 'lift', 'indoor-hub', 'manual', { accessible: true }),
  facility('ramp-platform', 'Viewing platform ramp', 'ramp', 'platform', 'official', { accessible: true }),
  facility('stairs-pit', 'Pit-entry stairs', 'stairs', 'pit-entry', 'official', { accessible: false }),
  facility('crossing-east', 'East pedestrian crossing', 'crossing', 'east-centre', 'osm'),
  facility('tunnel-south', 'South service tunnel', 'tunnel', 'south-junction', 'simulated', { status: 'Check spectator access on arrival' }),
]

export const destinationFacilityMap = {
  bathroom: 'accessible-toilet-east',
  medical: 'medical-south',
  quiet: 'assistance-hub',
  exit: 'gate-1',
  grandstand: 'grandstand-brabham',
  seat: 'grandstand-jones',
  street: 'gate-10',
}

export function facilityForCommand(command) {
  const text = command.toLowerCase()
  const type = text.includes('accessible toilet') || text.includes('bathroom') ? 'accessible_toilet'
    : text.includes('toilet') || text.includes('restroom') || text.includes('loo') ? 'toilet'
    : text.includes('medical') ? 'medical'
    : text.includes('first aid') ? 'first_aid'
    : text.includes('assistance') || text.includes('help') ? 'assistance'
    : text.includes('food') || text.includes('drink') ? 'food'
    : text.includes('merch') ? 'merchandise'
    : text.includes('vendor') || text.includes('market') ? 'vendor'
    : text.includes('building') || text.includes('paddock') || text.includes('stage') ? 'building'
    : text.includes('information') || text.includes('info booth') ? 'information'
    : text.includes('fan zone') ? 'fan_zone'
    : text.includes('tram') || text.includes('transport') ? 'public_transport'
    : text.includes('parking') ? 'accessible_parking'
    : text.includes('viewing platform') ? 'accessible_viewing'
    : null
  return type ? venueFacilities.find((item) => item.type === type) : null
}
