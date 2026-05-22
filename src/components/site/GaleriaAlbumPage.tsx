import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SiteShell from "./SiteShell";
import { GALLERY_ALBUMS } from "../../lib/sitePages";
import { getGalleryPhotos } from "../../lib/galleryPhotos";
import GalleryAlbumCarousel from "./GalleryAlbumCarousel";
import PhotoLightbox from "./PhotoLightbox";

const COLS = 4;
const ROWS = 6;
const PHOTOS_PER_PAGE = COLS * ROWS;

export default function GaleriaAlbumPage() {
  const { slug } = useParams();
  const album = GALLERY_ALBUMS.find((a) => a.slug === slug);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  if (!album) {
    return (
      <SiteShell
        title="Galeria"
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Galeria", href: "/galeria" }, { label: "Álbum" }]}
      >
        <p className="text-center text-gray-500">Álbum não encontrado.</p>
        <p className="text-center mt-4">
          <Link to="/galeria" className="text-[#a21b7e] hover:underline">
            Voltar à galeria
          </Link>
        </p>
      </SiteShell>
    );
  }

  const photos = getGalleryPhotos(album.slug, album.image);
  const related = GALLERY_ALBUMS.filter((a) => a.slug !== album.slug);
  const totalPages = Math.max(1, Math.ceil(photos.length / PHOTOS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PHOTOS_PER_PAGE;
  const pagePhotos = photos.slice(start, start + PHOTOS_PER_PAGE);

  return (
    <SiteShell
      title="Galeria"
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Galeria", href: "/galeria" },
      ]}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {pagePhotos.map((photo, index) => {
          const globalIndex = start + index;
          return (
            <button
              key={`${photo}-${globalIndex}`}
              type="button"
              onClick={() => setLightboxIndex(globalIndex)}
              className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-md bg-gray-100 group text-left w-full"
              aria-label={`Ver imagem ${globalIndex + 1} de ${album.title}`}
            >
              <img
                src={photo}
                alt={`${album.title} ${globalIndex + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap items-center justify-center gap-2 mb-12"
          aria-label="Paginação de fotos"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:border-[#a21b7e] hover:text-[#a21b7e] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={safePage === n ? "page" : undefined}
              className={`min-w-[2.5rem] h-10 px-3 text-sm rounded-lg border transition-colors ${
                safePage === n
                  ? "bg-[#a21b7e] border-[#a21b7e] text-white"
                  : "border-gray-200 text-gray-700 hover:border-[#a21b7e] hover:text-[#a21b7e]"
              }`}
            >
              {n}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:border-[#a21b7e] hover:text-[#a21b7e] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Seguinte
            <ChevronRight size={16} />
          </button>
        </nav>
      )}

      <section className="w-screen relative left-1/2 -translate-x-1/2 bg-[#f5f5f5] py-10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 text-left">Ver mais álbuns</h2>
          <GalleryAlbumCarousel albums={related} />
        </div>
      </section>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          activeIndex={lightboxIndex}
          albumTitle={album.title}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </SiteShell>
  );
}
