import { Link } from "react-router-dom";
import {
  Megaphone,
  Palette,
  Camera,
  Monitor,
  Briefcase,
  Sparkles,
} from "lucide-react";
import SiteShell from "./SiteShell";
import { SERVICE_ITEMS, SERVICOS_INTRO } from "../../lib/sitePages";
import type { ServiceItem } from "../../lib/sitePages";
import { PAGE_BREADCRUMBS } from "../../lib/siteNav";

const ICONS = {
  megaphone: Megaphone,
  palette: Palette,
  camera: Camera,
  monitor: Monitor,
  briefcase: Briefcase,
  sparkles: Sparkles,
};

function ServiceCard({ service }: { service: ServiceItem }) {
  const Icon = ICONS[service.icon];

  return (
    <Link
      to={`/servicos/${service.slug}`}
      className="group flex flex-col h-full p-8 rounded-2xl border border-[#a21b7e]/10 bg-[#a21b7e]/[0.04] shadow-sm hover:shadow-lg hover:border-[#a21b7e]/25 hover:bg-[#a21b7e]/[0.07] transition-all text-center"
    >
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/80 text-gray-500 flex items-center justify-center group-hover:bg-[#a21b7e]/10 group-hover:text-[#a21b7e] transition-colors shrink-0">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">{service.title}</h2>
      <p className="text-[#a21b7e] text-sm italic mb-4">{service.subtitle}</p>
      <p className="text-gray-600 text-base leading-relaxed flex-1">{service.description}</p>
    </Link>
  );
}

export default function ServicosPage() {
  return (
    <SiteShell title="Serviços" breadcrumbs={[...PAGE_BREADCRUMBS.servicos]}>
      <div className="max-w-3xl mx-auto text-center mb-14">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
          Soluções criativas para o seu posicionamento
        </h2>
        <p className="text-gray-600 text-base md:text-lg leading-relaxed">{SERVICOS_INTRO}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
        {SERVICE_ITEMS.map((service) => (
          <div key={service.slug} className="h-full">
            <ServiceCard service={service} />
          </div>
        ))}
      </div>
    </SiteShell>
  );
}
