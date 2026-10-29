export default function PixelPreview() {
  return <svg className="world-preview-svg" viewBox="0 0 520 300" role="img" aria-label="Top-down pixel art space station with connected modules, crew and solar panels">
    <rect width="520" height="300" fill="#101f2d" />
    <g fill="#91a8af" opacity=".65"><rect x="38" y="40" width="3" height="3"/><rect x="83" y="124" width="2" height="2"/><rect x="164" y="38" width="2" height="2"/><rect x="402" y="46" width="3" height="3"/><rect x="467" y="145" width="2" height="2"/><rect x="56" y="250" width="2" height="2"/><rect x="375" y="262" width="2" height="2"/><rect x="454" y="231" width="3" height="3"/></g>
    <circle cx="495" cy="295" r="76" fill="#213c4c"/><circle cx="504" cy="305" r="61" fill="#2c5060"/>
    <g fill="none" stroke="#263b49" strokeWidth="15"><path d="M260 150H158V87 M260 150H362V87 M260 150H158V212 M260 150H362V212 M260 150V58 M260 150V250"/></g>
    <g fill="none" stroke="#aebcbb" strokeWidth="9"><path d="M260 150H158V87 M260 150H362V87 M260 150H158V212 M260 150H362V212 M260 150V58 M260 150V250"/></g>
    <g>
      {[{x:158,y:87},{x:362,y:87},{x:158,y:212},{x:362,y:212},{x:260,y:58},{x:260,y:250}].map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y})`}>
        <rect x="-37" y="-22" width="74" height="44" fill="#263b49"/><rect x="-33" y="-18" width="66" height="36" fill="#e6dfce"/>
        <rect x="-27" y="-10" width="54" height="18" fill="#244c63"/><rect x="-23" y="-7" width="46" height="12" fill="#47788e"/><rect x="-2" y="-7" width="4" height="12" fill="#aebcbb"/>
        <rect x="-26" y="12" width="17" height="3" fill="#e47746"/><rect x="14" y="12" width="13" height="3" fill="#e9bc70"/>
      </g>)}
    </g>
    <rect x="211" y="116" width="98" height="68" fill="#263b49"/><rect x="215" y="120" width="90" height="60" fill="#e6dfce"/><rect x="222" y="127" width="76" height="46" fill="#47788e"/><rect x="243" y="141" width="34" height="16" fill="#e6dfce"/><rect x="215" y="176" width="90" height="4" fill="#e47746"/>
    <g fill="#f6f0de"><rect x="229" y="130" width="9" height="12"/><rect x="282" y="130" width="9" height="12"/><rect x="229" y="158" width="9" height="12"/><rect x="282" y="158" width="9" height="12"/></g>
    <g fill="#244c63"><rect x="231" y="132" width="5" height="4"/><rect x="284" y="132" width="5" height="4"/><rect x="231" y="160" width="5" height="4"/><rect x="284" y="160" width="5" height="4"/></g>
    <rect x="90" y="135" width="10" height="25" fill="#aebcbb"/><rect x="78" y="130" width="34" height="6" fill="#e47746"/><rect x="414" y="135" width="10" height="25" fill="#aebcbb"/><rect x="402" y="130" width="34" height="6" fill="#e47746"/>
    <rect x="96" y="33" width="58" height="33" fill="#263b49"/><rect x="100" y="37" width="50" height="25" fill="#e6dfce"/><rect x="100" y="37" width="50" height="5" fill="#e47746"/><rect x="110" y="46" width="30" height="11" fill="#47788e"/>
  </svg>
}
