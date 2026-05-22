import { useEffect, useState } from "react";
import { X } from "lucide-react";
import SiteShell from "./SiteShell";
import { VIDEO_ITEMS } from "../../lib/sitePages";
import { PAGE_BREADCRUMBS } from "../../lib/siteNav";

function youtubeEmbedUrl(id: string) {
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&controls=1&playsinline=1&cc_load_policy=1&iv_load_policy=3`;
}

function youtubeThumbnail(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export default function VideosPage() {
  const [activeYoutubeId, setActiveYoutubeId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeYoutubeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveYoutubeId(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [activeYoutubeId]);

  return (
    <SiteShell title="Vídeos" breadcrumbs={[...PAGE_BREADCRUMBS.videos]}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {VIDEO_ITEMS.map((video) => (
          <button
            key={video.slug}
            type="button"
            onClick={() => setActiveYoutubeId(video.youtubeId)}
            className="relative aspect-video rounded-xl overflow-hidden shadow-lg group text-left w-full"
            aria-label={`Reproduzir vídeo ${video.slug}`}
          >
            <img
              src={youtubeThumbnail(video.youtubeId)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors flex items-center justify-center">
              <span className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full border-2 border-white text-white bg-transparent flex items-center justify-center text-2xl group-hover:bg-[#a21b7e] group-hover:border-[#a21b7e] transition-colors duration-200">
                ▶
              </span>
            </div>
          </button>
        ))}
      </div>

      {activeYoutubeId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 bg-black/70"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveYoutubeId(null)}
        >
          <div
            className="relative w-full max-w-[1280px] bg-black rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full aspect-video bg-black">
              <iframe
                key={activeYoutubeId}
                title="Reprodutor de vídeo YouTube"
                src={youtubeEmbedUrl(activeYoutubeId)}
                className="block w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-end px-4 py-3 bg-[#111] border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveYoutubeId(null)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                aria-label="Fechar vídeo"
              >
                <X size={18} />
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteShell>
  );
}
