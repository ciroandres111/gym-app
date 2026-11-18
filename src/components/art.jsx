// Ilustraciones propias en SVG: livianas, funcionan sin internet y usan los colores del tema.

// ---------- Mapa del cuerpo ----------
// Cada músculo es una lista de formas, en la vista de frente (x 0–100) o de espalda (x 100–200).
const E = (cx, cy, rx, ry, rot = 0) => ({ t: 'e', cx, cy, rx, ry, rot })
const P = (d) => ({ t: 'p', d })

// Para espejar alrededor del centro de cada vista: frente centro 50, espalda centro 150.
const pair = (cxLeft, cy, rx, ry, rot = 0) => {
  const center = cxLeft < 100 ? 50 : 150
  return [E(cxLeft, cy, rx, ry, rot), E(2 * center - cxLeft, cy, rx, ry, -rot)]
}

const REGIONS = {
  Trapecio: [P('M44 29 L56 29 L63 36 L37 36 Z'), P('M144 28 L156 28 L165 37 L150 54 L135 37 Z')],
  Hombros: [...pair(32, 40, 7.5, 7), ...pair(132, 40, 7.5, 7)],
  Pecho: [P('M50 36 L50 50 Q44 52 38 48 Q35 42 38 37 Z'), P('M50 36 L50 50 Q56 52 62 48 Q65 42 62 37 Z')],
  Espalda: [
    P('M136 41 L149 52 L149 76 Q143 74 140 66 Z'),
    P('M164 41 L151 52 L151 76 Q157 74 160 66 Z'),
  ],
  Bíceps: pair(28.5, 55, 4.8, 9, 10),
  Tríceps: pair(128.5, 55, 4.8, 9.5, 10),
  Antebrazos: [...pair(24.5, 76, 4, 10.5, 12), ...pair(124.5, 76, 4, 10.5, 12)],
  Abdominales: [P('M42 52 Q50 50 58 52 L57 76 Q50 80 43 76 Z')],
  Cuádriceps: pair(43, 101, 7, 18, 4),
  Aductores: pair(48, 96, 2.4, 11),
  Isquiotibiales: pair(143.5, 106, 6.5, 16, 3),
  Glúteos: pair(144, 85, 7.5, 7.5),
  Gemelos: [...pair(42.5, 139, 4.8, 12.5, 2), ...pair(142.5, 139, 5.6, 12.5, 2)],
}

const BACK_MUSCLES = new Set(['Espalda', 'Trapecio', 'Tríceps', 'Glúteos', 'Isquiotibiales'])

// Silueta base (cabeza, cuello, manos, pies, cadera, tibias).
const BASE = [
  { t: 'c', cx: 50, cy: 17, r: 9.5 }, { t: 'c', cx: 150, cy: 17, r: 9.5 },
  P('M45 25 h10 v6 h-10 Z'), P('M145 25 h10 v6 h-10 Z'),
  P('M37 36 Q50 32 63 36 L61 78 Q50 84 39 78 Z'), P('M137 36 Q150 32 163 36 L161 78 Q150 84 139 78 Z'),
  P('M39 76 Q50 82 61 76 L60 88 Q50 92 40 88 Z'),
  ...pair(22.5, 90, 3.2, 4.5), ...pair(122.5, 90, 3.2, 4.5),
  ...pair(43, 125, 4.5, 6), ...pair(143, 125, 4.5, 6),
  ...pair(42.5, 156, 4.5, 3), ...pair(142.5, 156, 4.5, 3),
  ...pair(143, 98, 7, 6),
]

function Shape({ s, ...rest }) {
  if (s.t === 'c') return <circle cx={s.cx} cy={s.cy} r={s.r} {...rest} />
  if (s.t === 'e') return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} transform={s.rot ? `rotate(${s.rot} ${s.cx} ${s.cy})` : undefined} {...rest} />
  return <path d={s.d} {...rest} />
}

/**
 * highlight: { Pecho: 1, Tríceps: 0.4 } — intensidad 0 a 1.
 * view: 'both' | 'front' | 'back' | 'auto' (auto elige la vista donde está el músculo principal)
 */
