import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Facebook,
  Linkedin,
  Youtube,
  Sparkles,
  Target,
  Eye,
  Heart,
  Lightbulb,
  ClipboardList,
  Cog,
  PackageCheck,
  Instagram,
} from "lucide-react";
import logoHorizontal from "../Logo/logo_horizontal_clean.png";
import QuickLinkIcon from "./site/QuickLinkIcon";
import SiteFooter from "./site/SiteFooter";
import TypewriterTitle from "./site/TypewriterTitle";
import { QUICK_LINK_ROUTES } from "../lib/siteNav";
import {
  DEFAULT_HOME_CONTENT,
  mergeHomeContent,
  type HomeContent,
} from "../lib/homeContent";
import { cn } from "../lib/utils";

const NAV_LINKS = [
  { href: "#sobre", label: "Sobre nós" },
  { href: "#servicos", label: "Serviços" },
  { href: "#eventos", label: "Eventos" },
  { href: "#videos", label: "Vídeos" },
  { href: "#clientes", label: "Clientes" },
  { href: "#noticias", label: "Notícias" },
  { href: "#contactos", label: "Contacte-nos" },
];

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/profile.php?id=61577619669570", icon: Facebook, label: "Facebook" },
  { href: "https://mz.linkedin.com/in/provisual-corporate-493342353", icon: Linkedin, label: "Linkedin" },
  { href: "https://wa.me/+258863076065", icon: "whatsapp" as const, label: "Whatsapp" },
  { href: "https://youtu.be/DVgtNr_bq1g", icon: Youtube, label: "Youtube" },
];

function WhatsAppIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function SocialIcon({ icon, size = 16 }: { icon: typeof SOCIAL_LINKS[number]["icon"]; size?: number }) {
  if (icon === "whatsapp") return <WhatsAppIcon size={size} />;
  const Icon = icon;
  return <Icon size={size} />;
}

const QUICK_LINKS = QUICK_LINK_ROUTES;

const QUICK_LINKS_VISIBLE = 3;
const QUICK_LINK_EXTENDED = [...QUICK_LINKS, ...QUICK_LINKS.slice(0, QUICK_LINKS_VISIBLE)];
const QUICK_LINK_MAX_SLIDE = QUICK_LINKS.length;

const ABOUT_ITEMS = [
  {
    title: "Missão",
    icon: Target,
    text: "Proporcionar soluções de comunicação eficientes e inovadoras, com foco na criação de conteúdos que agrega valor significativo aos nossos clientes",
  },
  {
    title: "Visão",
    icon: Eye,
    text: "Ser referência nacional em produção de conteúdos criativos e estratégicos que respode as necessidades dos nossos clientes",
  },
  {
    title: "Valores",
    icon: Heart,
    text: "Criatividade; Compromisso com a qualidade; Respeito à diversidade cultural; Ética e profissionalismo",
  },
];

const PRODUCTION_PROCESS = [
  {
    step: "01",
    title: "Briefing",
    description:
      "Recolhemos a necessidade do cliente, os objectivos a alcançar e o contexto do projecto. Em seguida apresentamos a proposta e o orçamento adequados.",
    icon: Lightbulb,
  },
  {
    step: "02",
    title: "Planeamento",
    description:
      "Organizamos ideias, cronograma e recursos. Definimos a linha criativa, alinhamos expectativas e damos início formal ao projecto.",
    icon: ClipboardList,
  },
  {
    step: "03",
    title: "Execução",
    description:
      "Materializamos a solução proposta com acompanhamento contínuo, garantindo qualidade, rigor e cumprimento dos parâmetros acordados.",
    icon: Cog,
  },
  {
    step: "04",
    title: "Entrega",
    description:
      "Concluímos com a entrega final, validação do cliente e registo das lições aprendidas — incluindo relatório de resultados quando aplicável.",
    icon: PackageCheck,
  },
];

