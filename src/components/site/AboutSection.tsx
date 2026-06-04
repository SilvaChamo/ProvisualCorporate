import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, FileText, Target, Heart } from "lucide-react";
import { cn } from "../../lib/utils";
import type { HomeContent } from "../../lib/homeContent";
import OptimizedDriveImage from "./OptimizedDriveImage";
import AboutPdfEmbed from "./AboutPdfEmbed";
import { homeDisplayImage } from "../../lib/homeImageFallback";

const ABOUT_ICONS = {
  mission: Target,
  vision: Eye,
  values: Heart,
} as const;

interface AboutSectionProps {
  content: HomeContent;
}

export default function AboutSection({ content }: AboutSectionProps) {
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const { about } = content;
  const documents = about.documents?.length ? about.documents : [];

  const aboutItems = [
    { key: "mission" as const, title: about.missionTitle, text: about.mission },
    { key: "vision" as const, title: about.visionTitle, text: about.vision },
    { key: "values" as const, title: about.valuesTitle, text: about.values },
  ];

  return (
    <section id="sobre" className="scroll-mt-[75px] space-y-10 p-6 sm:p-8 lg:p-10">
      {about.history ? (
        <article className="about-history-card relative overflow-hidden rounded-2xl bg-white px-6 py-7 shadow-[5px_5px_6px_rgba(0,0,0,0.06)] sm:px-8 sm:py-8">
          <div className="site-section-kicker mb-3">
            <span className="site-section-kicker-line site-section-kicker-line--dark" />
            <p className="site-antetitle whitespace-nowrap text-[#a21b7e]">
              {about.historyTitle || "História da AMIC"}
            </p>
          </div>
          <p className="max-w-none text-sm leading-relaxed text-gray-600 sm:text-base">{about.history}</p>
        </article>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
        <div className="relative h-[380px] sm:h-[420px] lg:h-[500px]">
          <OptimizedDriveImage
            src={content.aboutImage}
            alt="Equipa ProVisual Corporate"
            size="md"
            className="h-full w-full rounded-2xl object-cover"
          />
        </div>

        <div className="flex h-full flex-col justify-center tracking-[0.01em] lg:min-h-[500px]">
          <div className="site-section-kicker">
            <span className="site-section-kicker-line site-section-kicker-line--dark" />
            <p className="site-antetitle whitespace-nowrap text-[#a21b7e]">Sobre nós</p>
          </div>

          <h2 className="site-section-title text-[#333]">
            Quem <span className="font-light">somos?</span>
          </h2>
          <p className="site-section-desc mb-4 text-gray-600">
            Entre qualidade e <span className="font-light">eficiência</span>
          </p>

          <div className="rounded-2xl bg-white py-4 pl-5 pr-5 shadow-[5px_5px_6px_rgba(0,0,0,0.06)] sm:pl-7 sm:pr-9">
            <ul className="relative space-y-6 pb-1">
              {aboutItems.map((item, index) => {
                const Icon = ABOUT_ICONS[item.key];
                return (
                  <li
                    key={item.key}
                    className={cn("flex gap-5", index === 1 && "mt-[10px]", index === 2 && "mt-[25px]")}
                  >
                    <div className="relative flex shrink-0 flex-col items-center">
                      <div className="relative z-10 flex h-[60px] w-[60px] items-center justify-center rounded-[10px] bg-gradient-to-br from-[#a21b7e] to-[#3d001d] text-white shadow-md shadow-[#a21b7e]/20">
                        <Icon size={28} strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="pt-0.5">
                      <h3 className="mb-0.5 text-lg font-semibold leading-7 text-[#333]">{item.title}</h3>
                      <p className="text-sm font-medium leading-[18px] text-gray-500">{item.text}</p>
                      {item.key === "values" && about.valuesPills?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {about.valuesPills.map((pill) => (
                            <span
                              key={pill}
                              className="rounded-full border border-[#a21b7e]/20 bg-[#a21b7e]/5 px-3 py-0.5 text-xs font-medium text-[#a21b7e]"
                            >
                              {pill}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {documents.length > 0 ? (
        <div>
          <div className="site-section-kicker mb-4">
            <span className="site-section-kicker-line site-section-kicker-line--dark" />
            <p className="site-antetitle whitespace-nowrap text-[#a21b7e]">Documentos</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {documents.map((doc) => {
              const previewSrc = doc.previewImage
                ? homeDisplayImage(doc.previewImage, doc.previewImage)
                : null;
              const showImagePreview =
                previewSrc && !/\.pdf(\?|$)/i.test(previewSrc) && !previewSrc.includes("/api/drive/media");

              return (
                <article
                  key={doc.title}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[5px_5px_6px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                    <FileText size={18} className="text-[#a21b7e]" />
                    <h3 className="text-base font-semibold text-[#333]">{doc.title}</h3>
                  </div>
                  <div className="p-4 sm:p-5">
                    {showImagePreview ? (
                      <div className="mb-4 overflow-hidden rounded-xl border border-gray-200">
                        <OptimizedDriveImage
                          src={previewSrc}
                          alt={`Capa — ${doc.title}`}
                          size="md"
                          className="h-40 w-full object-cover sm:h-48"
                        />
                      </div>
                    ) : null}
                    <AboutPdfEmbed url={doc.pdfUrl} title={doc.title} />
                    <a
                      href={doc.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#a21b7e] hover:text-[#8e176e]"
                    >
                      <Eye size={16} />
                      Abrir PDF em novo separador
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-[5px_5px_6px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <p className="site-antetitle text-[#a21b7e]">Serviços</p>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">{content.servicesIntro}</p>
          </div>
          <button
            type="button"
            onClick={() => setServicesExpanded((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#a21b7e] px-5 py-2.5 text-sm font-medium text-[#a21b7e] transition-colors hover:bg-[#a21b7e]/5"
            aria-expanded={servicesExpanded}
          >
            {servicesExpanded ? (
              <>
                Recolher
                <ChevronUp size={18} />
              </>
            ) : (
              <>
                Expandir
                <ChevronDown size={18} />
              </>
            )}
          </button>
        </div>

        {servicesExpanded ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {content.services.map((service) => (
              <div
                key={service.title}
                className="rounded-xl border border-[#a21b7e]/10 bg-[#a21b7e]/[0.03] p-4"
              >
                <h4 className="text-base font-bold text-[#333]">{service.title}</h4>
                <p className="mt-0.5 text-sm italic text-[#a21b7e]">{service.subtitle}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{service.description}</p>
                {service.items?.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-gray-500">
                    {service.items.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-[#a21b7e]">·</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
