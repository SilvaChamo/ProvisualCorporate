import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createGalleryAlbum,
  deleteGalleryAlbum,
  fetchAdminGalleryAlbums,
  fetchAdminGalleryPhotos,
  syncSiteGalleryMeta,
  updateGalleryAlbum,
  type SiteDriveAlbum,
  type SiteDrivePhoto,
} from "../../lib/siteGalleryApi";
import { driveDisplayUrl } from "../../lib/driveImageUrl";
import type { AdminEditorHandle } from "./AdminEditorHandle";
import AdminListPagination, { ADMIN_LIST_PAGE_SIZE, paginateList } from "./AdminListPagination";

type FormMode = "hidden" | "add" | "edit";

type PendingPhoto = {
  key: string;
  file: File;
  preview: string;
};

function albumCoverUrl(album: SiteDriveAlbum) {
  if (album.image) return driveDisplayUrl(album.image, "sm");
  if (album.coverDriveId) {
    return `/api/drive/thumbnail?id=${encodeURIComponent(album.coverDriveId)}&sz=400`;
  }
  return album.coverUrl || "";
}

function photoPreviewUrl(photo: SiteDrivePhoto) {
  return driveDisplayUrl(photo.thumbnailUrl || photo.url, "sm");
}

export default forwardRef<AdminEditorHandle>(function AlbumsAdminTab(_props, ref) {
  const [albums, setAlbums] = useState<SiteDriveAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("hidden");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<SiteDrivePhoto[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [listPage, setListPage] = useState(0);

  const loadAlbums = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminGalleryAlbums();
      setAlbums(data);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar álbuns.");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, []);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(albums.length / ADMIN_LIST_PAGE_SIZE));
    if (listPage >= totalPages) setListPage(Math.max(0, totalPages - 1));
  }, [albums.length, listPage]);

  const paginatedAlbums = paginateList<SiteDriveAlbum>(albums, listPage);

  const resetForm = () => {
    pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    setFormMode("hidden");
    setEditingSlug(null);
    setTitle("");
    setSubtitle("");
    setCoverFile(null);
    setCoverPreview(null);
    setPendingPhotos([]);
    setExistingPhotos([]);
    setDeletedPhotoIds([]);
    setError(null);
  };

  const openAddForm = () => {
    resetForm();
    setFormMode("add");
  };

  const openEditForm = async (album: SiteDriveAlbum) => {
    resetForm();
    setFormMode("edit");
    setEditingSlug(album.slug);
    setTitle(album.title || album.name);
    setSubtitle(album.subtitle || "");
    setCoverPreview(albumCoverUrl(album) || null);
    setLoadingPhotos(true);
    try {
      const photos = await fetchAdminGalleryPhotos(album.slug);
      setExistingPhotos(photos);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar fotos do álbum.");
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const addPendingFiles = (files: File[]) => {
    const next = files.map((file) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingPhotos((prev) => [...prev, ...next]);
  };

  const handleBulkPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) addPendingFiles(files);
    e.target.value = "";
  };

  const removePendingPhoto = (key: string) => {
    setPendingPhotos((prev) => {
      const target = prev.find((photo) => photo.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((photo) => photo.key !== key);
    });
  };

  const markExistingPhotoDeleted = (photoId: string) => {
    setDeletedPhotoIds((prev) => (prev.includes(photoId) ? prev : [...prev, photoId]));
  };

  const visibleExistingPhotos = existingPhotos.filter((photo) => !deletedPhotoIds.includes(photo.id));

  const saveForm = async (): Promise<boolean> => {
    setError(null);

    if (!title.trim()) {
      setError("Indique o título do álbum.");
      return false;
    }
    if (formMode === "add" && !coverFile) {
      setError("Selecione a foto de capa do álbum.");
      return false;
    }

    setSaving(true);
    try {
      if (formMode === "add") {
        await createGalleryAlbum({
          title: title.trim(),
          subtitle: subtitle.trim(),
          cover: coverFile!,
          photos: pendingPhotos.map((photo) => photo.file),
        });
      } else if (formMode === "edit" && editingSlug) {
        await updateGalleryAlbum(editingSlug, {
          title: title.trim(),
          subtitle: subtitle.trim(),
          cover: coverFile,
          photos: pendingPhotos.map((photo) => photo.file),
          deletedPhotoIds,
        });
      } else {
        return false;
      }
      resetForm();
      await loadAlbums({ silent: true });
      return true;
    } catch (err: any) {
      setError(err.message || "Erro ao guardar álbum.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    isEditing: () => formMode !== "hidden",
    discard: resetForm,
    save: saveForm,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveForm();
  };

  const handleDelete = async (album: SiteDriveAlbum) => {
    const label = album.title || album.name;
    if (!window.confirm(`Eliminar o álbum "${label}"? Esta ação remove também a pasta no Google Drive.`)) {
      return;
    }
    setError(null);
    try {
      await deleteGalleryAlbum(album.slug);
      if (editingSlug === album.slug) resetForm();
      await loadAlbums();
    } catch (err: any) {
      setError(err.message || "Erro ao eliminar álbum.");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncSiteGalleryMeta();
      await loadAlbums();
    } catch (e: any) {
      setError(e.message || "Erro ao sincronizar galeria com o Drive.");
    } finally {
      setSyncing(false);
    }
  };

  const formView = (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="text-base font-bold text-gray-800">
          {formMode === "add" ? "Novo Álbum" : "Editar Álbum"}
        </h3>
        {formMode === "edit" && editingSlug && (
          <a
            href={`/galeria/${editingSlug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-[#a21b7e] inline-flex items-center gap-1"
          >
            <ExternalLink size={14} />
            Ver no site
          </a>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Foto de capa {formMode === "add" && <span className="text-red-500">*</span>}
          </label>
          <div className="flex items-start gap-4">
            <label className="relative w-28 h-28 border-2 border-dashed border-gray-200 hover:border-[#a21b7e] rounded-lg cursor-pointer overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 transition-shadow duration-200 hover:shadow-md">
              {coverPreview ? (
                <img src={coverPreview} alt="Capa" className="absolute inset-0 h-full w-full object-cover object-center" />
              ) : (
                <div className="text-center text-gray-400">
                  <Upload size={20} className="mx-auto" />
                  <span className="text-[10px] font-bold mt-1 block">Capa</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
            </label>
            <p className="text-xs text-gray-500 max-w-sm pt-2">
              {formMode === "edit"
                ? "Deixe em branco para manter a capa actual."
                : "Esta imagem aparece como capa do álbum no site."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Título do álbum
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: MMEC"
              className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm focus:border-[#a21b7e] outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              Descrição do álbum
            </label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Breve descrição que aparece no site"
              className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm focus:border-[#a21b7e] outline-none"
            />
          </div>
        </div>

        {(loadingPhotos || visibleExistingPhotos.length > 0 || pendingPhotos.length > 0) && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Fotos do álbum
            </p>
            {loadingPhotos ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-[#a21b7e]" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {visibleExistingPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group aspect-square overflow-hidden rounded-lg border border-gray-100 bg-gray-50 transition-all duration-200 hover:shadow-md hover:shadow-black/10 hover:border-[#a21b7e]/25"
                  >
                    <img
                      src={photoPreviewUrl(photo)}
                      alt={photo.name}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                    <button
                      type="button"
                      onClick={() => markExistingPhotoDeleted(photo.id)}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      Eliminar foto
                    </button>
                  </div>
                ))}
                {pendingPhotos.map((photo) => (
                  <div
                    key={photo.key}
                    className="relative group aspect-square overflow-hidden rounded-lg border border-[#a21b7e]/20 bg-gray-50 transition-all duration-200 hover:shadow-md hover:shadow-[#a21b7e]/15 hover:border-[#a21b7e]/40"
                  >
                    <img
                      src={photo.preview}
                      alt={photo.file.name}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#a21b7e] text-white text-[9px] font-bold">
                      Nova
                    </span>
                    <button
                      type="button"
                      onClick={() => removePendingPhoto(photo.key)}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      Eliminar foto
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <label className="inline-flex items-center justify-center gap-2 h-10 px-4 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:border-[#a21b7e]/40 cursor-pointer shrink-0">
            <Upload size={16} />
            Carregar fotos
            <input type="file" accept="image/*" multiple onChange={handleBulkPhotos} className="hidden" />
          </label>
          <button
            type="button"
            onClick={resetForm}
            className="h-10 px-4 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-bold transition-all cursor-pointer shrink-0"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-4 bg-[#a21b7e] hover:bg-[#8e176e] text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {formMode === "add" ? "Criar Álbum" : "Guardar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="space-y-6 min-h-[420px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Álbuns de Fotos</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie os álbuns publicados na página de galeria e sincronizados com o Google Drive.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {formMode === "hidden" && (
            <>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center justify-center gap-2 border border-gray-200 hover:border-[#a21b7e]/30 text-gray-700 px-4 py-2.5 rounded-md text-sm font-bold transition-all cursor-pointer h-10"
              >
                <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                Sincronizar Drive
              </button>
              <button
                type="button"
                onClick={openAddForm}
                className="flex items-center justify-center gap-2 bg-[#a21b7e] hover:bg-[#8e176e] text-white px-4 py-2.5 rounded-md text-sm font-bold shadow-sm transition-all cursor-pointer h-10"
              >
                <Plus size={16} />
                Adicionar Álbum
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {formMode !== "hidden" ? (
        formView
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[#a21b7e]" />
        </div>
      ) : albums.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 p-12 text-center text-gray-400 italic">
          Nenhum álbum cadastrado. Clique em &quot;Adicionar Álbum&quot; para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedAlbums.map((album) => {
            const cover = albumCoverUrl(album);
            return (
              <div
                key={album.slug}
                className="group bg-white rounded-lg border border-gray-100 shadow-sm flex items-stretch overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-[#a21b7e]/10 hover:border-[#a21b7e]/20"
              >
                <div className="relative w-20 shrink-0 self-stretch overflow-hidden bg-gray-100">
                  {cover ? (
                    <img
                      src={cover}
                      alt={album.title || album.name}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full min-h-[4.5rem] w-full items-center justify-center text-gray-300">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 min-w-0 items-center gap-3 py-2 pr-3 pl-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 truncate">{album.title || album.name}</h4>
                    <p className="text-sm text-gray-500 truncate">{album.subtitle || `${album.photoCount} fotos`}</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{album.photoCount} fotos</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/galeria/${album.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded hover:border-[#a21b7e]/30 hover:text-[#a21b7e] inline-flex items-center gap-1"
                  >
                    <ExternalLink size={14} />
                    Ver
                  </a>
                  <button
                    type="button"
                    onClick={() => openEditForm(album)}
                    className="px-3 py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded hover:border-[#a21b7e]/30 hover:text-[#a21b7e] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(album)}
                    className="px-3 py-2 text-xs font-bold text-red-600 border border-red-100 rounded hover:bg-red-50 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
                </div>
              </div>
            );
          })}
          <AdminListPagination
            page={listPage}
            totalItems={albums.length}
            onPageChange={setListPage}
          />
        </div>
      )}
    </div>
  );
});