const TEAM_MEMBERS = [
  {
    name: "Ana Mabunda",
    role: "Directora Criativa",
    image:
      "/INICIO/designer-gr%C3%A1fico-africano-criativo-no-flipchart-com-gr%C3%A1ficos-e-notas-adesivas-187855551.webp",
    social: {
      facebook: "https://www.facebook.com/profile.php?id=61577619669570",
      linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
      instagram: "https://www.instagram.com/",
    },
  },
  {
    name: "Carlos Nhaca",
    role: "Director de Produção",
    image:
      "/INICIO/designer-gr%C3%A1fico-africano-web-usando-software-de-edi%C3%A7%C3%A3o-design-212684276.webp",
    social: {
      facebook: "https://www.facebook.com/profile.php?id=61577619669570",
      linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
      instagram: "https://www.instagram.com/",
    },
  },
  {
    name: "Sofia Matola",
    role: "Gestora de Projectos",
    image: "/INICIO/COmunidade.jpg",
    social: {
      facebook: "https://www.facebook.com/profile.php?id=61577619669570",
      linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
      instagram: "https://www.instagram.com/",
    },
  },
  {
    name: "Miguel Tembe",
    role: "Especialista Audiovisual",
    image: "/INICIO/Coberturas.jpg",
    social: {
      facebook: "https://www.facebook.com/profile.php?id=61577619669570",
      linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
      instagram: "https://www.instagram.com/",
    },
  },
];

const TEAM_VISIBLE = 2;
const TEAM_EXTENDED = [
  ...TEAM_MEMBERS.slice(-TEAM_VISIBLE),
  ...TEAM_MEMBERS,
  ...TEAM_MEMBERS.slice(0, TEAM_VISIBLE),
];
const TEAM_START = TEAM_VISIBLE;
const TEAM_END = TEAM_START + TEAM_MEMBERS.length;
const TEAM_RESET_BACK = TEAM_END - TEAM_VISIBLE;

