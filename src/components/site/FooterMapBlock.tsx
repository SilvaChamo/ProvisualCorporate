import { SITE_ADDRESS, SITE_MAP_EMBED_URL } from "../../lib/siteContact";

export default function FooterMapBlock() {
  return (
    <div>
      <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Localização</h3>
      <div className="rounded-lg overflow-hidden border border-white/10">
        <iframe
          title="Localização ProVisual Corporate"
          src={SITE_MAP_EMBED_URL}
          className="w-full h-36 border-0 grayscale-[30%] contrast-[1.05]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="text-xs text-gray-500 leading-relaxed mt-3">{SITE_ADDRESS}</p>
    </div>
  );
}