// Zona ampliada para las miniaturas (viewBox cuadrado alrededor del músculo).
const CROP = {
  Pecho: '18 24 64 64', Hombros: '18 24 64 64', Bíceps: '14 30 72 72', Abdominales: '18 30 64 64',
  Antebrazos: '12 46 76 76', Trapecio: '118 18 64 64', Espalda: '116 24 68 68', Tríceps: '114 30 72 72',
  Cuádriceps: '14 72 72 72', Aductores: '18 74 64 64', Glúteos: '114 66 72 72', Isquiotibiales: '114 72 72 72',
  Gemelos: '114 92 72 72',
}

export function BodyMap({ highlight = {}, view = 'both', size = 160, className = '', crop }) {
  if (crop) {
    return (
      <svg viewBox={CROP[crop] || '6 4 88 158'} width={size} height={size} className={'bodymap ' + className} aria-hidden="true">
        {BASE.map((s, i) => <Shape key={'b' + i} s={s} className="bm-base" />)}
        {Object.entries(REGIONS).map(([m, shapes]) => shapes.map((s, i) => (
          <Shape key={m + i} s={s} className={highlight[m] ? 'bm-on' : 'bm-off'} />
        )))}
      </svg>
    )
  }
  let v = view
  if (v === 'auto') {
    const main = Object.entries(highlight).sort((a, b) => b[1] - a[1])[0]?.[0]
    v = main && BACK_MUSCLES.has(main) ? 'back' : 'front'
  }
  const vb = v === 'front' ? '6 4 88 158' : v === 'back' ? '106 4 88 158' : '0 4 200 158'
  const w = v === 'both' ? size * (200 / 158) : size * (88 / 158)
  return (
    <svg viewBox={vb} width={w} height={size} className={'bodymap ' + className} aria-hidden="true">
      {BASE.map((s, i) => <Shape key={'b' + i} s={s} className="bm-base" />)}
      {Object.entries(REGIONS).map(([m, shapes]) => {
        const k = highlight[m] || 0
        return shapes.map((s, i) => (
          <Shape key={m + i} s={s} className={k ? 'bm-on' : 'bm-off'}
            style={k ? { fillOpacity: 0.3 + 0.7 * Math.min(1, k) } : undefined} />
        ))
      })}
    </svg>
  )
}

export function MuscleAvatar({ muscle, size = 40 }) {
  return (
    <span className="muscle-avatar" style={{ width: size, height: size }}>
      <BodyMap highlight={{ [muscle]: 1 }} crop={muscle} size={size} />
    </span>
  )
}

// ---------- Miniatura de split ----------
const SPLIT_LABEL = {
  arnold: 'AS', 'arnold-ul': 'A·UL', ppl: 'PPL', 'ppl-ul': 'P·UL', ul: 'U/L', fullbody: 'FB', bro: 'BRO',
}

export function SplitArt({ split, name = '', days = 3, size = 44 }) {
  const label = SPLIT_LABEL[split] ||
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '+'
  const n = Math.min(days, 7)
  const fs = label.length > 3 ? 11 : label.length > 2 ? 13 : 16
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} className="split-art" aria-hidden="true">
      <defs>
        <linearGradient id="sa-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a9a53" />
          <stop offset="1" stopColor="#15562d" />
        </linearGradient>
      </defs>
      <rect width="44" height="44" rx="12" fill="url(#sa-g)" />
      <circle cx="38" cy="6" r="12" fill="#fff" opacity="0.08" />
      <text x="22" y="24" textAnchor="middle" fontSize={fs} fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">{label}</text>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={22 - (n * 5 - 2) / 2 + i * 5} y="32" width="3" height="3" rx="1.5" fill="#fff" opacity="0.85" />
      ))}
    </svg>
  )
}

// ---------- Ilustraciones de pantallas vacías ----------
export function ArtRoutines() {
  return (
    <svg viewBox="0 0 160 110" width="160" height="110" className="art" aria-hidden="true">
      <ellipse cx="80" cy="98" rx="62" ry="7" className="a-shadow" />
      <rect x="34" y="62" width="92" height="12" rx="6" className="a-mid" />
      <rect x="44" y="74" width="6" height="22" rx="2" className="a-dark" />
      <rect x="110" y="74" width="6" height="22" rx="2" className="a-dark" />
      <rect x="40" y="94" width="14" height="4" rx="2" className="a-dark" />
      <rect x="106" y="94" width="14" height="4" rx="2" className="a-dark" />
      <g className="a-float">
        <rect x="44" y="30" width="72" height="5" rx="2.5" className="a-dark" />
        <rect x="36" y="18" width="10" height="29" rx="3" className="a-accent" />
        <rect x="28" y="22" width="8" height="21" rx="3" className="a-accent2" />
        <rect x="114" y="18" width="10" height="29" rx="3" className="a-accent" />
        <rect x="124" y="22" width="8" height="21" rx="3" className="a-accent2" />
      </g>
      <circle cx="140" cy="16" r="3" className="a-accent2 a-twinkle" />
      <circle cx="18" cy="40" r="2" className="a-accent a-twinkle" style={{ animationDelay: '.6s' }} />
    </svg>
  )
}

