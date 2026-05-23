import { useEffect, useState } from "react";
import SiteShell from "./SiteShell";
import { GALLERY_ALBUMS } from "../../lib/sitePages";
import GalleryAlbumCard from "./GalleryAlbumCard";
import { fetchSiteGalleryAlbums } from "../../lib/siteGalleryApi";
import type { GalleryAlbum } from "../../lib/sitePages";

export default function GaleriaPage() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>(GALLERY_ALBUMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSiteGalleryAlbums()
      .then((data) => {
        if (active) setAlbums(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SiteShell
      title="Galeria"
      breadcrumbs={[{ label: "Início", href: "/" }, { label: "Galeria" }]}
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#a21b7e]/30 border-t-[#a21b7e] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {albums.map((album) => (
            <div key={album.slug}>
              <GalleryAlbumCard album={album} compact />
            </div>
          ))}
        </div>
      )}
    </SiteShell>
  );
}
