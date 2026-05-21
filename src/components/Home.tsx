import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu,
  X,
  Megaphone,
  Palette,
  Camera,
  Monitor,
  Lightbulb,
  FolderOpen,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Target,
  Eye,
  Heart,
} from "lucide-react";
import { cn } from "../lib/utils";
import logoHorizontal from "../Logo/logo_horizontal_clean.png";
import simboloImg from "../Logo/Simbolo.png";
import {
  DEFAULT_HOME_CONTENT,
  mergeHomeContent,
  type HomeContent,
  type HomeService,
} from "../lib/homeContent";

const NAV_LINKS = [
  { href: "#inicio", label: "Home" },
  { href: "#sobre", label: "Sobre nós" },
  { href: "#servicos", label: "Serviços" },
  { href: "#eventos", label: "Eventos" },
  { href: "#videos", label: "Videos" },
  { href: "#clientes", label: "Clientes" },
  { href: "#contactos", label: "Contacte-nos" },
];

const SERVICE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  "Gestão de Ativos Visuais": FolderOpen,
  "Publicidade e Marketing Digital": Megaphone,
  "Branding e Design Gráfico": Palette,
  "Fotografia e Videografia": Camera,
  "Serviços Informáticos": Monitor,
  Consultorias: Lightbulb,
};

function getServiceIcon(title: string) {
  return SERVICE_ICONS[title] || Sparkles;
}

const ABOUT_TABS = [
  { id: "missao", label: "Missão", icon: Target, key: "mission" as const },
  { id: "visao", label: "Visão", icon: Eye, key: "vision" as const },
  { id: "valores", label: "Valores", icon: Heart, key: "values" as const },
];

