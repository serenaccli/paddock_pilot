import React, { useMemo, useState } from 'react'
import { Accessibility, Building2, ChevronRight, CircleHelp, MapPin, Navigation, ShieldCheck } from 'lucide-react'
import { SOURCE_LABELS, venueEdgeGeometry, venueEdges, venueFacilities, venueNodes } from '../data/albertParkVenue'

const nodeById = new Map(venueNodes.map((node) => [node.id, node]))

function pointsToPath(points = []) {
  return points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ')
}

function routePath(route) {
  if (!route?.edges?.length) return ''
  const points = []
  route.edges.forEach((edge, index) => {
    const geometry = venueEdgeGeometry[edge.id] || [[nodeById.get(edge.from).x, nodeById.get(edge.from).y], [nodeById.get(edge.to).x, nodeById.get(edge.to).y]]
    const oriented = route.nodes[index] === edge.from ? geometry : [...geometry].reverse()
    points.push(...(index ? oriented.slice(1) : oriented))
  })
  return pointsToPath(points)
}

const facilityColours = {
  accessible_toilet: '#197b5a', medical: '#d83c34', first_aid: '#d83c34', assistance: '#8058a8',
  accessible_viewing: '#197b5a', gate: '#111312', food: '#b66c0c', merchandise: '#b66c0c',
  grandstand: '#2f70d0', public_transport: '#2f70d0', accessible_parking: '#197b5a', fan_zone: '#8058a8',
  toilet: '#197b5a', vendor: '#d35d12', building: '#2f70d0', information: '#0879a8', hospitality: '#8058a8',
}

