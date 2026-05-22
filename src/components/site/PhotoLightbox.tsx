import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface PhotoLightboxProps {
  photos: string[];
  activeIndex: number;
  albumTitle: string;
  onClose: () => void;
  onChange: (index: number) => void;
}

export default function PhotoLightbox({
  photos,
  activeIndex,
  albumTitle,
  onClose,
  onChange,
}: PhotoLightboxProps) {
  const photo = photos[activeIndex];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < photos.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onChange(activeIndex - 1);
      if (e.key === "ArrowRight" && hasNext) onChange(activeIndex + 1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [activeIndex, hasPrev, hasNext, onChange, onClose]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 bg-black/85"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
        aria-label="Fechar imagem"
      >
        <X size={24} />
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(activeIndex - 1);
          }}
          className="absolute left-3 sm:left-6 z-10 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Imagem anterior"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(activeIndex + 1);
          }}
          className="absolute right-3 sm:right-6 z-10 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label="Imagem seguinte"
        >
          <ChevronRight size={28} />
        </button>
      )}

      <div
        className="relative w-full max-w-[960px] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden shadow-2xl bg-gray-900">
          <img
            src={photo}
            alt={`${albumTitle} ${activeIndex + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <p className="mt-3 text-white/70 text-sm">
          {activeIndex + 1} / {photos.length}
        </p>
      </div>
    </div>
  );
}