export default function Home() {
  const [content, setContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("missao");
  const [scrolled, setScrolled] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    fetch("/api/site/home")
      .then((r) => r.json())
      .then((data) => setContent(mergeHomeContent(data.content)))
      .catch(() => setContent(DEFAULT_HOME_CONTENT));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (content.slides.length <= 1) return;
    const t = setInterval(() => {
      setSlideIndex((i) => (i + 1) % content.slides.length);
    }, 5000);
    return () => clearInterval(t);
  }, [content.slides.length]);

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    document.getElementById(href.replace("#", ""))?.scrollIntoView({ behavior: "smooth" });
  };

  const activeSlide = content.slides[slideIndex] ?? content.slides[0];

  const aboutContent = () => {
    if (activeTab === "missao")
      return {
        title: content.about.missionTitle,
        tagline: "Excelência na comunicação",
        text: content.about.mission,
        pills: null as string[] | null,
      };
    if (activeTab === "visao")
      return {
        title: content.about.visionTitle,
        tagline: "Referência nacional",
        text: content.about.vision,
        pills: null,
      };
    return {
      title: content.about.valuesTitle,
      tagline: "O que nos move",
      text: content.about.values,
      pills: content.about.valuesPills,
    };
  };

  const about = aboutContent();
  const tabMeta = ABOUT_TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "bg-white/95 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a href="#inicio" onClick={() => scrollTo("#inicio")} className="flex items-center gap-3">
            <img
              src={logoHorizontal}
              alt="ProVisual Corporate"
              className={cn("h-9 w-auto object-contain transition-all", scrolled ? "" : "brightness-0 invert")}
            />
          </a>

          <nav className="hidden xl:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(link.href);
                }}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors",
                  scrolled ? "text-gray-600 hover:text-[#a21b7e]" : "text-white/90 hover:text-white"
                )}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-full transition-all",
                scrolled
                  ? "bg-[#a21b7e] text-white hover:bg-[#8e176e]"
                  : "bg-white text-[#a21b7e] hover:bg-white/90"
              )}
            >
              Entrar
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn("xl:hidden p-2", scrolled ? "text-[#a21b7e]" : "text-white")}
            aria-label="Menu"
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden bg-white border-t border-gray-100 shadow-lg"
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
                    className="text-sm font-bold text-gray-700 hover:text-[#a21b7e] py-2"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  to="/login"
                  className="mt-2 text-center bg-[#a21b7e] text-white text-sm font-bold py-3 rounded-full"
                >
                  Entrar no Portal
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <section
        id="inicio"
        className="relative min-h-screen flex items-center justify-center text-center text-white overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${content.hero.backgroundImage})` }}
        />
        <div className="absolute inset-0 bg-[#a21b7e]/80" />
        <div
          className="absolute bottom-0 left-0 right-0 h-24 bg-white"
          style={{ clipPath: "polygon(0 55%, 50% 100%, 100% 55%)" }}
        />

        <motion.div
          key={slideIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 px-6 max-w-4xl pt-24"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm p-3">
            <img src={simboloImg} alt="" className="w-full h-full object-contain" />
          </div>
          <p className="text-xs md:text-sm font-bold uppercase tracking-[0.35em] text-white/80 mb-2">
            {activeSlide?.category}
          </p>
          <p className="text-sm md:text-base font-bold uppercase tracking-[0.35em] text-white/90 mb-3">
            {content.hero.eyebrow}
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tight mb-3">
            {content.hero.title}
          </h1>
          <p className="text-xl md:text-2xl font-light mb-2">{activeSlide?.title}</p>
          <p className="text-base md:text-lg font-light text-white/90 mb-10 max-w-xl mx-auto">
            {content.hero.tagline}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#servicos"
              onClick={(e) => {
                e.preventDefault();
                scrollTo("#servicos");
              }}
              className="inline-flex items-center gap-2 bg-white text-[#a21b7e] px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl"
            >
              {content.hero.ctaPrimary}
              <ChevronRight size={18} />
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 border-2 border-white/80 text-white px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              {content.hero.ctaSecondary}
            </Link>
          </div>
          {content.slides.length > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {content.slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlideIndex(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === slideIndex ? "bg-white w-6" : "bg-white/40"
                  )}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </section>

      <section id="sobre" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#a21b7e] text-xs font-bold uppercase tracking-[0.3em] mb-3">
              Informação
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Quem somos?</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">{content.hero.tagline}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {ABOUT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
                  activeTab === tab.id
                    ? "bg-[#a21b7e] text-white shadow-lg shadow-[#a21b7e]/25"
                    : "bg-[#fafafa] text-gray-500 border border-gray-200 hover:border-[#a21b7e]/40"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center bg-[#fafafa] rounded-3xl p-10 md:p-14 border border-gray-100"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#a21b7e]/10 text-[#a21b7e] flex items-center justify-center">
              <tabMeta.icon size={28} />
            </div>
            <h3 className="text-2xl font-bold mb-2">{about.title}</h3>
            <p className="text-[#a21b7e] text-sm font-bold uppercase tracking-widest mb-6">
              {about.tagline}
            </p>
            <p className="text-gray-600 leading-relaxed">{about.text}</p>
            {about.pills && (
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                {about.pills.map((pill) => (
                  <span
                    key={pill}
                    className="px-5 py-2 bg-[#a21b7e]/5 text-[#a21b7e] text-xs font-bold uppercase tracking-wider rounded-full"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section id="servicos" className="py-24 px-6 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#a21b7e] text-xs font-bold uppercase tracking-[0.3em] mb-3">
              O que fazemos
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Os nossos serviços</h2>
            <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">{content.servicesIntro}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {content.services.map((service: HomeService, i: number) => {
              const Icon = getServiceIcon(service.title);
              return (
                <motion.article
                  key={service.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="group p-8 rounded-2xl border border-gray-100 bg-white hover:border-[#a21b7e]/30 hover:shadow-lg transition-all"
                >
                  <div className="w-14 h-14 rounded-xl bg-[#a21b7e]/10 text-[#a21b7e] flex items-center justify-center mb-6 group-hover:bg-[#a21b7e] group-hover:text-white transition-colors">
                    <Icon size={26} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{service.title}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#a21b7e] mb-4">
                    {service.subtitle}
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">{service.description}</p>
                  <ul className="space-y-2">
                    {service.items.map((item) => (
                      <li key={item} className="text-xs text-gray-600 flex gap-2">
                        <span className="text-[#a21b7e] shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="eventos" className="py-20 px-6 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Eventos</h2>
          <p className="text-gray-500">
            Cobertura audiovisual de conferências, seminários e activações de marca com a ProVisual.
          </p>
        </div>
      </section>

      <section id="videos" className="py-20 px-6 bg-[#fafafa] scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Videos</h2>
          <p className="text-gray-500">
            Captamos vídeos com identidade, missão e impacto da sua organização.
          </p>
        </div>
      </section>

      <section id="clientes" className="py-20 px-6 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Nossos Clientes</h2>
          <p className="text-gray-500">
            Empresas de sucesso têm o cliente como bem maior. Prezamos pela confiança e pelos resultados.
          </p>
        </div>
      </section>

      <section id="arquivo" className="py-24 px-6 bg-[#a21b7e] text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <Sparkles className="mx-auto mb-6 opacity-80" size={40} />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Arquivo ProVisual Corporate</h2>
          <p className="text-white/90 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            Portal corporativo para gerir activos visuais com Google Drive e IA integrada.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white text-[#a21b7e] px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl"
          >
            Entrar no Console
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      <section id="contactos" className="py-24 px-6 bg-[#fafafa] scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-3">
              {content.contact.ctaTitle}
            </h2>
            <p className="text-[#a21b7e] font-bold uppercase tracking-widest text-sm">
              {content.contact.ctaSubtitle}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h3 className="text-2xl font-bold mb-4">Entre em contacto</h3>
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
                  <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <MessageSquare size={20} />
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

      <footer className="py-8 px-6 bg-gray-900 text-gray-400 text-center text-sm">
        <img
          src={logoHorizontal}
          alt="ProVisual"
          className="h-8 mx-auto mb-4 brightness-0 invert opacity-80"
        />
        <p>© {new Date().getFullYear()} ProVisual Corporate. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
