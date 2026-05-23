export interface HomeSlide {
  category: string;
  title: string;
  subtitle: string;
  image: string;
}

export interface HomeService {
  title: string;
  subtitle: string;
  description: string;
  items: string[];
}

export interface HomeTeamMember {
  name: string;
  role: string;
  image: string;
  social: {
    facebook: string;
    linkedin: string;
    instagram: string;
  };
}

export interface HomeEventType {
  title: string;
  description: string;
  image: string;
}

export interface HomeClientLogo {
  name: string;
  image: string;
}

export interface HomeNewsItem {
  title: string;
  image: string;
  href?: string;
}

const SCRAPE_ASSETS = "INICIO/Home - ProvisualCorporate_files";

export interface HomeContent {
  hero: {
    eyebrow: string;
    title: string;
    tagline: string;
    ctaPrimary: string;
    ctaSecondary: string;
    backgroundImage: string;
  };
  slides: HomeSlide[];
  aboutImage: string;
  processBackground: string;
  teamBanner: string;
  teamMembers: HomeTeamMember[];
  about: {
    missionTitle: string;
    mission: string;
    visionTitle: string;
    vision: string;
    valuesTitle: string;
    values: string;
    valuesPills: string[];
  };
  servicesIntro: string;
  services: HomeService[];
  contact: {
    phones: string[];
    email: string;
    whatsapp: string;
    address: string;
    ctaTitle: string;
    ctaSubtitle: string;
  };
  eventIntro: string;
  eventTypes: HomeEventType[];
  clientLogos: HomeClientLogo[];
  newsItems: HomeNewsItem[];
}

const TEAM_PHOTO = (file: string) => `/INICIO/Equipa/${encodeURIComponent(file)}`;

const DEFAULT_TEAM_MEMBERS: HomeTeamMember[] = [
  {
    name: "Carlos Nhaca",
    role: "Director de Produção",
    image: TEAM_PHOTO("Captura de ecrã 2026-05-23, às 14.09.11.png"),
    social: {
      facebook: "https://www.facebook.com/profile.php?id=61577619669570",
      linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
      instagram: "https://www.instagram.com/",
    },
  },
  {
    name: "Miguel Tembe",
    role: "Especialista Audiovisual",
    image: TEAM_PHOTO("Captura de ecrã 2026-05-23, às 14.10.07.png"),
    social: {
      facebook: "https://www.facebook.com/profile.php?id=61577619669570",
      linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
      instagram: "https://www.instagram.com/",
    },
  },
  {
    name: "João Machava",
    role: "Gestor de Projectos",
    image: TEAM_PHOTO("Captura de ecrã 2026-05-23, às 14.10.43.png"),
    social: {
      facebook: "https://www.facebook.com/profile.php?id=61577619669570",
      linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
      instagram: "https://www.instagram.com/",
    },
  },
  {
    name: "Ana Mabunda",
    role: "Directora Criativa",
    image: TEAM_PHOTO("Captura de ecrã 2026-05-23, às 14.16.15.png"),
    social: {
      facebook: "https://www.facebook.com/profile.php?id=61577619669570",
      linkedin: "https://mz.linkedin.com/in/provisual-corporate-493342353",
      instagram: "https://www.instagram.com/",
    },
  },
];

export const TEAM_EQUIPA_FILES = DEFAULT_TEAM_MEMBERS.map((member) =>
  decodeURIComponent(member.image.split("/").pop() || ""),
);

function resolveTeamMemberImage(
  partialImage: string | undefined,
  defaultImage: string | undefined,
): string {
  if (!defaultImage?.includes("/INICIO/Equipa/")) {
    return partialImage || defaultImage || "";
  }

  const driveImage =
    partialImage?.startsWith("/api/drive/") || /^https?:\/\//i.test(partialImage || "")
      ? partialImage
      : null;

  if (import.meta.env.DEV) return defaultImage;
  return driveImage || defaultImage;
}

const DEFAULT_EVENT_TYPES: HomeEventType[] = [
  {
    title: "WORKSHOPS",
    description:
      "Cobertura de foto, vídeo, som e apoio técnico. Produção de conteúdos para comunicação e registo das actividades formativas.",
    image: "/INICIO/MMEC40-scaled.jpg",
  },
  {
    title: "FORMAÇÕES",
    description:
      "Cobertura técnica e audiovisual de formações, com captação de imagem e som, e conteúdos para relatórios ou divulgação.",
    image: "/INICIO/PAINEIS5-scaled.jpg",
  },
  {
    title: "EVENTOS INSTITUCIONAIS",
    description:
      "Registamos eventos com fotografia, vídeo, streaming e produção de conteúdos para promoção e arquivo.",
    image: "/INICIO/Coberturas.jpg",
  },
  {
    title: "TEAM BUILDINGS",
    description:
      "Cobertura de actividades de equipa, com fotos e vídeos dinâmicos que reforçam a cultura organizacional.",
    image: "/INICIO/COmunidade.jpg",
  },
];

