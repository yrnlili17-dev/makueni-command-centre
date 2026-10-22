import { useId } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { MAKUENI_OUTLINE, KENYA_OUTLINE, MAKUENI_INSET, MAP_LABEL } from "@/lib/makueni-map-outline";
import { MAKUENI_REGISTER_SUMMARY } from "@/lib/makueni-register-summary";

export function MakueniLandingMap() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return <figure className="mc-map-card" aria-labelledby={`${id}-heading`}>
    <div className="mc-map-heading"><div><p>OUR HOME</p><h2 id={`${id}-heading`}><MapPin size={19} /> Makueni County</h2></div><span className="mc-map-country">Kenya</span></div>
    <div className="mc-map-stage">
      <div className="mc-kenya-inset"><svg viewBox="0 0 120 130" role="img" aria-label="Location of Makueni County within Kenya"><path d={KENYA_OUTLINE} className="mc-kenya-shape" fillRule="evenodd" /><path d={MAKUENI_INSET} className="mc-kenya-highlight" fillRule="evenodd" /></svg><span>Makueni in Kenya</span></div>
      <svg className="mc-county-svg" viewBox="0 0 480 440" role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>Map of Makueni County</title>
        <desc id={`${id}-description`}>North-up county outline in southeastern Kenya. This map shows the county boundary; constituency details are listed below.</desc>
        <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6ee7b7" stopOpacity=".44" /><stop offset="65%" stopColor="#10b981" stopOpacity=".19" /><stop offset="100%" stopColor="#d4b263" stopOpacity=".27" /></linearGradient><filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="13" /></filter></defs>
        <path d={MAKUENI_OUTLINE} fill="#34d399" opacity=".16" filter={`url(#${id}-glow)`} />
        <path d={MAKUENI_OUTLINE} fill={`url(#${id}-fill)`} stroke="#9ae6c5" strokeWidth="1.8" strokeLinejoin="round" fillRule="evenodd" />
        <g transform={`translate(${MAP_LABEL[0]},${MAP_LABEL[1]})`} className="mc-map-label"><text textAnchor="middle" y="0">MAKUENI</text><text textAnchor="middle" y="18" className="mc-map-label-small">COUNTY</text></g>
        <g transform="translate(438,32)" aria-hidden="true"><text x="0" y="0" textAnchor="middle" className="mc-map-north">N</text><path d="M0 11L-5 24L0 20L5 24Z" fill="#d4b263" /></g>
      </svg>
      <div className="mc-map-caption"><span>6 constituencies</span><span>30 wards</span><a href="#makueni">Explore our county <ArrowUpRight size={14} /></a></div>
    </div>
    <div className="mc-map-constituencies">{MAKUENI_REGISTER_SUMMARY.map(item => <a key={item.constituency} href={`#constituency-${item.constituency.toLowerCase().replace(/\s+/g, "-")}`}>{item.constituency}<ArrowUpRight size={12} /></a>)}</div>
    <figcaption className="mc-map-source">Simplified county outline · <a href="https://www.geoboundaries.org/api/current/gbOpen/KEN/ADM1/" target="_blank" rel="noopener noreferrer">geoBoundaries / RCMRD, 2020</a></figcaption>
  </figure>;
}
