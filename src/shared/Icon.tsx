export function Icon({ name, size = 18 }: { name: 'github' | 'play' | 'pause' | 'back' | 'arrow' | 'spark' | 'clock' | 'close'; size?: number }) {
  const shared = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  if (name === 'play') return <svg {...shared}><path d="m8 5 12 7-12 7V5Z" fill="currentColor" stroke="none" /></svg>
  if (name === 'pause') return <svg {...shared}><path d="M8 5h3v14H8zM15 5h3v14h-3z" fill="currentColor" stroke="none" /></svg>
  if (name === 'back') return <svg {...shared}><path d="m15 18-6-6 6-6" /><path d="M20 12H9" /></svg>
  if (name === 'arrow') return <svg {...shared}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  if (name === 'spark') return <svg {...shared}><path d="m12 3 1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></svg>
  if (name === 'clock') return <svg {...shared}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  if (name === 'close') return <svg {...shared}><path d="m6 6 12 12M18 6 6 18" /></svg>
  return <svg {...shared} fill="currentColor" stroke="none"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.76-.24.76-.54v-2.1c-3.1.68-3.76-1.3-3.76-1.3-.5-1.28-1.24-1.62-1.24-1.62-1.02-.7.08-.7.08-.7 1.12.08 1.7 1.14 1.7 1.14 1 .1.76 2.2 3.88 1.54.1-.7.4-1.18.7-1.45-2.48-.28-5.08-1.24-5.08-5.52 0-1.22.44-2.22 1.16-3-.12-.28-.5-1.42.1-2.96 0 0 .94-.3 3.08 1.14a10.7 10.7 0 0 1 5.62 0c2.14-1.44 3.08-1.14 3.08-1.14.6 1.54.22 2.68.1 2.96.72.78 1.16 1.78 1.16 3 0 4.3-2.6 5.24-5.1 5.52.4.34.76 1 .76 2.04v3.02c0 .3.2.64.76.54A11.2 11.2 0 0 0 12 .8Z" /></svg>
}

