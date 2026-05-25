import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Download, Plus, Square } from "lucide-react";
import { format } from "date-fns";
import { motion } from "motion/react";
import { displayDriveName } from "../lib/utils";
import { extractDriveFileId } from "../lib/driveImageUrl";
import { getDrivePreviewUrl, triggerDriveDownload, triggerFileDownload } from "../lib/driveDownload";

export interface PreviewItem {
  id: string;
  name: string;
  type: "image" | "video" | "document" | "folder";
  driveId?: string;
  thumbnailUrl?: string;
  srcUrl?: string;
  webViewLink?: string;
  captureDate?: Date;
  size?: string;
  versions?: { size?: string; url?: string }[];
}

export interface PreviewSelectionActions {
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAllVisible: () => void;
  onSelectAllImages: () => void;
  onClear: () => void;
}

interface PhotoPreviewModalProps {
  items: PreviewItem[];
  activeIndex: number;
  onClose: () => void;
  onChange: (index: number) => void;
  contextLabel?: string;
  selection?: PreviewSelectionActions;
}

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  item: PreviewItem;
}

function SafeImage({ item, alt, className, ...props }: SafeImageProps) {
  const driveId = item.driveId || (item.srcUrl ? extractDriveFileId(item.srcUrl) : null);
  const initialUrl = driveId
    ? `/api/drive/media?id=${encodeURIComponent(driveId)}`
    : item.srcUrl || item.thumbnailUrl?.replace("=s220", "=s1200") || "";
  const [src, setSrc] = useState(initialUrl);
  const [failStep, setFailStep] = useState(0);

  useEffect(() => {
    const nextDriveId = item.driveId || (item.srcUrl ? extractDriveFileId(item.srcUrl) : null);
    const nextUrl = nextDriveId
      ? `/api/drive/media?id=${encodeURIComponent(nextDriveId)}`
      : item.srcUrl || item.thumbnailUrl?.replace("=s220", "=s1200") || "";
    setSrc(nextUrl);
    setFailStep(0);
  }, [item.id, item.driveId, item.srcUrl, item.thumbnailUrl]);

  const handleError = () => {
    const resolvedDriveId = item.driveId || (item.srcUrl ? extractDriveFileId(item.srcUrl) : null);
    if (failStep === 0 && resolvedDriveId) {
      setFailStep(1);
      setSrc(`/api/drive/thumbnail?id=${encodeURIComponent(resolvedDriveId)}&sz=1200`);
      return;
    }
    if (failStep === 1 && resolvedDriveId) {
      setFailStep(2);
      setSrc(`https://drive.google.com/thumbnail?id=${resolvedDriveId}&sz=w1200`);
      return;
    }
    if (failStep === 2 && item.srcUrl && src !== item.srcUrl) {
      setFailStep(3);
      setSrc(item.srcUrl);
    }
  };

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={handleError}
      className={className}
      decoding="async"
      {...props}
    />
  );
}

function buildMetaText(item: PreviewItem, index: number, total: number, contextLabel?: string) {
  const extension = item.name.includes(".") ? item.name.split(".").pop() : "";
  const nameWithoutExt = item.name.includes(".")
    ? item.name.substring(0, item.name.lastIndexOf("."))
    : item.name;
  const capitalizedType = item.type.charAt(0).toUpperCase() + item.type.slice(1);
  const formatDisplay = extension ? `${capitalizedType}.${extension.toLowerCase()}` : capitalizedType;
  const sizeDisplay = item.size || item.versions?.[0]?.size || "";
  const dateDisplay = item.captureDate ? format(item.captureDate, "dd/MM/yyyy") : "";
  const parts = [formatDisplay, sizeDisplay, nameWithoutExt, contextLabel, dateDisplay, `${index + 1} / ${total}`]
    .filter(Boolean);
  return parts.join(" | ");
}

function resolveDriveFileId(item: PreviewItem): string | null {
  if (item.driveId && !item.driveId.startsWith("local-")) {
    return item.driveId;
  }
  if (item.srcUrl) {
    const fromSrc = extractDriveFileId(item.srcUrl);
    if (fromSrc) return fromSrc;
  }
  const fallbackUrl = item.versions?.[0]?.url || item.webViewLink || "";
  if (fallbackUrl.includes("drive.google.com")) {
    const matchId =
      fallbackUrl.match(/id=([^&]+)/) || fallbackUrl.match(/\/file\/d\/([^/]+)/);
    return matchId?.[1] || null;
  }
  return null;
}

