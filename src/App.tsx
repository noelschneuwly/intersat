import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { MapContainer, Marker, Popup, ScaleControl, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ArrowDownLeft, ArrowUpRight, Bot, ChevronDown, Compass, LocateFixed, MapPin, Mountain, Search, Send, Sparkles, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './map.css'

type Place = { name: string; kind: string; position: [number, number]; icon: string }
type Location = { name: string; region: string; coordinates: [number, number] }
type Message = { role: 'assistant' | 'user'; text: string }

const places: Place[] = [
  { name: 'Staubbachfall', kind: 'Waterfall', position: [46.5896, 7.9071], icon: 'W' },
  { name: 'Lauterbrunnen station', kind: 'Transport', position: [46.5943, 7.9089], icon: 'S' },
  { name: 'Trümmelbachfälle', kind: 'Landmark', position: [46.5751, 7.9084], icon: 'T' },
]

const locations: Location[] = [
  { name: 'Lauterbrunnen', region: 'Bernese Oberland', coordinates: [46.5935, 7.9091] },
  { name: 'Zermatt', region: 'Valais', coordinates: [46.0207, 7.7491] },
  { name: 'Lake Brienz', region: 'Bernese Oberland', coordinates: [46.7234, 7.9634] },
  { name: 'Swiss National Park', region: 'Engadine', coordinates: [46.6701, 10.1862] },
]

const initialMessages: Message[] = [
  { role: 'assistant', text: 'Hello, explorer. We are above Lauterbrunnen, where the valley floor sits beneath some of the highest cliffs in the Alps.' },
  { role: 'assistant', text: 'Ask me about the landscape, visible landmarks, or what to look for in this view.' },
]

function createPoiIcon(place: Place) {
  return L.divIcon({
    className: 'poi-icon-wrap',
    html: `<span class="poi-dot">${place.icon}</span><span class="poi-label">${place.name}</span>`,
    iconSize: [132, 34],
    iconAnchor: [11, 17],
  })
}

function FlyToLocation({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 14, { duration: 1.2 })
  }, [map, target])
  return null
}

function answerQuestion(question: string, location: string) {
  if (location !== 'Lauterbrunnen') {
    return 'This preview has detailed landmark notes for Lauterbrunnen only. The swisstopo imagery is available here, but I do not have location-specific notes for this area yet.'
  }
  const query = question.toLowerCase()
  if (query.includes('waterfall') || query.includes('staubbach')) {
    return 'The long, pale line on the western cliff is Staubbachfall. It drops nearly 300 metres from the valley rim; on windy days, spray can drift before it reaches the valley floor.'
  }
  if (query.includes('valley') || query.includes('landscape') || query.includes('see')) {
    return 'This is a classic glacial trough: a broad, relatively flat valley floor framed by steep limestone walls. The compact settlement follows the valley and its transport corridor, while pasture occupies the flatter land.'
  }
  if (query.includes('walk') || query.includes('hike') || query.includes('trail')) {
    return 'A gentle walk follows the valley floor between Lauterbrunnen and Stechelberg, with frequent views of the cliff-side waterfalls. For an elevated route, check current local trail notices before setting out; conditions change quickly in the Alps.'
  }
  if (query.includes('trummel') || query.includes('trümmel')) {
    return 'Trümmelbachfälle is tucked into the southern end of the valley. The falls carry meltwater from the Eiger, Mönch and Jungfrau through a series of enclosed rock cascades.'
  }
  return 'From this orthophoto, the most legible features are the valley settlement, the linear rail and road corridor, patches of pasture, and waterfalls descending the surrounding cliffs. Try asking about Staubbachfall, the valley, or nearby walks.'
}