export function ArtRest() {
  return (
    <svg viewBox="0 0 160 110" width="140" height="96" className="art" aria-hidden="true">
      <ellipse cx="80" cy="100" rx="50" ry="6" className="a-shadow" />
      <rect x="38" y="20" width="84" height="76" rx="12" className="a-card" />
      <rect x="38" y="20" width="84" height="20" rx="12" className="a-accent" />
      <rect x="38" y="32" width="84" height="8" className="a-accent" />
      <rect x="56" y="12" width="6" height="16" rx="3" className="a-dark" />
      <rect x="98" y="12" width="6" height="16" rx="3" className="a-dark" />
      <path d="M80 82 C64 76 62 58 80 50 C98 58 96 76 80 82 Z" className="a-accent2" />
      <path d="M80 82 L80 56" className="a-stroke" />
      <text x="124" y="30" className="a-zzz" fontSize="14" fontWeight="800">z</text>
      <text x="134" y="18" className="a-zzz" fontSize="10" fontWeight="800" style={{ animationDelay: '.5s' }}>z</text>
    </svg>
  )
}

export function ArtChart() {
  return (
    <svg viewBox="0 0 160 110" width="150" height="104" className="art" aria-hidden="true">
      <ellipse cx="80" cy="100" rx="58" ry="6" className="a-shadow" />
      <rect x="30" y="66" width="18" height="30" rx="4" className="a-mid a-grow" />
      <rect x="56" y="52" width="18" height="44" rx="4" className="a-accent2 a-grow" style={{ animationDelay: '.1s' }} />
      <rect x="82" y="40" width="18" height="56" rx="4" className="a-accent2 a-grow" style={{ animationDelay: '.2s' }} />
      <rect x="108" y="24" width="18" height="72" rx="4" className="a-accent a-grow" style={{ animationDelay: '.3s' }} />
      <path d="M28 58 L62 42 L88 30 L130 12" className="a-stroke-accent" />
      <path d="M120 10 L131 11 L128 22" className="a-stroke-accent" />
    </svg>
  )
}

export function ArtExercises() {
  return (
    <svg viewBox="0 0 160 110" width="150" height="104" className="art" aria-hidden="true">
      <ellipse cx="80" cy="100" rx="58" ry="6" className="a-shadow" />
      <rect x="34" y="14" width="92" height="80" rx="12" className="a-card" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(0 ${i * 24})`}>
          <rect x="44" y="24" width="14" height="14" rx="4" className={i === 0 ? 'a-accent' : 'a-mid'} />
          <rect x="64" y="26" width="46" height="4" rx="2" className="a-dark" />
          <rect x="64" y="33" width="28" height="3" rx="1.5" className="a-mid" />
        </g>
      ))}
      <g className="a-float">
        <circle cx="128" cy="86" r="16" className="a-accent" />
        <path d="M128 78 v16 M120 86 h16" className="a-stroke-white" />
      </g>
    </svg>
  )
}

// Disco de pesas decorativo para el hero.
export function HeroPlates() {
  return (
    <svg viewBox="0 0 200 200" className="hero-art" aria-hidden="true">
      <g className="hero-spin">
        <circle cx="100" cy="100" r="92" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="14" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="6" />
        <circle cx="100" cy="100" r="16" fill="#fff" fillOpacity="0.14" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <circle key={a} cx={100 + 40 * Math.cos((a * Math.PI) / 180)} cy={100 + 40 * Math.sin((a * Math.PI) / 180)} r="5" fill="#fff" fillOpacity="0.1" />
        ))}
      </g>
    </svg>
  )
}