function handleDownload(item: PreviewItem) {
  const driveId = resolveDriveFileId(item);
  if (driveId) {
    triggerDriveDownload(driveId, item.name);
    return;
  }

  const staticUrl = item.srcUrl || item.versions?.[0]?.url || item.webViewLink;
  if (staticUrl) {
    triggerFileDownload(staticUrl, item.name);
  }
}

function PreviewSelectionMenu({ selection }: { selection: PreviewSelectionActions }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const count = selection.selectedIds.length;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer select-none border border-white/10"
      >
        {count > 0 && (
          <span className="min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-[#a21b7e] text-[10px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
        Selecionar
        <ChevronDown size={12} className="opacity-70" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#1e1f20] border border-white/10 shadow-2xl rounded-md py-1 z-40 text-left">
          <div className="px-3 py-1.5 text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
            Selecção em massa
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              selection.onSelectAllVisible();
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs font-bold text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Selecionar todas visíveis
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              selection.onSelectAllImages();
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs font-bold text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Selecionar todas as imagens
          </button>
          <div className="my-1 border-t border-white/5" />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              selection.onClear();
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs font-bold text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Limpar seleção
          </button>
        </div>
      )}
    </div>
  );
}

export default function PhotoPreviewModal({
  items,
  activeIndex,
  onClose,
  onChange,
  contextLabel,
  selection,
}: PhotoPreviewModalProps) {
  const item = items[activeIndex];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < items.length - 1;
  const showNav = items.length > 1;
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrev) onChange(activeIndex - 1);
      if (event.key === "ArrowRight" && hasNext) onChange(activeIndex + 1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [activeIndex, hasPrev, hasNext, onChange, onClose]);

  if (!item) return null;

  const isCurrentSelected = selection ? selection.selectedIds.includes(item.id) : false;
  const metaText = buildMetaText(item, activeIndex, items.length, contextLabel);
  const previewSrc = item.type === "image" ? null : getDrivePreviewUrl(item);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#18191a] max-w-4xl w-full h-[75vh] md:h-[70vh] rounded-[10px] overflow-hidden flex flex-col shadow-2xl relative border border-white/5"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/15 cursor-pointer shadow-md hover:scale-105"
          aria-label="Fechar"
        >
          <Plus className="rotate-45" size={20} />
        </button>

        {showNav && hasPrev && (
          <button
            type="button"
            onClick={() => onChange(activeIndex - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/15 cursor-pointer shadow-md"
            aria-label="Imagem anterior"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {showNav && hasNext && (
          <button
            type="button"
            onClick={() => onChange(activeIndex + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/15 cursor-pointer shadow-md"
            aria-label="Imagem seguinte"
          >
            <ChevronRight size={22} />
          </button>
        )}

        <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center relative overflow-hidden w-full h-full">
          {item.type === "image" ? (
            <SafeImage
              item={item}
              className="max-w-full max-h-full w-auto h-auto object-contain"
              alt={displayDriveName(item.name)}
            />
          ) : previewSrc ? (
            <iframe
              src={previewSrc}
              title={displayDriveName(item.name)}
              className="w-full h-full border-none bg-white"
              allow="autoplay"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-gray-400">
              <Plus className="rotate-45" size={48} />
              <p className="text-sm font-bold uppercase tracking-widest">Visualização indisponível</p>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 inset-x-0 pt-16 pb-5 px-6 bg-gradient-to-t from-black/95 via-black/70 to-black/0 flex items-center justify-between gap-4 text-white z-20 rounded-b-[10px]">
          <div className="flex items-center min-w-0 flex-1 text-left">
            <span className="text-xs md:text-sm font-medium text-white tracking-normal select-text truncate">
              {metaText}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selection && item.type === "image" && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    selection.onToggle(item.id);
                  }}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer select-none border border-white/10"
                >
                  {isCurrentSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  {isCurrentSelected ? "Selecionada" : "Selecionar"}
                </button>
                <PreviewSelectionMenu selection={selection} />
                {selection.selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      selection.onClear();
                    }}
                    className="flex items-center gap-1.5 bg-transparent hover:text-[#a21b7e] text-white/90 px-2 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer select-none"
                  >
                    Limpar seleção
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              disabled={downloading}
              onClick={(event) => {
                event.stopPropagation();
                setDownloading(true);
                handleDownload(item);
                window.setTimeout(() => setDownloading(false), 1200);
              }}
              className="flex items-center gap-1.5 bg-transparent hover:text-[#a21b7e] text-white px-2 py-1.5 rounded-none text-xs font-bold transition-all cursor-pointer select-none border-none shadow-none disabled:opacity-60"
            >
              <Download size={14} />
              <span>{downloading ? "A transferir..." : "Baixar"}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
