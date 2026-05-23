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
}

const DEFAULT_TEAM_MEMBERS: HomeTeamMember[] = [
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
      ? partial.teamMembers.map((member, index) => ({
          ...DEFAULT_HOME_CONTENT.teamMembers[index % DEFAULT_HOME_CONTENT.teamMembers.length],
          ...member,
          image:
            member.image ||
            DEFAULT_HOME_CONTENT.teamMembers[index % DEFAULT_HOME_CONTENT.teamMembers.length]?.image,
          social: {
            ...DEFAULT_HOME_CONTENT.teamMembers[index % DEFAULT_HOME_CONTENT.teamMembers.length]
              ?.social,
            ...member.social,
          },
        }))
      : DEFAULT_HOME_CONTENT.teamMembers,
    about: { ...DEFAULT_HOME_CONTENT.about, ...partial.about },
    servicesIntro: partial.servicesIntro ?? DEFAULT_HOME_CONTENT.servicesIntro,
    services: partial.services?.length ? partial.services : DEFAULT_HOME_CONTENT.services,
    contact: { ...DEFAULT_HOME_CONTENT.contact, ...partial.contact },
  };
}