function App() {
  const [messages, setMessages] = useState(initialMessages)
  const [question, setQuestion] = useState('')
  const [mapType, setMapType] = useState<'aerial' | 'relief'>('aerial')
  const [target, setTarget] = useState<[number, number] | null>(null)
  const [activeLocation, setActiveLocation] = useState(locations[0])
  const [search, setSearch] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)

  const visibleLocations = locations.filter((location) => location.name.toLowerCase().includes(search.toLowerCase()))

  function selectLocation(location: Location) {
    setTarget(location.coordinates)
    setActiveLocation(location)
    setSearch(location.name)
    setSuggestionsOpen(false)
    if (location.name !== activeLocation.name) {
      setMessages((current) => [...current, { role: 'assistant', text: `Map moved to ${location.name}. Detailed chat notes in this preview currently cover Lauterbrunnen.` }])
    }
  }

  function sendMessage(event?: FormEvent<HTMLFormElement>, text = question) {
    event?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((current) => [...current, { role: 'user', text: trimmed }, { role: 'assistant', text: answerQuestion(trimmed, activeLocation.name) }])
    setQuestion('')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#map" aria-label="intersat home">
          <span className="brand-mark"><Mountain size={19} strokeWidth={1.8} /></span>
          <span className="brand-name">intersat<span className="brand-period">.</span></span>
        </a>
        <div className="search-wrap">
          <Search size={16} aria-hidden="true" />
          <input
            aria-label="Search a Swiss location"
            placeholder="Search Switzerland"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setSuggestionsOpen(true) }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && visibleLocations[0]) selectLocation(visibleLocations[0])
              if (event.key === 'Escape') setSuggestionsOpen(false)
            }}
          />
          <kbd>⌘ K</kbd>
          {suggestionsOpen && search && visibleLocations.length > 0 && (
            <div className="suggestions">
              {visibleLocations.map((location) => (
                <button key={location.name} onMouseDown={() => selectLocation(location)} type="button">
                  <MapPin size={15} /><span>{location.name}</span><ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="topbar-meta"><span className="live-indicator" /><span>{activeLocation.region.toUpperCase()}</span><span className="meta-divider" />{activeLocation.coordinates[0].toFixed(4)}° N&nbsp; {activeLocation.coordinates[1].toFixed(4)}° E</div>
        <button className="avatar-button" aria-label="Account menu" title="Account"><span>NB</span></button>
      </header>

      <section className="map-stage" id="map" aria-label="Swiss satellite map">
        <MapContainer center={[46.5935, 7.9091]} zoom={14} zoomControl={false} scrollWheelZoom className="map-canvas">
          <TileLayer
            key={mapType}
            url={`https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.${mapType === 'aerial' ? 'swissimage' : 'pixelkarte-farbe'}/default/current/3857/{z}/{x}/{y}.${mapType === 'aerial' ? 'jpeg' : 'jpeg'}`}
            attribution='&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>'
            maxZoom={19}
          />
          <ZoomControl position="topright" />
          <ScaleControl position="bottomright" imperial={false} />
          <FlyToLocation target={target} />
          {places.map((place) => (
            <Marker key={place.name} position={place.position} icon={createPoiIcon(place)}>
              <Popup><strong>{place.name}</strong><br />{place.kind} · Lauterbrunnen valley</Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="map-tools">
          <div className="basemap-switch" role="group" aria-label="Map style">
            <button className={mapType === 'aerial' ? 'active' : ''} onClick={() => setMapType('aerial')} type="button">Aerial</button>
            <button className={mapType === 'relief' ? 'active' : ''} onClick={() => setMapType('relief')} type="button">Relief</button>
          </div>
          <button className="tool-button" type="button" aria-label="Return to Lauterbrunnen" title="Return to Lauterbrunnen" onClick={() => { setTarget(locations[0].coordinates); setActiveLocation(locations[0]); setSearch('') }}><LocateFixed size={17} /></button>
          <button className="tool-button compass-button" type="button" aria-label="Map orientation north up" title="North is up"><Compass size={18} /><span>N</span></button>
        </div>

        <div className="map-caption"><span className="caption-rule" /><span>{activeLocation.name.toUpperCase()} · {activeLocation.region.toUpperCase()}</span><span className="caption-separator">/</span><span>SWISSIMAGE ORTHOPHOTO</span></div>

        {chatOpen ? (
          <aside className="chat-panel" aria-label="Ask about the map">
            <div className="chat-heading">
              <div className="chat-heading-icon"><Sparkles size={16} /></div>
              <div className="chat-title"><strong>Fieldnotes</strong><span>Ask about this landscape</span></div>
              <span className="online-pill"><i /> READY</span>
              <button className="panel-close" aria-label="Close chat" title="Close chat" onClick={() => setChatOpen(false)} type="button"><X size={16} /></button>
            </div>
            <div className="chat-context"><MapPin size={13} /><span>VIEWING</span><strong>{activeLocation.name}</strong><ChevronDown size={13} /></div>
            <div className="conversation" aria-live="polite">
              {messages.map((message, index) => (
                <div className={`message message-${message.role}`} key={`${index}-${message.role}`}>
                  {message.role === 'assistant' && <span className="assistant-avatar"><Bot size={14} /></span>}
                  <p>{message.text}</p>
                </div>
              ))}
              {messages.length <= 2 && <div className="prompt-row"><button onClick={() => sendMessage(undefined, 'What am I looking at?')} type="button">What am I looking at? <ArrowUpRight size={12} /></button><button onClick={() => sendMessage(undefined, 'Tell me about the waterfall')} type="button">Find the waterfall <ArrowUpRight size={12} /></button></div>}
            </div>
            <form className="chat-input" onSubmit={sendMessage}>
              <input aria-label="Ask a question about this map" placeholder="Ask about this place…" value={question} onChange={(event) => setQuestion(event.target.value)} />
              <button className="send-button" type="submit" aria-label="Send question" disabled={!question.trim()}><Send size={15} /></button>
            </form>
            <div className="chat-footnote"><span><Sparkles size={11} /></span> Answers are a local preview, not live AI analysis.</div>
          </aside>
        ) : (
          <button className="reopen-chat" onClick={() => setChatOpen(true)} type="button"><Sparkles size={16} /> Ask about this view <ArrowDownLeft size={14} /></button>
        )}

        <div className="map-credit"><span>ORTHOPHOTO</span><span className="credit-divider" /><span>SWISSTOPO</span></div>
      </section>
    </main>
  )
}

export default App