export function AlbertParkMap({ route, destinationId, onDestination, preferences, onPreferences }) {
  const [filter, setFilter] = useState('all')
  const visibleFacilities = useMemo(() => venueFacilities.filter((facility) => filter === 'all' || facility.type === filter), [filter])
  const selected = venueFacilities.find((facility) => facility.id === destinationId)

  return <section className="venue-navigator" aria-labelledby="venue-map-title">
    <div className="venue-navigator-head">
      <div><span className="card-label"><Navigation/> 2026 OFFICIAL VISITOR MAP + ROUTING LAYER</span><h2 id="venue-map-title">Albert Park navigator</h2><p>Routes are digitised directly over the supplied official visitor map; accessibility metadata remains provenance-labelled.</p></div>
      <div className="route-objectives" role="group" aria-label="Route priority">
        <button className={preferences.simplicityWeight > preferences.timeWeight ? 'active' : ''} onClick={() => onPreferences({ ...preferences, timeWeight: .25, simplicityWeight: .75, fewerTurns: true })}>Simplest</button>
        <button className={preferences.timeWeight > preferences.simplicityWeight ? 'active' : ''} onClick={() => onPreferences({ ...preferences, timeWeight: .8, simplicityWeight: .2 })}>Fastest</button>
        <button className={preferences.timeWeight === preferences.simplicityWeight ? 'active' : ''} onClick={() => onPreferences({ ...preferences, timeWeight: .5, simplicityWeight: .5 })}>Balanced</button>
      </div>
    </div>

    <div className="venue-navigator-grid">
      <div className="venue-map-wrap">
        <svg className="albert-map" viewBox="0 0 100 72" role="img" aria-label="Official 2026 Australian Grand Prix visitor map with an overlaid accessible routing graph, facilities and the selected route.">
          <image href="/assets/australian-gp-visitor-map-2026.png" x="0" y="0" width="100" height="72" preserveAspectRatio="none"/>
          <rect className="map-overlay-wash" width="100" height="72"/>
          {venueEdges.map((edge) => {
            const geometry = venueEdgeGeometry[edge.id] || [[nodeById.get(edge.from).x, nodeById.get(edge.from).y], [nodeById.get(edge.to).x, nodeById.get(edge.to).y]]
            return <path key={edge.id} className={`venue-edge ${edge.indoor ? 'indoor' : ''} ${edge.stairs ? 'stairs' : ''}`} d={pointsToPath(geometry)}/>
          })}
          {route?.nodes?.length > 1 && <><path className="selected-route-halo" d={routePath(route)}/><path className="selected-route" d={routePath(route)}/></>} 
          {visibleFacilities.map((facility) => {
            const node = nodeById.get(facility.nodeId)
            const colocated = visibleFacilities.filter((item) => item.nodeId === facility.nodeId)
            const colocatedIndex = colocated.findIndex((item) => item.id === facility.id)
            const angle = colocatedIndex * (Math.PI * 2 / Math.max(1, colocated.length)) - Math.PI / 2
            const offset = colocated.length > 1 ? 2.4 : 0
            const pinX = node.x + Math.cos(angle) * offset
            const pinY = node.y + Math.sin(angle) * offset
            const isSelected = facility.id === destinationId
            return <g key={facility.id} className={`facility-pin ${isSelected ? 'selected' : ''}`} transform={`translate(${pinX} ${pinY})`} onClick={() => onDestination(facility.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onDestination(facility.id) }} role="button" tabIndex="0" aria-label={`${facility.name}. ${SOURCE_LABELS[facility.source].label}.`}>
              <circle r={isSelected ? 1.35 : .72} fill={facilityColours[facility.type] || '#555'}/>
              {isSelected && <circle r="2.1" fill="none" stroke={facilityColours[facility.type] || '#555'} strokeWidth=".35"/>}
            </g>
          })}
        </svg>
        <div className="map-provenance">
          {Object.entries(SOURCE_LABELS).map(([key, source]) => <span key={key}><i style={{ background: source.colour }}/>{source.label}</span>)}
        </div>
      </div>

      <aside className="venue-route-panel">
        <div className="facility-filter">
          <label htmlFor="facility-filter">Find a venue facility</label>
          <select id="facility-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All mapped facilities</option>
            <option value="accessible_toilet">Accessible toilets</option>
            <option value="toilet">All other toilets</option>
            <option value="medical">Medical</option>
            <option value="assistance">Assistance</option>
            <option value="grandstand">Grandstands</option>
            <option value="food">Food and drink</option>
            <option value="merchandise">Merchandise</option>
            <option value="vendor">Other vendors</option>
            <option value="building">Buildings and stages</option>
            <option value="information">Information booths</option>
            <option value="gate">Gates and exits</option>
          </select>
        </div>
        <div className="facility-list">
          {visibleFacilities.map((facility) => <button key={facility.id} className={facility.id === destinationId ? 'selected' : ''} onClick={() => onDestination(facility.id)}>
            <span style={{ background: facilityColours[facility.type] || '#555' }}>{facility.accessible ? <Accessibility/> : facility.type === 'assistance' ? <ShieldCheck/> : facility.type === 'grandstand' ? <Building2/> : <MapPin/>}</span>
            <div><b>{facility.name}</b><small>{facility.status}</small></div><ChevronRight/>
          </button>)}
        </div>
        {selected && <div className="route-result" aria-live="polite">
          <span>{SOURCE_LABELS[selected.source].label}{selected.verified ? ' · verified reference' : ' · not field verified'}</span>
          <h3>{selected.name}</h3>
          {route?.unavailable ? <p className="route-unavailable">{route.reason}</p> : route ? <>
            <div className="route-stats"><b>{Math.round(route.distance)} m<small>Distance</small></b><b>{route.minutes.toFixed(1)} min<small>Estimate</small></b><b>{route.turns}<small>Turns</small></b><b>{Math.round(route.confidence * 100)}%<small>Confidence</small></b></div>
            <p>{route.indoorTransitions ? `${route.indoorTransitions} indoor/outdoor transition. ` : ''}Uses {route.sources.map((source) => SOURCE_LABELS[source].label).join(', ')} data.</p>
          </> : <p>Select a destination to calculate a route from Gate 1.</p>}
        </div>}
        <div className="map-disclaimer"><CircleHelp/> Prototype route data is not live operational guidance. Unknown attributes remain unknown and are never assumed accessible.</div>
      </aside>
    </div>
  </section>
}
