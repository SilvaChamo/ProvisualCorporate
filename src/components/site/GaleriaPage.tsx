import SiteShell from "./SiteShell";
import { GALLERY_ALBUMS } from "../../lib/sitePages";
import GalleryAlbumCard from "./GalleryAlbumCard";

export default function GaleriaPage() {
  return (
    <SiteShell
      title="Galeria"
      breadcrumbs={[{ label: "Início", href: "/" }, { label: "Galeria" }]}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {GALLERY_ALBUMS.map((album) => (
          <div key={album.slug}>
            <GalleryAlbumCard album={album} compact />
          </div>
        ))}
      </div>
    </SiteShell>
  );
}
