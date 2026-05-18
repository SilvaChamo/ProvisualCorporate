import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Image as ImageIcon, Video, FileText, Download, Search,
  Grid, List as ListIcon, LogOut, FolderIcon, Eye, X, Folder,
  ChevronRight, Star, Clock, Bell, Package
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoHorizontal from "../Logo/logo_horizontal_clean.png";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ClientAsset {
  id: string;
  name: string;
  type: "image" | "video" | "document" | "folder";
  drive_id?: string;
  thumbnail_url?: string;
  folder_id?: string;
  starred?: boolean;
  upload_date?: string;
  versions?: { url: string; size: string; quality: string }[];
  client_id?: string;
  shared_with?: string[];
}

interface ClientFolder {
  id: string;
  name: string;
  parent_id?: string;
  client_id?: string;
  shared_with?: string[];
}

// ─── SafeImage ───────────────────────────────────────────────────────────────
function SafeImage({ driveId, thumbnailUrl, alt, className }: { driveId?: string; thumbnailUrl?: string; alt?: string; className?: string }) {
  const initial = driveId ? `/api/drive/thumbnail?id=${driveId}` : thumbnailUrl || "";
  const [src, setSrc] = useState(initial);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(driveId ? `/api/drive/thumbnail?id=${driveId}` : thumbnailUrl || "");
    setFailed(false);
  }, [driveId, thumbnailUrl]);

  const handleError = () => {
    if (!failed && driveId) {
      setFailed(true);
      setSrc(`https://drive.google.com/thumbnail?id=${driveId}&sz=w500`);
    }
  };

  if (!src) return null;
  return <img src={src} alt={alt} onError={handleError} className={className} />;
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ asset, onClose }: { asset: ClientAsset; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative max-w-5xl w-full h-[80vh] rounded-2xl overflow-hidden bg-[#111] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
        >
          <X size={18} />
        </button>
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {asset.type === "image" ? (
            <SafeImage
              driveId={asset.drive_id}
              thumbnailUrl={asset.thumbnail_url}
              alt={asset.name}
              className="max-w-full max-h-full object-contain"
            />
          ) : asset.versions?.[0]?.url ? (
            <iframe
              src={asset.versions[0].url.replace("/view", "/preview")}
              className="w-full h-full border-none"
              allow="autoplay"
            />
          ) : (
            <div className="text-gray-400 text-center">
              <FileText size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Pré-visualização indisponível</p>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 py-4 px-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-white">
          <span className="text-sm font-medium truncate max-w-[70%]">{asset.name}</span>
          {asset.versions?.[0]?.url && (
            <a
              href={`https://drive.google.com/uc?export=download&id=${asset.drive_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            >
              <Download size={13} /> Baixar
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Client Dashboard ────────────────────────────────────────────────────
export default function ClientDashboard() {
  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [folders, setFolders] = useState<ClientFolder[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"all" | "image" | "video" | "document" | "shared">("all");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewAsset, setPreviewAsset] = useState<ClientAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "O Meu Arquivo" }]);

  // Load user profile
  useEffect(() => {
    const localJson = localStorage.getItem("provisual_local_admin");
    if (localJson) {
      try {
        setUserProfile(JSON.parse(localJson));
      } catch {}
    } else if (auth.currentUser) {
      setUserProfile({ uid: auth.currentUser.uid, email: auth.currentUser.email, displayName: auth.currentUser.displayName });
    }
  }, []);

  // Load assets and folders for this client
  useEffect(() => {
    if (!userProfile) return;
    setLoading(true);

    const uid = userProfile.uid;
    const email = (userProfile.email || "").toLowerCase();

    // Listen to assets assigned to this client
    const assetsChannel = supabase
      .channel("client_assets")
      .on("postgres_changes", { event: "*", schema: "public", table: "assets" }, fetchData)
      .subscribe();

    const foldersChannel = supabase
      .channel("client_folders")
      .on("postgres_changes", { event: "*", schema: "public", table: "folders" }, fetchData)
      .subscribe();

    async function fetchData() {
      try {
        // Fetch assets where client_id matches OR shared_with contains uid
        const { data: assetData } = await supabase
          .from("assets")
          .select("*")
          .or(`client_id.eq.${uid},shared_with.cs.{${uid}}`);

        // Also fetch assets in folders shared with this client
        const { data: folderData } = await supabase
          .from("folders")
          .select("*")
          .or(`client_id.eq.${uid},shared_with.cs.{${uid}}`);

        const sharedFolderIds = (folderData || []).map((f: any) => f.id);

        let allAssets = [...(assetData || [])];

        if (sharedFolderIds.length > 0) {
          const { data: folderAssets } = await supabase
            .from("assets")
            .select("*")
            .in("folder_id", sharedFolderIds);
          
          const existingIds = new Set(allAssets.map((a: any) => a.id));
          (folderAssets || []).forEach((a: any) => {
            if (!existingIds.has(a.id)) allAssets.push(a);
          });
        }

        setAssets(allAssets.map((a: any) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          drive_id: a.drive_id,
          thumbnail_url: a.thumbnail_url,
          folder_id: a.folder_id,
          starred: a.starred,
          upload_date: a.upload_date,
          versions: a.versions,
          client_id: a.client_id,
          shared_with: a.shared_with,
        })));

        setFolders((folderData || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          parent_id: f.parent_id,
          client_id: f.client_id,
          shared_with: f.shared_with,
        })));
      } catch (err) {
        console.error("Erro ao carregar dados do cliente:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => {
      supabase.removeChannel(assetsChannel);
      supabase.removeChannel(foldersChannel);
    };
  }, [userProfile]);

  const filteredFolders = useMemo(() => {
    if (activeTab !== "all") return [];
    return folders.filter(f => (f.parent_id ?? null) === selectedFolderId);
  }, [folders, selectedFolderId, activeTab]);

  const filteredAssets = useMemo(() => {
    let result = assets.filter(a => !a.folder_id || a.folder_id === selectedFolderId);
    if (activeTab === "image") result = assets.filter(a => a.type === "image");
    else if (activeTab === "video") result = assets.filter(a => a.type === "video");
    else if (activeTab === "document") result = assets.filter(a => a.type === "document");
    else if (activeTab === "shared") result = assets.filter(a => a.shared_with && a.shared_with.length > 0);
    if (searchQuery) result = result.filter(a => a.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [assets, selectedFolderId, activeTab, searchQuery]);

  const handleFolderClick = (folder: ClientFolder) => {
    setSelectedFolderId(folder.id);
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumb = (item: { id: string | null; name: string }, idx: number) => {
    setSelectedFolderId(item.id);
    setBreadcrumb(prev => prev.slice(0, idx + 1));
  };

  const handleLogout = async () => {
    localStorage.removeItem("provisual_local_admin");
    try { await signOut(auth); } catch {}
    window.location.href = "/login";
  };

  const typeIcon = (type: string) => {
    if (type === "image") return <ImageIcon size={16} className="text-pink-400" />;
    if (type === "video") return <Video size={16} className="text-blue-400" />;
    return <FileText size={16} className="text-gray-400" />;
  };

  const navItems = [
    { id: "all", label: "O Meu Arquivo", icon: <Package size={18} /> },
    { id: "image", label: "Imagens", icon: <ImageIcon size={18} /> },
    { id: "video", label: "Vídeos", icon: <Video size={18} /> },
    { id: "document", label: "Documentos", icon: <FileText size={18} /> },
    { id: "shared", label: "Partilhados", icon: <Star size={18} /> },
  ];

  const displayName = userProfile?.displayName || userProfile?.email?.split("@")[0] || "Cliente";

  return (
    <div className="flex h-screen bg-[#f7f8fa] font-sans overflow-hidden">
      <AnimatePresence>
        {previewAsset && <PreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-50">
          <img src={logoHorizontal} alt="ProVisual" className="h-9 w-auto object-contain" />
          <div className="mt-4 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a21b7e] to-[#d14faa] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="leading-tight overflow-hidden">
              <p className="text-[12px] font-bold text-gray-800 truncate">{displayName}</p>
              <p className="text-[10px] text-gray-400 font-medium">Área de Cliente</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-black text-[#a21b7e] uppercase tracking-widest px-3 py-2 mt-1">Navegação</p>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setSelectedFolderId(null); setBreadcrumb([{ id: null, name: "O Meu Arquivo" }]); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all text-left ${
                activeTab === item.id
                  ? "bg-[#a21b7e]/10 text-[#a21b7e]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={activeTab === item.id ? "text-[#a21b7e]" : "text-gray-400"}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={16} /> Terminar Sessão
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-[13px] text-gray-400">
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight size={13} className="text-gray-300" />}
                <button
                  onClick={() => handleBreadcrumb(item, idx)}
                  className={`hover:text-[#a21b7e] transition-colors font-medium ${idx === breadcrumb.length - 1 ? "text-gray-700 font-semibold" : ""}`}
                >
                  {item.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar arquivos..."
                className="w-52 h-9 pl-9 pr-3 bg-gray-50 border border-gray-100 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#a21b7e]/40 transition-all"
              />
            </div>
            <div className="flex border border-gray-100 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("grid")} className={`p-2 transition-all ${viewMode === "grid" ? "bg-[#a21b7e] text-white" : "bg-white text-gray-400 hover:bg-gray-50"}`}><Grid size={15} /></button>
              <button onClick={() => setViewMode("list")} className={`p-2 transition-all ${viewMode === "list" ? "bg-[#a21b7e] text-white" : "bg-white text-gray-400 hover:bg-gray-50"}`}><ListIcon size={15} /></button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-10 h-10 border-3 border-[#a21b7e]/20 border-t-[#a21b7e] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">A carregar o seu arquivo...</p>
            </div>
          ) : filteredFolders.length === 0 && filteredAssets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full gap-4 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-[#a21b7e]/8 flex items-center justify-center">
                <Package size={36} className="text-[#a21b7e]/50" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-700">Arquivo vazio</h3>
                <p className="text-sm text-gray-400 mt-1">Nenhum conteúdo foi partilhado consigo ainda.</p>
                <p className="text-xs text-gray-300 mt-0.5">A sua equipa ProVisual irá partilhar conteúdo em breve.</p>
              </div>
            </motion.div>
          ) : viewMode === "grid" ? (
            <div className="space-y-6">
              {/* Folders */}
              {filteredFolders.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Pastas</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredFolders.map(folder => (
                      <motion.button
                        key={folder.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleFolderClick(folder)}
                        className="flex items-center gap-2.5 p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-left"
                      >
                        <Folder size={20} className="text-amber-400 shrink-0" />
                        <span className="text-[13px] font-semibold text-gray-700 truncate">{folder.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </section>
              )}

              {/* Assets */}
              {filteredAssets.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Ficheiros</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredAssets.map(asset => (
                      <motion.div
                        key={asset.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => setPreviewAsset(asset)}
                      >
                        <div className="aspect-square bg-gray-50 relative overflow-hidden flex items-center justify-center">
                          {(asset.type === "image" || asset.type === "video") && (asset.drive_id || asset.thumbnail_url) ? (
                            <SafeImage
                              driveId={asset.drive_id}
                              thumbnailUrl={asset.thumbnail_url}
                              alt={asset.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-300">
                              {typeIcon(asset.type)}
                              <span className="text-[10px] uppercase font-bold">{asset.type}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
                              <Eye size={15} className="text-[#a21b7e]" />
                            </div>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-[12px] font-semibold text-gray-700 truncate">{asset.name}</p>
                          {asset.upload_date && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {format(new Date(asset.upload_date), "dd MMM yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            // List View
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <div className="col-span-6">Nome</div>
                <div className="col-span-2">Tipo</div>
                <div className="col-span-2">Data</div>
                <div className="col-span-2 text-right">Ações</div>
              </div>
              {[...filteredFolders.map(f => ({ ...f, type: "folder" as const })), ...filteredAssets].map(item => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => "parent_id" in item ? handleFolderClick(item as ClientFolder) : setPreviewAsset(item as ClientAsset)}
                >
                  <div className="col-span-6 flex items-center gap-3">
                    {item.type === "folder" ? <Folder size={17} className="text-amber-400 shrink-0" /> : typeIcon(item.type)}
                    <span className="text-[13px] font-medium text-gray-700 truncate">{item.name}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-gray-400 capitalize">{item.type}</span>
                  </div>
                  <div className="col-span-2">
                    {"upload_date" in item && item.upload_date ? (
                      <span className="text-[11px] text-gray-400">
                        {format(new Date(item.upload_date), "dd/MM/yyyy")}
                      </span>
                    ) : <span className="text-[11px] text-gray-300">—</span>}
                  </div>
                  <div className="col-span-2 flex justify-end">
                    {item.type !== "folder" && (
                      <button
                        onClick={e => { e.stopPropagation(); setPreviewAsset(item as ClientAsset); }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-[#a21b7e] hover:bg-[#a21b7e]/5 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Eye size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