export default function Home() {
  const [content, setContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bannerParallaxY, setBannerParallaxY] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [quickLinkSlide, setQuickLinkSlide] = useState(0);
  const [quickLinkResetting, setQuickLinkResetting] = useState(false);
  const [teamSlide, setTeamSlide] = useState(TEAM_START);
  const [teamResetting, setTeamResetting] = useState(false);
  const [activeTeamCard, setActiveTeamCard] = useState(2);

  useEffect(() => {
    fetch("/api/site/home")
      .then((r) => r.json())
      .then((data) => setContent(mergeHomeContent(data.content)))
      .catch(() => setContent(DEFAULT_HOME_CONTENT));
  }, []);

  useEffect(() => {
    const BANNER_HEIGHT = 805;

    const onScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 40);
      const bannerScroll = Math.min(scrollY, BANNER_HEIGHT);
      setBannerParallaxY(bannerScroll * 0.45);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (content.slides.length <= 1) return;
    const t = setInterval(() => {
      setSlideIndex((i) => (i + 1) % content.slides.length);
    }, 15000);
    return () => clearInterval(t);
  }, [content.slides.length]);

  useEffect(() => {
    const t = setInterval(() => {
      setQuickLinkSlide((i) => i + 1);
    }, 7500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (quickLinkSlide !== QUICK_LINK_MAX_SLIDE) return;
    const t = setTimeout(() => {
      setQuickLinkResetting(true);
      setQuickLinkSlide(0);
      requestAnimationFrame(() => setQuickLinkResetting(false));
    }, 520);
    return () => clearTimeout(t);
  }, [quickLinkSlide]);

  useEffect(() => {
    const t = setInterval(() => {
      setTeamSlide((i) => i + 1);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (teamSlide !== TEAM_END) return;
    const t = setTimeout(() => {
      setTeamResetting(true);
      setTeamSlide(TEAM_START);
      requestAnimationFrame(() => setTeamResetting(false));
    }, 520);
    return () => clearTimeout(t);
  }, [teamSlide]);

  useEffect(() => {
    if (teamSlide !== TEAM_START - TEAM_VISIBLE) return;
    const t = setTimeout(() => {
      setTeamResetting(true);
      setTeamSlide(TEAM_RESET_BACK);
      requestAnimationFrame(() => setTeamResetting(false));
    }, 520);
    return () => clearTimeout(t);
  }, [teamSlide]);

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    document.getElementById(href.replace("#", ""))?.scrollIntoView({ behavior: "smooth" });
  };

  const activeSlide = content.slides[slideIndex] ?? content.slides[0];
  const slideImage =
    activeSlide?.image ||
    DEFAULT_HOME_CONTENT.slides[slideIndex]?.image ||
    content.hero.backgroundImage;

  const prevSlide = () =>
    setSlideIndex((i) => (i - 1 + content.slides.length) % content.slides.length);
  const nextSlide = () => setSlideIndex((i) => (i + 1) % content.slides.length);

  return (
    <div className="site-bg min-h-screen text-gray-900 overflow-x-hidden font-sans">
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-20 transition-all duration-500 ease-in-out",
          scrolled
            ? "bg-white shadow-sm border-b border-gray-100"
            : "bg-black/25 border-b border-[#a21b7e]/30",
        )}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-full grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <a href="#inicio" onClick={() => scrollTo("#inicio")} className="shrink-0 flex items-center h-full">
            <img
              src={logoHorizontal}
              alt="ProVisual Corporate"
              className={cn(
                "h-10 w-auto object-contain transition-all duration-500",
                !scrolled && "brightness-110",
              )}
            />
          </a>

          <nav className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 flex-wrap">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(link.href);
                }}
                className={cn(
                  "text-[15px] lg:text-base font-normal transition-colors duration-500 whitespace-nowrap",
                  scrolled ? "text-gray-700 hover:text-[#a21b7e]" : "text-white/90 hover:text-white",
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-3">
            <Link
              to="/login"
              className={cn(
                "hidden sm:inline-flex text-[15px] lg:text-base font-normal rounded-full px-6 py-1.5 transition-all duration-500 whitespace-nowrap",
                scrolled
                  ? "text-[#a21b7e] border border-[#a21b7e] hover:bg-[#a21b7e]/5"
                  : "text-white border border-white/70 hover:bg-white/10",
              )}
            >
              Entrar
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "lg:hidden p-2 transition-colors duration-500",
                scrolled ? "text-gray-700" : "text-white",
              )}
              aria-label="Menu"
            >
              {menuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "lg:hidden border-t transition-colors duration-500",
                scrolled ? "bg-white border-gray-100" : "bg-black/50 border-[#a21b7e]/25",
              )}
            >
              <div className="px-6 py-4 flex flex-col gap-3">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(link.href);
                    }}
                    className={cn(
                      "text-base py-2.5 transition-colors duration-500",
                      scrolled ? "text-gray-700 hover:text-[#a21b7e]" : "text-white/90 hover:text-white",
                    )}
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  to="/login"
                  className={cn(
                    "mt-2 text-center text-sm py-2.5 rounded-full transition-all duration-500",
                    scrolled
                      ? "border border-[#a21b7e] text-[#a21b7e] hover:bg-[#a21b7e]/5"
                      : "border border-white/70 text-white hover:bg-white/10",
                  )}
                >
                  Entrar
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Banner + menu integrados como no site original */}
      <section id="inicio" className="relative h-[805px] overflow-hidden text-white">
        <AnimatePresence initial={false}>
          <motion.div
            key={slideImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="absolute inset-0 bg-cover bg-center will-change-transform"
            style={{
              backgroundImage: `url(${slideImage})`,
              transformOrigin: "center center",
              transform: `translate3d(0, ${bannerParallaxY}px, 0) scale(1.12)`,
            }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/55" />

        <button
          type="button"
          onClick={prevSlide}
          className="group absolute left-[70px] top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-[#3d001d] flex items-center justify-center hover:bg-[#8e176e] transition-colors"
          aria-label="Slide anterior"
        >
          <ChevronLeft size={26} className="text-[#c958a8] group-hover:text-white transition-colors" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={nextSlide}
          className="group absolute right-[70px] top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-[#3d001d] flex items-center justify-center hover:bg-[#8e176e] transition-colors"
          aria-label="Slide seguinte"
        >
          <ChevronRight size={26} className="text-[#c958a8] group-hover:text-white transition-colors" strokeWidth={2.25} />
        </button>

        <div className="relative z-10 h-full flex flex-col items-center px-6 pb-10 pt-20">
          <div className="text-center w-full mt-[120px]">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-4 mb-5">
                <span className="h-px w-10 bg-white/60" />
                <p className="text-xs md:text-sm font-normal uppercase tracking-[0.28em] text-white/90">
                  {activeSlide?.category}
                </p>
                <span className="h-px w-10 bg-white/60" />
              </div>

              <TypewriterTitle
                text={activeSlide?.title ?? ""}
                className="text-3xl md:text-5xl lg:text-[3.25rem] font-bold leading-tight max-w-4xl mb-8 text-white min-h-[1.2em]"
                speedMs={90}
                deleteSpeedMs={14}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#contactos"
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo("#contactos");
                }}
                className="inline-flex items-center bg-[#a21b7e] text-white text-sm font-normal px-8 py-3 rounded-full hover:bg-[#8e176e] transition-colors"
              >
                Siga-nos
              </a>
              <div className="flex items-center gap-2">
                {SOCIAL_LINKS.map(({ href, icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-full bg-[#a21b7e] text-white flex items-center justify-center hover:bg-[#8e176e] transition-colors"
                  >
                    <SocialIcon icon={icon} size={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Carrossel infinito — 3 cards inteiros visíveis, desliza 1 à esquerda */}
          <div className="w-[60%] mt-[80px] mb-[100px] shrink-0">
            <div className="overflow-hidden w-full">
              <motion.div
                className="flex"
                style={{
                  width: `${(QUICK_LINK_EXTENDED.length / QUICK_LINKS_VISIBLE) * 100}%`,
                }}
                animate={{
                  x: `-${quickLinkSlide * (100 / QUICK_LINK_EXTENDED.length)}%`,
                }}
                transition={
                  quickLinkResetting
                    ? { duration: 0 }
                    : { duration: 0.5, ease: "easeInOut" }
                }
              >
                {QUICK_LINK_EXTENDED.map((item, index) => {
                  const card = (
                    <div className="quick-link-candy h-full rounded-2xl">
                      <div className="quick-link-candy-gradient" aria-hidden="true" />
                      <div className="quick-link-candy-inner bg-white py-4 px-2 text-center h-full flex flex-col items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.08)] group-hover:shadow-[0_12px_36px_rgba(162,27,126,0.18)] transition-all duration-300 active:scale-[0.98] cursor-pointer">
                        <QuickLinkIcon type={item.icon} />
                        <h3 className="text-[#a21b7e] text-xl font-bold leading-none mt-2">{item.label}</h3>
                        <p className="text-[#737373] text-sm font-normal leading-snug mt-1 px-1">{item.description}</p>
                      </div>
                    </div>
                  );

                  const cardKey = `${item.label}-${index}`;
                  const slotWidth = 100 / QUICK_LINK_EXTENDED.length;

                  return (
                    <div
                      key={cardKey}
                      className="shrink-0 box-border px-2.5"
                      style={{ width: `${slotWidth}%` }}
                    >
                      <Link to={item.to} className="block h-full group" aria-label={`Abrir ${item.label}`}>
                        {card}
                      </Link>
                    </div>
                  );
                })}
              </motion.div>
            </div>

            <div className="flex justify-center gap-2.5 mt-5">
              {QUICK_LINKS.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setQuickLinkSlide(index)}
                  aria-label={`Mostrar card ${item.label}`}
                  aria-current={quickLinkSlide % QUICK_LINKS.length === index ? "true" : undefined}
                  className={`h-2.5 rounded-full transition-all ${
                    quickLinkSlide % QUICK_LINKS.length === index
                      ? "w-7 bg-white/90"
                      : "w-2.5 bg-white/30 hover:bg-white/45"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* Container branco — secção Sobre nós completa */}
      <div className="relative z-20 -mt-[50px] mb-10 max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_5px_5px_5px_rgba(0,0,0,0.08)]">
          <section id="sobre" className="scroll-mt-[75px] p-10">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
              <div className="relative h-[380px] sm:h-[420px] lg:h-[500px]">
                <img
                  src="/INICIO/sobre.webp"
                  alt="Equipa ProVisual Corporate"
                  className="h-full w-full rounded-2xl object-cover"
                />
              </div>

              <div className="flex h-full flex-col justify-center tracking-[0.01em] lg:min-h-[500px]">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-px w-8 bg-[#D7D7D7]" />
                  <span className="whitespace-nowrap text-lg text-gray-500">Sobre nós</span>
                </div>

                <h2 className="mb-1 text-3xl font-bold leading-tight text-[#333] sm:text-4xl lg:text-[2.65rem]">
                  Quem <span className="font-light">somos?</span>
                </h2>
                <p className="mb-4 text-xl font-normal text-[#a21b7e] sm:text-2xl">
                  Entre qualidade e <span className="font-light">eficiência</span>
                </p>

                <div className="rounded-2xl bg-white py-4 pl-5 pr-5 shadow-[5px_5px_6px_rgba(0,0,0,0.06)] sm:pl-7 sm:pr-9">
                  <ul className="relative pb-1">
                    <span
                      className="absolute bottom-[20px] left-[30px] top-[60px] w-px bg-[#a21b7e]"
                      aria-hidden="true"
                    />
                    {ABOUT_ITEMS.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <li
                          key={item.title}
                          className={cn(
                            "flex gap-5",
                            index === 1 && "mt-[10px]",
                            index === 2 && "mt-[25px]",
                          )}
                        >
                          <div className="relative flex shrink-0 flex-col items-center">
                            <div className="relative z-10 flex h-[60px] w-[60px] items-center justify-center rounded-[10px] bg-gradient-to-br from-[#a21b7e] to-[#3d001d] text-white shadow-md shadow-[#a21b7e]/20">
                              <Icon size={28} strokeWidth={1.5} />
                            </div>
                          </div>
                          <div className="pt-0.5">
                            <h3 className="mb-0.5 text-[21px] font-semibold leading-7 text-[#333]">
                              {item.title}
                            </h3>
                            <p className="text-[15px] font-medium leading-[18px] text-gray-500">
                              {item.text}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Processo criativo — Nossos serviços */}
      <section
        id="servicos"
        className="relative py-24 lg:py-28 scroll-mt-[75px] overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: "url(/INICIO/COmunidade.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#3d001d]/94 via-[#a21b7e]/80 to-[#120810]/95" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="max-w-3xl mx-auto text-center mb-14 lg:mb-16">
            <div className="mb-4 flex items-center justify-center gap-4">
              <span className="h-px w-10 bg-white/60" />
              <p className="text-sm font-normal uppercase tracking-[0.28em] text-[#e888c8]">
                Como trabalhamos
              </p>
              <span className="h-px w-10 bg-white/60" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              Nosso <span className="text-white/85 font-light">Processo Criativo</span>
            </h2>
            <p className="text-white/85 text-sm sm:text-base leading-relaxed">
              Do briefing à entrega de resultados, acrescentamos valor às suas estratégias com rigor,
              criatividade e acompanhamento em cada etapa.
            </p>
          </div>

          <div className="relative">
            <div
              className="hidden lg:block absolute top-[72px] left-[12%] right-[12%] h-px border-t border-dashed border-white/35"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
              {PRODUCTION_PROCESS.map((item, index) => {
                const Icon = item.icon;
                const stagger = index % 2 === 1 ? "lg:translate-y-10" : "lg:-translate-y-2";

                return (
                  <article
                    key={item.step}
                    className={cn(
                      "group relative rounded-2xl bg-white/[0.97] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.18)] transition-transform duration-500 hover:-translate-y-1",
                      stagger,
                    )}
                  >
                    <span
                      className="pointer-events-none absolute -top-1 right-3 text-[4.5rem] font-bold leading-none text-[#a21b7e]/[0.08] select-none"
                      aria-hidden="true"
                    >
                      {item.step}
                    </span>

                    <div className="relative mb-5 flex items-center gap-4">
                      <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a21b7e] to-[#3d001d] text-white shadow-lg shadow-[#a21b7e]/30">
                        <Icon size={24} strokeWidth={1.75} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#a21b7e]">
                        Etapa {item.step}
                      </span>
                    </div>

                    <h3 className="relative text-xl font-bold text-[#2a2a2a] mb-3">{item.title}</h3>
                    <p className="relative text-sm leading-relaxed text-gray-600">{item.description}</p>

                    {index < PRODUCTION_PROCESS.length - 1 && (
                      <div
                        className="lg:hidden absolute -bottom-3 left-1/2 h-6 w-px -translate-x-1/2 bg-white/40"
                        aria-hidden="true"
                      />
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="equipa" className="py-16 scroll-mt-[75px] lg:py-24">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-stretch">
            <div className="relative z-10 lg:col-start-1 lg:row-start-1 lg:-mr-12 xl:-mr-16">
              <div className="flex h-full w-full flex-col items-start justify-center rounded-2xl bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:p-10">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Nossa equipa</span>
                  <span className="h-px w-8 bg-[#D7D7D7]" />
                </div>

                <h2 className="mb-4 text-4xl font-bold leading-tight text-[#333] sm:text-5xl lg:text-[3.25rem]">
                  Criatividade & <span className="font-light">Excelência</span>
                </h2>

                <h3 className="text-lg font-bold text-[#333]">
                  Profissionais <span className="font-light">dedicados</span>
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                  Profissionais multidisciplinares unidos pela criatividade, precisão técnica e
                  compromisso com resultados que fortalecem a presença das marcas em Moçambique.
                </p>

                <Link
                  to="/#contactos"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo("#contactos");
                  }}
                  className="mt-8 inline-flex self-start items-center gap-2 rounded-lg bg-[#a21b7e] px-8 py-3 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#8e176e]"
                >
                  Contacte-nos
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            <div className="relative z-20 flex h-full min-h-[420px] items-center lg:col-start-2 lg:row-start-1 lg:min-h-0 lg:pl-2">
              <div className="flex w-full items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setTeamSlide((i) => i - 1)}
                  aria-label="Profissional anterior"
                  className="relative z-30 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3d001d] text-[#c958a8] transition-colors hover:bg-[#8e176e] hover:text-white"
                >
                  <ChevronLeft size={20} strokeWidth={2.25} />
                </button>

                <div className="relative z-20 min-w-0 flex-1 self-stretch overflow-hidden">
                  <motion.div
                    className="flex h-full"
                    style={{
                      width: `${(TEAM_EXTENDED.length / TEAM_VISIBLE) * 100}%`,
                    }}
                    animate={{
                      x: `-${teamSlide * (100 / TEAM_EXTENDED.length)}%`,
                    }}
                    transition={
                      teamResetting
                        ? { duration: 0 }
                        : { duration: 0.5, ease: "easeInOut" }
                    }
                  >
                    {TEAM_EXTENDED.map((member, index) => (
                      <div
                        key={`${member.name}-${index}`}
                        className="box-border shrink-0 px-2"
                        style={{ width: `${100 / TEAM_EXTENDED.length}%` }}
                      >
                        <article className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                          <div className="relative h-[68%] min-h-[180px] shrink-0 overflow-hidden rounded-t-lg sm:min-h-[210px]">
                            <img
                              src={member.image}
                              alt={member.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex flex-1 flex-col items-center justify-center px-4 py-4 text-center">
                            <h4 className="flex items-center justify-center gap-3 text-base font-bold text-[#333] sm:gap-4 sm:text-lg">
                              <span className="h-px w-10 bg-[#a21b7e] sm:w-12" aria-hidden="true" />
                              {member.name}
                              <span className="h-px w-10 bg-[#a21b7e] sm:w-12" aria-hidden="true" />
                            </h4>
                            <p className="mt-1 text-sm text-[#a21b7e]">{member.role}</p>
                            <div className="mt-2 flex justify-center gap-2.5">
                              <a
                                href={member.social.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Facebook de ${member.name}`}
                                className="text-[#a21b7e] transition-colors hover:text-[#8e176e]"
                              >
                                <Facebook size={13} strokeWidth={2} />
                              </a>
                              <a
                                href={member.social.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`LinkedIn de ${member.name}`}
                                className="text-[#a21b7e] transition-colors hover:text-[#8e176e]"
                              >
                                <Linkedin size={13} strokeWidth={2} />
                              </a>
                              <a
                                href={member.social.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Instagram de ${member.name}`}
                                className="text-[#a21b7e] transition-colors hover:text-[#8e176e]"
                              >
                                <Instagram size={13} strokeWidth={2} />
                              </a>
                            </div>
                          </div>
                        </article>
                      </div>
                    ))}
                  </motion.div>
                </div>

                <button
                  type="button"
                  onClick={() => setTeamSlide((i) => i + 1)}
                  aria-label="Profissional seguinte"
                  className="relative z-30 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3d001d] text-[#c958a8] transition-colors hover:bg-[#8e176e] hover:text-white"
                >
                  <ChevronRight size={20} strokeWidth={2.25} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="equipa-especialistas" className="relative scroll-mt-[75px] bg-white pb-14 lg:pb-16">
        <div className="relative h-[280px] overflow-hidden sm:h-[320px] lg:h-[350px]">
          <img
            src="/INICIO/Coberturas.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#ff6a00]/88" aria-hidden="true" />

          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] sm:text-sm">
              Nossa equipa
            </p>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.75rem]">
              A Nossa Equipa de Especialistas
            </h2>
          </div>
        </div>

        <div className="relative mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-6 sm:-mt-20 sm:grid-cols-2 sm:gap-5 lg:-mt-28 lg:grid-cols-4 lg:gap-4 xl:-mt-32">
            {TEAM_MEMBERS.map((member, index) => {
              const isActive = activeTeamCard === index;

              return (
                <article
                  key={member.name}
                  onMouseEnter={() => setActiveTeamCard(index)}
                  className={cn(
                    "group relative flex flex-col bg-white text-center shadow-[0_10px_35px_rgba(0,0,0,0.12)] transition-all duration-300",
                    isActive ? "-translate-y-1" : "",
                  )}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden transition-opacity duration-300",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    )}
                    aria-hidden="true"
                  >
                    <div className="mx-auto h-32 w-[130%] -translate-y-[58%] rounded-[50%] bg-[#ffedd5]" />
                  </div>

                  <div className="relative px-4 pb-4 pt-9">
                    <div className="relative mx-auto mb-5 h-[118px] w-[118px]">
                      <img
                        src={member.image}
                        alt={member.name}
                        className={cn(
                          "h-full w-full rounded-full object-cover transition-all duration-300",
                          isActive
                            ? "ring-4 ring-[#ff6a00]"
                            : "ring-0 group-hover:ring-4 group-hover:ring-[#ff6a00]",
                        )}
                      />
                    </div>

                    <h3 className="text-lg font-bold text-[#1a1a1a]">{member.name}</h3>
                    <p
                      className={cn(
                        "mt-1 text-sm font-medium text-[#ff6a00] transition-all duration-300",
                        isActive ? "pb-2" : "pb-6 group-hover:pb-2",
                      )}
                    >
                      {member.role}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "mt-auto flex items-center justify-center gap-3 overflow-hidden bg-[#ff6a00] px-3 transition-all duration-300",
                      isActive
                        ? "max-h-14 py-3 opacity-100"
                        : "max-h-0 py-0 opacity-0 group-hover:max-h-14 group-hover:py-3 group-hover:opacity-100",
                    )}
                  >
                    <a
                      href={member.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Facebook de ${member.name}`}
                      className="text-white transition-opacity hover:opacity-80"
                    >
                      <Facebook size={15} strokeWidth={2} />
                    </a>
                    <a
                      href={member.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Instagram de ${member.name}`}
                      className="text-white transition-opacity hover:opacity-80"
                    >
                      <Instagram size={15} strokeWidth={2} />
                    </a>
                    <a
                      href="https://youtu.be/DVgtNr_bq1g"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Youtube ProVisual`}
                      className="text-white transition-opacity hover:opacity-80"
                    >
                      <Youtube size={15} strokeWidth={2} />
                    </a>
                    <a
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`LinkedIn de ${member.name}`}
                      className="text-white transition-opacity hover:opacity-80"
                    >
                      <Linkedin size={15} strokeWidth={2} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="eventos" className="py-20 px-6 scroll-mt-[75px]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Eventos</h2>
          <p className="text-gray-500">
            Cobertura audiovisual de conferências, seminários e activações de marca com a ProVisual.
          </p>
        </div>
      </section>

      <section id="videos" className="py-20 px-6 scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Videos</h2>
          <p className="text-gray-500">
            Captamos vídeos com identidade, missão e impacto da sua organização.
          </p>
        </div>
      </section>

      <section id="clientes" className="py-20 px-6 scroll-mt-[75px]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">
            Nossos <span className="font-light">Clientes</span>
          </h2>
          <p className="text-gray-500">
            Empresas de sucesso têm o cliente como bem maior. Prezamos pela confiança e pelos resultados.
          </p>
        </div>
      </section>

      <section id="noticias" className="py-20 px-6 scroll-mt-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Notícias</h2>
          <p className="text-gray-500">
            Actualizações, projectos e novidades da ProVisual Corporate.
          </p>
        </div>
      </section>

      <section id="arquivo" className="py-24 px-6 bg-[#a21b7e] text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <Sparkles className="mx-auto mb-6 opacity-80" size={40} />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Arquivo <span className="font-light">ProVisual Corporate</span>
          </h2>
          <p className="text-white/90 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            Portal corporativo para gerir activos visuais com Google Drive e IA integrada.
          </p>
          <Link
            to="/arquivo"
            className="inline-flex items-center gap-2 bg-white text-[#a21b7e] px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl"
          >
            Entrar no Console
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      <section id="contactos" className="py-24 px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-3">
              Quer trabalhar <span className="font-light">connosco?</span>
            </h2>
            <p className="text-[#a21b7e] font-bold uppercase tracking-widest text-sm">
              {content.contact.ctaSubtitle}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h3 className="text-2xl font-bold mb-4">
                Entre em <span className="font-light">contacto</span>
              </h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Somos apaixonados em desenvolver soluções para os nossos clientes. Venha contar-nos
                a sua ideia — o café é por nossa conta.
              </p>

              <div className="space-y-4">
                <a
                  href={`https://wa.me/${content.contact.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#a21b7e]/30 hover:shadow-sm transition-all group"
                >
                  <div className="w-11 h-11 rounded-full bg-[#25D366] text-white flex items-center justify-center">
                    <WhatsAppIcon size={22} />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      WhatsApp
                    </div>
                    <div className="font-bold text-gray-800 group-hover:text-[#a21b7e]">
                      +{content.contact.whatsapp}
                    </div>
                  </div>
                </a>

                {content.contact.phones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#a21b7e]/30 hover:shadow-sm transition-all group"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#a21b7e]/10 text-[#a21b7e] flex items-center justify-center">
                      <Phone size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Telefone
                      </div>
                      <div className="font-bold text-gray-800 group-hover:text-[#a21b7e]">{phone}</div>
                    </div>
                  </a>
                ))}

                <a
                  href={`mailto:${content.contact.email}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#a21b7e]/30 hover:shadow-sm transition-all group"
                >
                  <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Email
                    </div>
                    <div className="font-bold text-gray-800 group-hover:text-[#a21b7e]">
                      {content.contact.email}
                    </div>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
                  <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Endereço
                    </div>
                    <div className="font-bold text-gray-800">{content.contact.address}</div>
                  </div>
                </div>
              </div>
            </div>

            <form
              className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-gray-100 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const data = new FormData(form);
                const nome = data.get("nome") as string;
                const email = data.get("email") as string;
                const assunto = (data.get("assunto") as string) || "Contacto via site";
                const mensagem = data.get("mensagem") as string;
                window.location.href = `mailto:${content.contact.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(`Nome: ${nome}\nEmail: ${email}\n\n${mensagem}`)}`;
              }}
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Nome
                </label>
                <input
                  name="nome"
                  required
                  className="w-full h-12 px-4 border border-gray-100 rounded-lg focus:border-[#a21b7e] outline-none text-sm"
                  placeholder="O seu nome"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full h-12 px-4 border border-gray-100 rounded-lg focus:border-[#a21b7e] outline-none text-sm"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Assunto
                </label>
                <input
                  name="assunto"
                  className="w-full h-12 px-4 border border-gray-100 rounded-lg focus:border-[#a21b7e] outline-none text-sm"
                  placeholder="Assunto"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Mensagem
                </label>
                <textarea
                  name="mensagem"
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-100 rounded-lg focus:border-[#a21b7e] outline-none text-sm resize-none"
                  placeholder="Conte-nos a sua ideia..."
                />
              </div>
              <button
                type="submit"
                className="w-full h-14 bg-[#a21b7e] text-white text-sm font-bold uppercase tracking-widest rounded-lg hover:bg-[#8e176e] transition-colors"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
