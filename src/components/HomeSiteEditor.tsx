import React, { useEffect, useState } from "react";
import { Globe, Save, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";
import {
  DEFAULT_HOME_CONTENT,
  mergeHomeContent,
  type HomeContent,
} from "../lib/homeContent";

async function fetchHomeContent(): Promise<HomeContent> {
  const res = await fetch("/api/site/home");
  if (!res.ok) throw new Error("Não foi possível carregar o conteúdo.");
  const data = await res.json();
  return mergeHomeContent(data.content);
}

export default function HomeSiteEditor() {
  const [content, setContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      setContent(await fetchHomeContent());
    } catch (e: any) {
      setMessage({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/site/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao guardar.");
      }
      setMessage({ type: "ok", text: "Página inicial actualizada com sucesso." });
    } catch (e: any) {
      setMessage({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field: keyof HomeContent["hero"], value: string) => {
    setContent((c) => ({ ...c, hero: { ...c.hero, [field]: value } }));
  };

  const updateAbout = (field: keyof HomeContent["about"], value: string | string[]) => {
    setContent((c) => ({ ...c, about: { ...c.about, [field]: value } }));
  };

  const updateContact = (field: keyof HomeContent["contact"], value: string | string[]) => {
    setContent((c) => ({ ...c, contact: { ...c.contact, [field]: value } }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#a21b7e]/30 border-t-[#a21b7e] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Globe className="text-[#a21b7e]" size={24} />
              Página Inicial do Site
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Edite os textos e contactos exibidos em{" "}
              <a href="/" target="_blank" rel="noopener noreferrer" className="text-[#a21b7e] font-bold inline-flex items-center gap-1">
                provisualcorporate.co.mz <ExternalLink size={12} />
              </a>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={load}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-md text-sm font-bold text-gray-600 hover:border-[#a21b7e]/40"
            >
              <RefreshCw size={16} />
              Recarregar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 bg-[#a21b7e] hover:bg-[#8e176e] text-white px-4 py-2.5 rounded-md text-sm font-bold shadow-sm",
                saving && "opacity-70"
              )}
            >
              <Save size={16} />
              {saving ? "A guardar..." : "Guardar alterações"}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={cn(
              "p-4 rounded-lg text-sm font-bold border",
              message.type === "ok"
                ? "bg-green-50 text-green-700 border-green-100"
                : "bg-red-50 text-red-700 border-red-100"
            )}
          >
            {message.text}
          </div>
        )}

        <section className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-[#a21b7e] uppercase tracking-widest">Hero</h3>
          {(
            [
              ["eyebrow", "Linha superior (ex: Nós somos)"],
              ["title", "Título principal"],
              ["tagline", "Subtítulo"],
              ["ctaPrimary", "Botão principal"],
              ["ctaSecondary", "Botão secundário"],
              ["backgroundImage", "URL da imagem de fundo"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                {label}
              </label>
              <input
                value={content.hero[key]}
                onChange={(e) => updateHero(key, e.target.value)}
                className="w-full h-11 px-3 border border-gray-100 rounded-lg text-sm focus:border-[#a21b7e] outline-none"
              />
            </div>
          ))}
        </section>

        <section className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-[#a21b7e] uppercase tracking-widest">Sobre nós</h3>
          {(
            [
              ["missionTitle", "Título missão"],
              ["mission", "Texto missão"],
              ["visionTitle", "Título visão"],
              ["vision", "Texto visão"],
              ["valuesTitle", "Título valores"],
              ["values", "Texto valores"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                {label}
              </label>
              <textarea
                value={content.about[key]}
                onChange={(e) => updateAbout(key, e.target.value)}
                rows={key.includes("mission") || key.includes("vision") || key === "values" ? 3 : 1}
                className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:border-[#a21b7e] outline-none resize-none"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Pilares (separados por vírgula)
            </label>
            <input
              value={content.about.valuesPills.join(", ")}
              onChange={(e) =>
                updateAbout(
                  "valuesPills",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              className="w-full h-11 px-3 border border-gray-100 rounded-lg text-sm focus:border-[#a21b7e] outline-none"
            />
          </div>
        </section>

        <section className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-[#a21b7e] uppercase tracking-widest">Contactos</h3>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Telefones (um por linha)
            </label>
            <textarea
              value={content.contact.phones.join("\n")}
              onChange={(e) =>
                updateContact(
                  "phones",
                  e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                )
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:border-[#a21b7e] outline-none resize-none"
            />
          </div>
          {(
            [
              ["email", "Email"],
              ["whatsapp", "WhatsApp (apenas números)"],
              ["address", "Endereço"],
              ["ctaTitle", "Título CTA contactos"],
              ["ctaSubtitle", "Subtítulo CTA"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                {label}
              </label>
              <input
                value={content.contact[key] as string}
                onChange={(e) => updateContact(key, e.target.value)}
                className="w-full h-11 px-3 border border-gray-100 rounded-lg text-sm focus:border-[#a21b7e] outline-none"
              />
            </div>
          ))}
        </section>

        <section className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-[#a21b7e] uppercase tracking-widest">
            Introdução serviços
          </h3>
          <textarea
            value={content.servicesIntro}
            onChange={(e) => setContent((c) => ({ ...c, servicesIntro: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm focus:border-[#a21b7e] outline-none resize-none"
          />
        </section>

        <p className="text-xs text-gray-400 text-center pb-8">
          Os slides do hero e a lista completa de serviços usam os valores por defeito até expansão do editor.
          As alterações acima reflectem-se imediatamente na página em / após guardar.
        </p>
      </div>
    </div>
  );
}
