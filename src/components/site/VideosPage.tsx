import { useEffect, useState } from "react";
import { X } from "lucide-react";
import SiteShell from "./SiteShell";
import SiteYoutubePlayer from "./SiteYoutubePlayer";
import { VIDEO_ITEMS } from "../../lib/sitePages";
import { PAGE_BREADCRUMBS } from "../../lib/siteNav";
import { youtubeThumbnail } from "../../lib/youtubeEmbed";

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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {VIDEO_ITEMS.map((video) => (
          <button
            key={video.slug}
            type="button"
            onClick={() => setActiveYoutubeId(video.youtubeId)}
            className="group relative aspect-video w-full overflow-hidden rounded-xl text-left shadow-lg"
            aria-label={`Reproduzir vídeo ${video.slug}`}
          >
            <img
              src={youtubeThumbnail(video.youtubeId)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-transparent text-2xl text-white transition-colors duration-200 group-hover:border-[#a21b7e] group-hover:bg-[#a21b7e] sm:h-[4.5rem] sm:w-[4.5rem]">
                ▶
              </span>
            </div>
          </button>
        ))}
      </div>

      {activeYoutubeId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveYoutubeId(null)}
        >
          <div
            className="relative w-full max-w-[1280px] overflow-hidden rounded-xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SiteYoutubePlayer
              key={activeYoutubeId}
              videoId={activeYoutubeId}
              autoplay
              onMoreVideosClick={() => setActiveYoutubeId(null)}
            />
            <div className="flex items-center justify-end border-t border-white/10 bg-[#111] px-4 py-3">
              <button
                type="button"
                onClick={() => setActiveYoutubeId(null)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm text-white transition-colors hover:bg-white/20"
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