const CLIENT_LOGO_FILES = [
  "Artboard-1.svg",
  "Artboard-2.svg",
  "Artboard-3.svg",
  "Artboard-4.svg",
  "Artboard-5.svg",
  "Artboard-6.svg",
  "Artboard-7.svg",
  "Artboard-8.svg",
  "Artboard-9.svg",
  "Artboard-10.svg",
  "Artboard-10-copy.svg",
  "Artboard-11.svg",
  "Artboard-15.svg",
  "Artboard-41.svg",
  "Artboard-44.svg",
  "AT.jpg",
];

const DEFAULT_CLIENT_LOGOS: HomeClientLogo[] = CLIENT_LOGO_FILES.map((file) => ({
  name: file.replace(/\.[^.]+$/, "").replace(/-/g, " "),
  image: `${SCRAPE_ASSETS}/${file}`,
}));

const DEFAULT_NEWS_ITEMS: HomeNewsItem[] = [
  {
    title:
      "Aníbal Mbalango desafia os Directores-Gerais a trabalharem em prol do interesse da organização",
    image: `${SCRAPE_ASSETS}/A70A8812-300x200.jpg`,
  },
  {
    title: "Ministério das Finanças e AT com nova liderança para reforçar a gestão pública",
    image: `${SCRAPE_ASSETS}/A70A8732-1-300x200.jpg`,
  },
  {
    title: "Formações corporativas ganham impacto com produção audiovisual da ProVisual",
    image: `${SCRAPE_ASSETS}/FIRST-PANEL-3-300x190.jpg`,
  },
];

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    eyebrow: "Nós somos",
    title: "ProVisual Corporate",
    tagline: "Entre qualidade e eficiência",
    ctaPrimary: "Iniciar",
    ctaSecondary: "Arquivo Provisual",
    backgroundImage: "/INICIO/Coberturas.jpg",
  },
  slides: [
    {
      category: "FOTOS CORPORATIVAS",
      title: "Presença, Estilo e Identidade",
      subtitle: "Gestão visual que reforça a imagem da sua organização.",
      image: "/INICIO/MMEC40-scaled.jpg",
    },
    {
      category: "VÍDEOS PUBLICITÁRIOS",
      title: "Marca, Visibilidade e Confiança",
      subtitle: "Comunicação estratégica para destacar-se no mercado.",
      image: "/INICIO/PAINEIS5-scaled.jpg",
    },
    {
      category: "VÍDEOS INSTITUCIONAIS",
      title: "Informação, Promoção e Vida",
      subtitle: "Conteúdos que conectam a sua marca ao público certo.",
      image: "/INICIO/Coberturas.jpg",
    },
    {
      category: "DOCUMENTÁRIOS",
      title: "Factos, histórias e arte",
      subtitle: "Produção criativa com impacto e narrativa autêntica.",
      image: "/INICIO/COmunidade.jpg",
    },
  ],
  aboutImage: "/INICIO/sobre.webp",
  processBackground: "/INICIO/producao-grafica.webp",
  teamBanner: "/INICIO/Coberturas.jpg",
  teamMembers: DEFAULT_TEAM_MEMBERS,
  about: {
    missionTitle: "Missão",
    mission:
      "Proporcionar soluções de comunicação eficientes e inovadoras, com foco na criação de conteúdos que agregam valor significativo aos nossos clientes.",
    visionTitle: "Visão",
    vision:
      "Ser referência nacional em produção de conteúdos criativos e estratégicos que fortalecem a presença das marcas em Moçambique.",
    valuesTitle: "Valores",
    values:
      "Foco nas experiências · Compromisso com eficiência e resultados · Inovação constante no digital e na criatividade.",
    valuesPills: ["Experiências", "Resultados", "Inovação"],
  },
  servicesIntro:
    "O nosso leque de soluções é aplicado de forma sistemática, com o objectivo de oferecer tudo o que a sua empresa precisa para se posicionar no mercado com excelência visual.",
  services: [
    {
      title: "Gestão de Ativos Visuais",
      subtitle: "Visual Asset Management",
      description:
        "Portal corporativo para organizar, partilhar e proteger todos os ficheiros da sua marca.",
      items: ["Arquivo digital", "Partilha segura", "Integração Google Drive", "IA assistiva"],
    },
    {
      title: "Publicidade e Marketing Digital",
      subtitle: "Advertising & Marketing",
      description: "Estratégias que ampliam o impacto da sua marca e envolvimento com clientes.",
      items: ["Planeamento estratégico", "Campanhas digitais", "Redes sociais", "Google Ads"],
    },
    {
      title: "Branding e Design Gráfico",
      subtitle: "Branding & Graphic Design",
      description: "Identidades visuais sólidas que materializam o propósito da sua empresa.",
      items: ["Identidade visual", "Manual de marca", "Embalagens", "Sinalização"],
    },
    {
      title: "Fotografia e Videografia",
      subtitle: "Photography & Videography",
      description: "Produção audiovisual profissional para eventos, activações e campanhas.",
      items: ["Eventos corporativos", "Drone", "Activação de marcas", "Feiras"],
    },
    {
      title: "Serviços Informáticos",
      subtitle: "IT Services",
      description: "Soluções digitais modernas para sites, lojas e aplicativos.",
      items: ["Sites institucionais", "E-commerce", "Apps móveis", "E-learning"],
    },
    {
      title: "Consultorias",
      subtitle: "Consulting",
      description: "Diagnóstico, plano e acompanhamento até à entrega de resultados.",
      items: ["Comunicação", "Planos de melhoria", "Acompanhamento", "Relatórios"],
    },
  ],
  contact: {
    phones: ["+258 86 30 76 065", "+258 85 51 13 215"],
    email: "info@provisualcorporate.co.mz",
    whatsapp: "258863076065",
    address: "Av. 24 de Julho esquina com Rua Francisco Matange nº 8, Maputo - Moçambique",
    ctaTitle: "Quer trabalhar connosco?",
    ctaSubtitle: "Todos juntos, somos criativos",
  },
  eventIntro:
    "Captamos narrativas visuais de elevado rigor e profundidade, concebidas para imortalizar factos, histórias e personagens com autenticidade e arte.",
  eventTypes: DEFAULT_EVENT_TYPES,
  clientLogos: DEFAULT_CLIENT_LOGOS,
  newsItems: DEFAULT_NEWS_ITEMS,
};

