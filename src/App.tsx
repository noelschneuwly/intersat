import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { MapContainer, Marker, Popup, Rectangle, ScaleControl, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { ArrowDownLeft, ArrowUpRight, Bot, BrainCircuit, Check, ChevronDown, ChevronLeft, ChevronRight, Compass, Crop, LocateFixed, MapPin, Mountain, Search, Send, Settings2, Sparkles, Trash2, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './map.css'

type Place = { name: string; kind: string; position: [number, number]; icon: string }
type Location = { name: string; region: string; coordinates: [number, number] }
type Message = { role: 'assistant' | 'user'; text: string }
type UserPin = { id: number; position: [number, number] }
type ChatbotConfig = { name: string; baseUrl: string; chatModel: string }
type ImageFrame = { north: number; south: number; east: number; west: number; zoom: number; mapType: 'aerial' | 'relief'; imageryTime: number | 'current' }
type Dialog = 'chatbot' | 'embeddings' | null

const initialLocation: Location = { name: 'Zurich Airport', region: 'Zurich', coordinates: [47.4581, 8.5555] }

const places: Place[] = [
  { name: 'Airport terminal', kind: 'Transport', position: [47.4502, 8.5624], icon: 'A' },
  { name: 'Observation deck', kind: 'Viewpoint', position: [47.4513, 8.563], icon: 'V' },
  { name: 'Dock E', kind: 'Airport terminal', position: [47.4588, 8.5712], icon: 'E' },
]

const locations: Location[] = [
  initialLocation,
  { name: 'Lauterbrunnen', region: 'Bernese Oberland', coordinates: [46.5935, 7.9091] },
  { name: 'Zermatt', region: 'Valais', coordinates: [46.0207, 7.7491] },
  { name: 'Lake Brienz', region: 'Bernese Oberland', coordinates: [46.7234, 7.9634] },
  { name: 'Swiss National Park', region: 'Engadine', coordinates: [46.6701, 10.1862] },
]

const initialMessages: Message[] = [
  { role: 'assistant', text: 'Hello, explorer. We are above Zurich Airport, Switzerland’s largest international airport, on the edge of the city.' },
  { role: 'assistant', text: 'Ask about the airport or a landmark in this view, or connect your own AI chatbot in settings.' },
]

const imageryYears = Array.from({ length: 100 }, (_, index) => 1926 + index).filter((year) => year !== 1928)
const imageryTimes: (number | 'current')[] = [...imageryYears, 'current']

function createPoiIcon(place: Place) {
  return L.divIcon({
    className: 'poi-icon-wrap',
    html: `<span class="poi-dot">${place.icon}</span><span class="poi-label">${place.name}</span>`,
    iconSize: [132, 34],
    iconAnchor: [11, 17],
  })
}

function createPinIcon() {
  return L.divIcon({
    className: 'user-pin-wrap',
    html: '<span class="user-pin-dot"></span>',
    iconSize: [28, 34],
    iconAnchor: [14, 31],
  })
}

function FlyToLocation({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, 14, { duration: 1.2 })
  }, [map, target])
  return null
}

function PinPlacement({ active, onPlace }: { active: boolean; onPlace: (position: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      if (active) onPlace([event.latlng.lat, event.latlng.lng])
    },
  })
  return null
}

function FrameSelection({ active, onSelect }: { active: boolean; onSelect: (bounds: L.LatLngBounds, zoom: number) => void }) {
  const map = useMap()
  const [start, setStart] = useState<L.LatLng | null>(null)
  const [end, setEnd] = useState<L.LatLng | null>(null)

  useEffect(() => {
    if (!active) return
    map.dragging.disable()
    map.getContainer().style.cursor = 'crosshair'
    return () => {
      map.dragging.enable()
      map.getContainer().style.cursor = ''
    }
  }, [active, map])

  useMapEvents({
    mousedown(event) {
      if (active) {
        setStart(event.latlng)
        setEnd(event.latlng)
      }
    },
    mousemove(event) {
      if (active && start) setEnd(event.latlng)
    },
    mouseup(event) {
      if (!active || !start) return
      const bounds = L.latLngBounds(start, event.latlng)
      if (bounds.getSouthWest().distanceTo(bounds.getNorthEast()) >= 20) onSelect(bounds, map.getZoom())
      setStart(null)
      setEnd(null)
    },
  })

  return active && start && end
    ? <Rectangle bounds={L.latLngBounds(start, end)} pathOptions={{ color: '#c9563e', weight: 2, fillColor: '#c9563e', fillOpacity: 0.14, dashArray: '6 4' }} />
    : null
}