export function mergeHomeContent(partial?: Partial<HomeContent> | null): HomeContent {
  if (!partial) return DEFAULT_HOME_CONTENT;
  return {
    hero: { ...DEFAULT_HOME_CONTENT.hero, ...partial.hero },
    slides: partial.slides?.length
      ? partial.slides.map((slide, index) => ({
          ...DEFAULT_HOME_CONTENT.slides[index % DEFAULT_HOME_CONTENT.slides.length],
          ...slide,
          image:
            slide.image ||
            DEFAULT_HOME_CONTENT.slides[index % DEFAULT_HOME_CONTENT.slides.length]?.image,
        }))
      : DEFAULT_HOME_CONTENT.slides,
    aboutImage: partial.aboutImage || DEFAULT_HOME_CONTENT.aboutImage,
    processBackground: partial.processBackground || DEFAULT_HOME_CONTENT.processBackground,
    teamBanner: partial.teamBanner || DEFAULT_HOME_CONTENT.teamBanner,
    teamMembers: partial.teamMembers?.length
      ? partial.teamMembers.map((member, index) => {
          const fallback =
            DEFAULT_HOME_CONTENT.teamMembers[index % DEFAULT_HOME_CONTENT.teamMembers.length];
          return {
            ...fallback,
            ...member,
            name: fallback?.name || member.name || "",
            role: fallback?.role || member.role || "",
            image: resolveTeamMemberImage(member.image, fallback?.image),
            social: {
              ...fallback?.social,
              ...member.social,
            },
          };
        })
      : DEFAULT_HOME_CONTENT.teamMembers,
    about: { ...DEFAULT_HOME_CONTENT.about, ...partial.about },
    servicesIntro: partial.servicesIntro ?? DEFAULT_HOME_CONTENT.servicesIntro,
    services: partial.services?.length ? partial.services : DEFAULT_HOME_CONTENT.services,
    contact: { ...DEFAULT_HOME_CONTENT.contact, ...partial.contact },
    eventIntro: partial.eventIntro ?? DEFAULT_HOME_CONTENT.eventIntro,
    eventTypes: partial.eventTypes?.length
      ? partial.eventTypes.map((item, index) => ({
          ...DEFAULT_HOME_CONTENT.eventTypes[index % DEFAULT_HOME_CONTENT.eventTypes.length],
          ...item,
          image:
            item.image ||
            DEFAULT_HOME_CONTENT.eventTypes[index % DEFAULT_HOME_CONTENT.eventTypes.length]?.image,
        }))
      : DEFAULT_HOME_CONTENT.eventTypes,
    clientLogos: partial.clientLogos?.length
      ? partial.clientLogos.map((item, index) => ({
          ...DEFAULT_HOME_CONTENT.clientLogos[index % DEFAULT_HOME_CONTENT.clientLogos.length],
          ...item,
          image:
            item.image ||
            DEFAULT_HOME_CONTENT.clientLogos[index % DEFAULT_HOME_CONTENT.clientLogos.length]?.image,
        }))
      : DEFAULT_HOME_CONTENT.clientLogos,
    newsItems: partial.newsItems?.length
      ? partial.newsItems.map((item, index) => ({
          ...DEFAULT_HOME_CONTENT.newsItems[index % DEFAULT_HOME_CONTENT.newsItems.length],
          ...item,
          image:
            item.image ||
            DEFAULT_HOME_CONTENT.newsItems[index % DEFAULT_HOME_CONTENT.newsItems.length]?.image,
        }))
      : DEFAULT_HOME_CONTENT.newsItems,
  };
}