function frameTileCount(frame: ImageFrame) {
  const tilesPerAxis = 2 ** frame.zoom
  const tileX = (longitude: number) => Math.floor(((longitude + 180) / 360) * tilesPerAxis)
  const tileY = (latitude: number) => {
    const radians = (Math.max(-85.0511, Math.min(85.0511, latitude)) * Math.PI) / 180
    return Math.floor(((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * tilesPerAxis)
  }
  const columns = tileX(frame.east) - tileX(frame.west) + 1
  const rows = tileY(frame.south) - tileY(frame.north) + 1
  return columns * rows
}

function answerQuestion(question: string, location: string) {
  if (location === 'Zurich Airport') {
    return 'Zurich Airport (ZRH) sits north of the city, with its terminals, runways, and the distinctive midfield Dock E visible in aerial imagery. The observation deck offers a close view of airport operations; check the airport’s current visitor information before planning a visit.'
  }
  if (location !== 'Lauterbrunnen') {
    return 'This preview has detailed landmark notes for Zurich Airport and Lauterbrunnen only. The swisstopo imagery is available here, but I do not have location-specific notes for this area yet.'
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
  const [imageryTimeIndex, setImageryTimeIndex] = useState(imageryTimes.length - 1)
  const [target, setTarget] = useState<[number, number] | null>(null)
  const [activeLocation, setActiveLocation] = useState(initialLocation)
  const [search, setSearch] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [pinMode, setPinMode] = useState(false)
  const [pins, setPins] = useState<UserPin[]>([])
  const [nextPinId, setNextPinId] = useState(1)
  const [frameMode, setFrameMode] = useState(false)
  const [selectedFrame, setSelectedFrame] = useState<ImageFrame | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [chatbot, setChatbot] = useState<ChatbotConfig | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [chatbotError, setChatbotError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const imageryTime = imageryTimes[imageryTimeIndex]

  const visibleLocations = locations.filter((location) => location.name.toLowerCase().includes(search.toLowerCase()))

  function selectLocation(location: Location) {
    setTarget(location.coordinates)
    setActiveLocation(location)
    setSearch(location.name)
    setSuggestionsOpen(false)
    if (location.name !== activeLocation.name) {
      setMessages((current) => [...current, { role: 'assistant', text: `Map moved to ${location.name}.` }])
    }
  }

  async function sendMessage(event?: FormEvent<HTMLFormElement>, text = question) {
    event?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    setQuestion('')
    setMessages((current) => [...current, { role: 'user', text: trimmed }])

    if (!chatbot) {
      setMessages((current) => [...current, { role: 'assistant', text: answerQuestion(trimmed, activeLocation.name) }])
      return
    }

    setIsSending(true)
    try {
      const response = await fetch(`${chatbot.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
        },
        body: JSON.stringify({
          model: chatbot.chatModel,
          messages: [
            { role: 'system', content: `You are a helpful guide to Swiss landscapes. The map is currently showing ${activeLocation.name} (${activeLocation.coordinates.join(', ')}). Be clear when you are uncertain.` },
            ...messages.slice(-8).map((message) => ({ role: message.role, content: message.text })),
            { role: 'user', content: trimmed },
          ],
        }),
      })
      if (!response.ok) throw new Error(`Chat request failed (${response.status}): ${await response.text()}`)
      const data = await response.json() as { choices?: { message?: { content?: string } }[] }
      const reply = data.choices?.[0]?.message?.content
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('The chatbot response did not contain message text.')
      setMessages((current) => [...current, { role: 'assistant', text: reply }])
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', text: `Could not reach the chatbot: ${error instanceof Error ? error.message : String(error)}. Check the API URL, credentials, and provider CORS settings.` }])
    } finally {
      setIsSending(false)
    }
  }

  function registerChatbot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const baseUrl = String(formData.get('baseUrl') ?? '').trim().replace(/\/+$/, '')
    const chatModel = String(formData.get('chatModel') ?? '').trim()
    if (!baseUrl || !chatModel) {
      setChatbotError('Enter an API base URL and chat model name.')
      return
    }
    setChatbot({
      name: String(formData.get('name') ?? '').trim() || 'My chatbot',
      baseUrl,
      chatModel,
    })
    setApiKey(String(formData.get('apiKey') ?? '').trim())
    setChatbotError('')
    setDialog(null)
  }

  function selectImageFrame(bounds: L.LatLngBounds, zoom: number) {
    setSelectedFrame({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
      zoom,
      mapType,
      imageryTime,
    })
    setFrameMode(false)
    setDialog('embeddings')
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
        <button className="header-action" onClick={() => setDialog('chatbot')} type="button"><Bot size={15} />{chatbot ? chatbot.name : 'Add chatbot'}</button>
        <button className="header-action embedding-action" onClick={() => setDialog('embeddings')} type="button"><BrainCircuit size={15} />Image embeddings</button>
      </header>

      <section className="map-stage" id="map" aria-label="Swiss satellite map">
        <MapContainer center={initialLocation.coordinates} zoom={14} zoomControl={false} scrollWheelZoom={!frameMode} className={`map-canvas${pinMode ? ' pin-mode-active' : ''}${frameMode ? ' frame-mode-active' : ''}`}>
          <TileLayer
            key={`${mapType}-${imageryTime}`}
            url={mapType === 'aerial' && imageryTime !== 'current'
              ? `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage-product/default/${imageryTime}/3857/{z}/{x}/{y}.jpeg`
              : `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.${mapType === 'aerial' ? 'swissimage' : 'pixelkarte-farbe'}/default/current/3857/{z}/{x}/{y}.jpeg`}
            attribution='&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>'
            maxZoom={19}
            maxNativeZoom={mapType === 'aerial' && imageryTime !== 'current' ? 18 : 19}
          />
          <ZoomControl position="topright" />
          <ScaleControl position="bottomright" imperial={false} />
          <FlyToLocation target={target} />
          <FrameSelection active={frameMode} onSelect={selectImageFrame} />
          {selectedFrame && (
            <Rectangle
              bounds={[[selectedFrame.south, selectedFrame.west], [selectedFrame.north, selectedFrame.east]]}
              pathOptions={{ color: '#c9563e', weight: 2, fillColor: '#c9563e', fillOpacity: 0.14 }}
            />
          )}
          <PinPlacement active={pinMode} onPlace={(position) => {
            setPins((current) => [...current, { id: nextPinId, position }])
            setNextPinId((id) => id + 1)
          }} />
          {places.map((place) => (
            <Marker key={place.name} position={place.position} icon={createPoiIcon(place)}>
              <Popup><strong>{place.name}</strong><br />{place.kind} · Zurich Airport</Popup>
            </Marker>
          ))}
          {pins.map((pin) => (
            <Marker key={pin.id} position={pin.position} icon={createPinIcon()} title={`Pin ${pin.id}`}>
              <Popup>
                <strong>Pin {pin.id}</strong><br />
                {pin.position[0].toFixed(5)}, {pin.position[1].toFixed(5)}<br />
                <button className="popup-delete" onClick={() => setPins((current) => current.filter((item) => item.id !== pin.id))} type="button"><Trash2 size={12} /> Remove pin</button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="map-tools">
          <div className="basemap-switch" role="group" aria-label="Map style">
            <button className={mapType === 'aerial' ? 'active' : ''} onClick={() => setMapType('aerial')} type="button">Aerial</button>
            <button className={mapType === 'relief' ? 'active' : ''} onClick={() => setMapType('relief')} type="button">Relief</button>
          </div>
          <button className={`tool-button frame-toggle${frameMode ? ' active' : ''}`} type="button" aria-pressed={frameMode} aria-label={frameMode ? 'Cancel frame selection' : 'Select image frame'} title={frameMode ? 'Cancel frame selection' : 'Select image frame'} onClick={() => { setPinMode(false); setFrameMode((active) => !active); setDialog(null) }}><Crop size={17} /></button>
          <button className={`tool-button pin-toggle${pinMode ? ' active' : ''}`} type="button" aria-pressed={pinMode} aria-label={pinMode ? 'Stop placing pins' : 'Place a pin'} title={pinMode ? 'Stop placing pins' : 'Place a pin'} onClick={() => { setFrameMode(false); setPinMode((active) => !active) }}><MapPin size={17} /></button>
          <button className="tool-button" type="button" aria-label="Return to Zurich Airport" title="Return to Zurich Airport" onClick={() => { setTarget(initialLocation.coordinates); setActiveLocation(initialLocation); setSearch(initialLocation.name) }}><LocateFixed size={17} /></button>
          <button className="tool-button compass-button" type="button" aria-label="Map orientation north up" title="North is up"><Compass size={18} /><span>N</span></button>
        </div>
        {pinMode && <div className="pin-instruction"><MapPin size={14} /> Click anywhere on the map to add a pin <button onClick={() => setPinMode(false)} type="button" aria-label="Stop placing pins"><X size={14} /></button></div>}
        {frameMode && <div className="frame-instruction"><Crop size={14} /> Drag over the map to select image tiles <button onClick={() => setFrameMode(false)} type="button" aria-label="Cancel frame selection"><X size={14} /></button></div>}

        <div className={`timeline-control${mapType === 'relief' ? ' is-disabled' : ''}`} role="group" aria-label="Historical imagery">
          <div className="timeline-heading">
            <span className="timeline-label">IMAGE YEAR</span>
            <strong aria-live="polite">{imageryTime === 'current' ? 'CURRENT' : imageryTime}</strong>
            <span className="timeline-source">{mapType === 'relief' ? 'AERIAL ONLY' : imageryTime === 'current' ? 'LIVE MOSAIC' : 'SWISSIMAGE ARCHIVE'}</span>
          </div>
          <div className="timeline-slider-row">
            <button type="button" aria-label="Previous image year" title="Previous image year" disabled={mapType === 'relief' || imageryTimeIndex === 0} onClick={() => setImageryTimeIndex((index) => Math.max(0, index - 1))}><ChevronLeft size={15} /></button>
            <input aria-label="Select imagery year" type="range" min={0} max={imageryTimes.length - 1} step={1} value={imageryTimeIndex} disabled={mapType === 'relief'} onChange={(event) => setImageryTimeIndex(Number(event.target.value))} />
            <button type="button" aria-label="Next image year" title="Next image year" disabled={mapType === 'relief' || imageryTimeIndex === imageryTimes.length - 1} onClick={() => setImageryTimeIndex((index) => Math.min(imageryTimes.length - 1, index + 1))}><ChevronRight size={15} /></button>
          </div>
          <div className="timeline-endpoints"><span>1926</span><span>NOW</span></div>
        </div>

        <div className="map-caption"><span className="caption-rule" /><span>{activeLocation.name.toUpperCase()} · {activeLocation.region.toUpperCase()}</span><span className="caption-separator">/</span><span>{mapType === 'relief' ? 'TOPOGRAPHIC RELIEF' : `SWISSIMAGE ${imageryTime === 'current' ? 'CURRENT' : imageryTime}`}</span></div>

        {chatOpen ? (
          <aside className="chat-panel" aria-label="Ask about the map">
            <div className="chat-heading">
              <div className="chat-heading-icon"><Sparkles size={16} /></div>
              <div className="chat-title"><strong>Fieldnotes</strong><span>{chatbot ? `Powered by ${chatbot.name}` : 'Ask about this landscape'}</span></div>
              <span className="online-pill"><i /> {isSending ? 'THINKING' : chatbot ? 'CONNECTED' : 'READY'}</span>
              <button className="chat-settings" aria-label="Configure chatbot" title="Configure chatbot" onClick={() => setDialog('chatbot')} type="button"><Settings2 size={15} /></button>
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
              {messages.length <= 2 && <div className="prompt-row"><button onClick={() => sendMessage(undefined, 'What am I looking at?')} type="button">What am I looking at? <ArrowUpRight size={12} /></button><button onClick={() => sendMessage(undefined, 'Tell me about this place')} type="button">Tell me about this place <ArrowUpRight size={12} /></button></div>}
            </div>
            <form className="chat-input" onSubmit={(event) => void sendMessage(event)}>
              <input aria-label="Ask a question about this map" placeholder="Ask about this place…" value={question} onChange={(event) => setQuestion(event.target.value)} />
              <button className="send-button" type="submit" aria-label="Send question" disabled={!question.trim() || isSending}><Send size={15} /></button>
            </form>
            <div className="chat-footnote"><span><Sparkles size={11} /></span>{chatbot ? 'Connected to your configured chatbot.' : 'Local preview · Add a chatbot for AI answers.'}</div>
          </aside>
        ) : (
          <button className="reopen-chat" onClick={() => setChatOpen(true)} type="button"><Sparkles size={16} /> Ask about this view <ArrowDownLeft size={14} /></button>
        )}

        <div className="map-credit"><span>ORTHOPHOTO</span><span className="credit-divider" /><span>SWISSTOPO</span></div>
      </section>

      {dialog && (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null) }}>
          {dialog === 'chatbot' ? (
            <section className="setup-dialog" role="dialog" aria-modal="true" aria-labelledby="chatbot-dialog-title">
              <div className="dialog-heading">
                <div className="dialog-icon"><Bot size={18} /></div>
                <div><h2 id="chatbot-dialog-title">Connect your chatbot</h2><p>Use an OpenAI-compatible chat API.</p></div>
                <button className="panel-close" onClick={() => setDialog(null)} type="button" aria-label="Close chatbot settings"><X size={17} /></button>
              </div>
              <form className="setup-form" onSubmit={registerChatbot}>
                <label>Chatbot name<input name="name" defaultValue={chatbot?.name ?? ''} placeholder="My assistant" /></label>
                <label>API base URL<input name="baseUrl" type="url" required defaultValue={chatbot?.baseUrl ?? 'https://api.openai.com/v1'} placeholder="https://api.example.com/v1" /></label>
                <label>API key <span className="optional-label">optional</span><input name="apiKey" type="password" autoComplete="off" defaultValue={apiKey} placeholder="Paste your provider key" /></label>
                <label>Chat model<input name="chatModel" required defaultValue={chatbot?.chatModel ?? ''} placeholder="e.g. gpt-4o-mini" /></label>
                {chatbotError && <p className="form-error" role="alert">{chatbotError}</p>}
                <p className="privacy-note">Settings and key are kept only in this browser session. Requests go directly to your provider; their CORS policy must allow this app.</p>
                <div className="dialog-actions">
                  {chatbot && <button className="text-button" type="button" onClick={() => { setChatbot(null); setApiKey(''); setChatbotError(''); setDialog(null) }}>Disconnect</button>}
                  <button className="primary-button" type="submit"><Check size={15} />Save chatbot</button>
                </div>
              </form>
            </section>
          ) : (
            <section className="setup-dialog embeddings-dialog" role="dialog" aria-modal="true" aria-labelledby="embeddings-dialog-title">
              <div className="dialog-heading">
                <div className="dialog-icon"><BrainCircuit size={18} /></div>
                <div><h2 id="embeddings-dialog-title">Image embeddings</h2><p>Select a map frame to prepare its imagery for indexing.</p></div>
                <button className="panel-close" onClick={() => setDialog(null)} type="button" aria-label="Close embedding generator"><X size={17} /></button>
              </div>
              {selectedFrame ? (
                <div className="frame-details">
                  <div className="frame-card">
                    <div className="frame-card-heading"><Crop size={15} /><strong>Selected map frame</strong><span>{frameTileCount(selectedFrame)} tiles · zoom {selectedFrame.zoom}</span></div>
                    <div className="frame-layer">{selectedFrame.mapType === 'aerial' ? 'SWISSIMAGE' : 'TOPOGRAPHIC RELIEF'} · {selectedFrame.imageryTime === 'current' ? 'CURRENT' : selectedFrame.imageryTime}</div>
                    <div className="frame-coordinates">
                      <span>North <strong>{selectedFrame.north.toFixed(5)}°</strong></span>
                      <span>South <strong>{selectedFrame.south.toFixed(5)}°</strong></span>
                      <span>West <strong>{selectedFrame.west.toFixed(5)}°</strong></span>
                      <span>East <strong>{selectedFrame.east.toFixed(5)}°</strong></span>
                    </div>
                  </div>
                  <p className="backend-notice">The image embedding model and vector-storage backend are not connected yet. This frame is selected and ready to be indexed when the backend is added.</p>
                  <div className="dialog-actions">
                    <button className="text-button" onClick={() => { setSelectedFrame(null); setDialog(null) }} type="button">Clear frame</button>
                    <button className="secondary-button" onClick={() => { setDialog(null); setFrameMode(true) }} type="button"><Crop size={14} />Select another frame</button>
                    <button className="primary-button" type="button" disabled title="Connect an image embedding and storage backend first"><BrainCircuit size={15} />Generate image embeddings</button>
                  </div>
                </div>
              ) : (
                <div className="empty-embeddings">
                  <p>Drag a rectangle over the map to select the swisstopo image tiles you want to analyze.</p>
                  <button className="primary-button" onClick={() => { setDialog(null); setFrameMode(true); setPinMode(false) }} type="button"><Crop size={15} />Select a map frame</button>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </main>
  )
}

export default App
