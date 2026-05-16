import React, { useState, useMemo, useEffect } from "react";
import {
  Folder as FolderIcon,
  FileText,
  Image as ImageIcon,
  Video,
  Search,
  Grid,
  List as ListIcon,
  ChevronRight,
  Clock,
  HardDrive,
  Download,
  Filter,
  MoreVertical,
  LayoutGrid,
  FolderPlus,
  Share2,
  Trash2,
  Plus,
  ArrowBigUpDash,
  LogOut,
  BarChart3,
  Upload,
  FileUp,
  FolderUp,
  ChevronDown,
  Users,
  Star,
  Cloud
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, handleFirestoreError, OperationType } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, storage } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, addDoc, getDoc, doc, updateDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useRef } from "react";

// Types
interface AssetVersion {
  quality: "low" | "high" | "original";
  size: string;
  url: string;
}

interface Asset {
  id: string;
  name: string;
  type: "image" | "video" | "document" | "folder";
  captureDate: Date;
  uploadDate: Date;
  versions: AssetVersion[];
  folderId: string;
  ownerId?: string;
  driveId?: string;
  thumbnailUrl?: string;
}

// Componente do Visualizador Interno
function FilePreviewModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const url = asset.versions[0]?.url;
  // Converter link de visualização para link de incorporação (embed)
  const embedUrl = url ? url.replace('/view', '/preview') : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full h-full overflow-hidden flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-sm text-gray-800 truncate max-w-md">{asset.name}</h3>
            <span className="text-[10px] font-bold text-[#a21b7e] bg-[#a21b7e]/10 px-2 py-0.5 uppercase">{asset.type}</span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <Plus className="rotate-45" size={24} />
          </button>
        </div>

        <div className="flex-1 bg-gray-50 flex items-center justify-center relative overflow-hidden">
          {asset.type === 'image' ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={asset.thumbnailUrl ? asset.thumbnailUrl.replace('=s220', '=s1200') : `https://drive.google.com/thumbnail?id=${asset.driveId}&sz=w1200`}
                className="max-w-full max-h-full object-contain shadow-2xl"
                alt={asset.name}
              />
            </div>
          ) : asset.versions?.[0]?.url ? (
            <iframe
              src={asset.versions[0].url.includes('drive.google.com')
                ? asset.versions[0].url.replace('/view', '/preview')
                : asset.versions[0].url}
              className="w-full h-full border-none"
              allow="autoplay"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-gray-400">
              <Plus className="rotate-45" size={48} />
              <p className="text-sm font-bold uppercase tracking-widest">Visualização indisponível</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface FolderData {
  id: string;
  name: string;
  date: Date;
}

interface UserProfile {
  role: "admin" | "cliente";
  email: string;
}

export default function Dashboard() {
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'document' | 'other' | 'google_drive'>('all');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid"); // Grelha por padrão
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [driveFilterType, setDriveFilterType] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<{ limit: string; usage: string } | null>(null);
  const [activeFolderMenuId, setActiveFolderMenuId] = useState<string | null>(null);

  // Grelha de 5 colunas como padrão para tudo
  useEffect(() => {
    setViewMode('grid');
  }, [activeTab]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Folder Creation
  const handleCreateFolder = async () => {
    const folderName = prompt("Digite o nome da nova pasta:");
    if (!folderName) return;

    try {
      await addDoc(collection(db, "folders"), {
        name: folderName,
        date: serverTimestamp(),
        ownerId: auth.currentUser?.uid || "mock-admin",
        parentId: selectedFolderId
      });
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
    }
  };

  // Auth logout
  const handleLogout = async () => { signOut(auth); };

  // Trigger File Input
  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderId", '1RqKUJs3NsX8glAqnQmKQPf5Pm_0BuZlp');

        const response = await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error(`Erro ao carregar ${file.name}`);

        const driveFile = await response.json();

        // Determinar tipo
        const isFolder = driveFile.mimeType === 'application/vnd.google-apps.folder';
        const extension = driveFile.name.split('.').pop()?.toLowerCase() || '';
        const isRaw = ['cr2', 'cr3', 'nef', 'arw', 'dng', 'raf', 'orf'].includes(extension);

        const fileType = isFolder ? 'folder' : (driveFile.mimeType.includes('image') || isRaw ? 'image' : (driveFile.mimeType.includes('video') ? 'video' : 'document'));
        const fileSize = driveFile.size ? `${(parseInt(driveFile.size) / 1024 / 1024).toFixed(1)} MB` : '0 MB';

        await addDoc(collection(db, "assets"), {
          name: driveFile.name,
          type: fileType,
          captureDate: Timestamp.fromDate(new Date(driveFile.createdTime)),
          uploadDate: serverTimestamp(),
          folderId: selectedFolderId,
          ownerId: "google-drive",
          driveId: driveFile.id,
          thumbnailUrl: driveFile.thumbnailLink || "",
          versions: [{
            quality: "original",
            size: fileSize,
            url: driveFile.webViewLink
          }]
        });

        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      alert("Upload concluído com sucesso!");
    } catch (error: any) {
      console.error(error);
      alert("Erro no upload: " + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGoogleSync = async (targetFolderId?: string, filterType?: string) => {
    const folderId = targetFolderId || 'root';
    setActiveTab('google_drive');
    setDriveFilterType(filterType || null);
    setSelectedFolderId(folderId === 'root' ? null : folderId);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const response = await fetch('/api/drive/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, filterType })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao conectar com Google Drive');
      }

      const driveFiles = await response.json();
      setUploadProgress(50);

      // Converter arquivos do Drive para o formato do nosso sistema
      for (const file of driveFiles) {
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const isRaw = ['cr2', 'cr3', 'nef', 'arw', 'dng', 'raf', 'orf'].includes(extension);

        const fileType = isFolder ? 'folder' : (file.mimeType.includes('image') || isRaw ? 'image' : (file.mimeType.includes('video') ? 'video' : 'document'));
        const fileSize = file.size ? `${(parseInt(file.size) / 1024 / 1024).toFixed(1)} MB` : (isFolder ? '-' : '0 MB');

        if (isFolder) {
          // Salvar pasta no Firestore com o mesmo ID do Drive
          await setDoc(doc(db, "folders", file.id), {
            name: file.name,
            date: file.createdTime ? Timestamp.fromDate(new Date(file.createdTime)) : serverTimestamp(),
            ownerId: "google-drive",
            parentId: folderId === 'root' ? null : folderId
          });
        }

        const existing = assets.find(a => a.driveId === file.id || (a.name === file.name && a.folderId === folderId));
        const assetData = {
          name: file.name,
          type: fileType,
          captureDate: file.createdTime ? Timestamp.fromDate(new Date(file.createdTime)) : serverTimestamp(),
          uploadDate: serverTimestamp(),
          folderId: folderId,
          ownerId: "google-drive",
          driveId: file.id,
          thumbnailUrl: file.thumbnailLink || "",
          versions: [{
            quality: "original",
            size: fileSize,
            url: file.webViewLink
          }]
        };

        if (!isFolder) {
          if (existing) {
            await updateDoc(doc(db, "assets", existing.id), assetData);
          } else {
            await addDoc(collection(db, "assets"), assetData);
          }
        }
      }

      setUploadProgress(100);
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); }, 1000);
    } catch (error: any) {
      console.error("Sync Error:", error);
      alert("Erro na Sincronização: " + error.message);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Fetch User Role
  useEffect(() => {
    if (!auth.currentUser) {
      setUserProfile({
        role: "admin",
        email: "admin@provisual.demo"
      });
      return;
    }
    const fetchProfile = async () => {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser!.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    };
    fetchProfile();
  }, []);

  // Fetch Folders
  useEffect(() => {
    const q = query(collection(db, "folders"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const folderList = snapshot.docs.map(doc => {
        const data = doc.data();
        let folderDate = new Date();
        if (data.date && typeof data.date.toDate === 'function') folderDate = data.date.toDate();
        return { id: doc.id, ...data, date: folderDate } as FolderData;
      });
      setFolders(folderList.sort((a, b) => b.date.getTime() - a.date.getTime()));
    });
    return () => unsubscribe();
  }, []);

  // Fetch Assets
  useEffect(() => {
    const q = query(collection(db, "assets"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assetList = snapshot.docs.map(doc => {
        const data = doc.data();
        let capDate = new Date();
        let upDate = new Date();
        if (data.captureDate && typeof data.captureDate.toDate === 'function') capDate = data.captureDate.toDate();
        if (data.uploadDate && typeof data.uploadDate.toDate === 'function') upDate = data.uploadDate.toDate();
        return { id: doc.id, ...data, captureDate: capDate, uploadDate: upDate } as Asset;
      });
      setAssets(assetList);
    });
    return () => unsubscribe();
  }, []);

  // Test Storage Connection
  useEffect(() => {
    console.log("Tentando conectar ao bucket:", storage.app.options.storageBucket);
  }, []);

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const res = await fetch('/api/drive/storage');
        if (res.ok) {
          const data = await res.json();
          setStorageQuota(data);
        }
      } catch (e) {
        console.error("Storage fetch error:", e);
      }
    };
    fetchStorage();

    // Sincronização silenciosa automática das pastas raiz do Google Drive ao iniciar
    const syncRootFolders = async () => {
      try {
        const response = await fetch('/api/drive/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: 'root' })
        });
        if (response.ok) {
          const driveFiles = await response.json();
          for (const file of driveFiles) {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            if (isFolder) {
              await setDoc(doc(db, "folders", file.id), {
                name: file.name,
                date: file.createdTime ? Timestamp.fromDate(new Date(file.createdTime)) : serverTimestamp(),
                ownerId: "google-drive",
                parentId: null
              });
            }
          }
        }
      } catch (error) {
        console.error("Erro na sincronização silenciosa inicial de pastas:", error);
      }
    };
    syncRootFolders();
  }, []);

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (selectedFolderId) {
      // Se for uma pasta do Google Drive, o ID dela no Firestore será o ID do Google
      result = result.filter(a => a.folderId === selectedFolderId);
    } else if (activeTab === 'google_drive') {
      // Mostrar apenas o que veio do Google Drive
      result = result.filter(a => (a as any).ownerId === 'google-drive');
    } else if (activeTab !== 'all') {
      result = result.filter(a => a.type === activeTab);
    }
    if (searchQuery) {
      result = result.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [selectedFolderId, activeTab, searchQuery, assets]);

  const storageInfo = useMemo(() => {
    if (!storageQuota) {
      return { limit: "100.00 GB", usage: "57.63 GB", percent: 57 };
    }
    const limit = parseInt(storageQuota.limit);
    const usage = parseInt(storageQuota.usage);
    const limitGB = (limit / 1024 / 1024 / 1024).toFixed(2);
    const usageGB = (usage / 1024 / 1024 / 1024).toFixed(2);
    const percent = Math.min(100, Math.round((usage / limit) * 100));
    return { limit: `${limitGB} GB`, usage: `${usageGB} GB`, percent };
  }, [storageQuota]);

  return (
    <div className="flex h-screen bg-[#fafafa] text-gray-800 font-sans overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#a21b7e] flex items-center justify-center text-white font-bold shadow-md shadow-[#a21b7e]/20">P</div>
            <span className="text-lg font-bold text-gray-800 tracking-tight">ProVisual</span>
          </div>

          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 px-2">Navegação</h3>
          <nav className="space-y-0.5">
            <SidebarItem
              icon={<LayoutGrid size={20} />}
              label="Todos Arquivos"
              active={activeTab === 'all'}
              onClick={() => { setActiveTab('all'); setSelectedFolderId(null); setDriveFilterType(null); }}
            />
            <SidebarItem
              icon={<ImageIcon size={20} />}
              label="Imagens"
              active={activeTab === 'image'}
              onClick={() => { setActiveTab('image'); setSelectedFolderId(null); setDriveFilterType(null); }}
            />
            <SidebarItem
              icon={<Video size={20} />}
              label="Vídeos"
              active={activeTab === 'video'}
              onClick={() => { setActiveTab('video'); setSelectedFolderId(null); setDriveFilterType(null); }}
            />
            <SidebarItem
              icon={<FileText size={20} />}
              label="Documentos"
              active={activeTab === 'document'}
              onClick={() => { setActiveTab('document'); setSelectedFolderId(null); setDriveFilterType(null); }}
            />

            <div className="my-4 border-t border-gray-100 mx-2" />
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-2 flex items-center gap-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-5 h-5 shrink-0" />
              <span>Google Drive</span>
            </h3>

            <SidebarItem
              icon={<HardDrive size={20} />}
              label="Meu Drive"
              active={activeTab === 'google_drive' && driveFilterType === null}
              onClick={() => handleGoogleSync('root')}
            />
            <SidebarItem
              icon={<Users size={20} />}
              label="Partilhados Comigo"
              active={activeTab === 'google_drive' && driveFilterType === 'sharedWithMe'}
              onClick={() => handleGoogleSync(undefined, 'sharedWithMe')}
            />
            <SidebarItem
              icon={<Clock size={20} />}
              label="Recentes"
              active={activeTab === 'google_drive' && driveFilterType === 'recent'}
              onClick={() => handleGoogleSync(undefined, 'recent')}
            />
            <SidebarItem
              icon={<Star size={20} />}
              label="Com Estrela"
              active={activeTab === 'google_drive' && driveFilterType === 'starred'}
              onClick={() => handleGoogleSync(undefined, 'starred')}
            />
            <SidebarItem
              icon={<Trash2 size={20} />}
              label="Lixo"
              active={activeTab === 'google_drive' && driveFilterType === 'trashed'}
              onClick={() => handleGoogleSync(undefined, 'trashed')}
            />
          </nav>
        </div>

        {/* Armazenamento progress bar */}
        <div className="p-4 mx-2 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-700">
            <Cloud size={16} className="text-blue-500" />
            <span>Armazenamento</span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-2">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${storageInfo.percent}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-500 font-medium mb-3">
            {storageInfo.usage} de {storageInfo.limit} usados
          </div>
          <a
            href="https://one.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center w-full py-1.5 text-[10px] font-black text-blue-600 hover:text-blue-700 bg-white border border-gray-200 hover:border-blue-200 rounded-full transition-all uppercase tracking-wider"
          >
            Obter mais espaço
          </a>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-gray-500 text-xs font-bold hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
          >
            <LogOut size={14} />
            Encerrar Sessão
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header - Search */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-20">
          <div className="relative w-96">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Pesquisar arquivos e pastas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-100 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a21b7e] transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-gray-50 p-1 rounded-md border border-gray-100">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-1.5 rounded transition-all", viewMode === "grid" ? "bg-white shadow-sm text-[#a21b7e]" : "text-gray-400 hover:text-gray-600")}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 rounded transition-all", viewMode === "list" ? "bg-white shadow-sm text-[#a21b7e]" : "text-gray-400 hover:text-gray-600")}
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Path & Primary Actions */}
        <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-gray-100 z-10">
          <div className="flex items-center gap-2 text-sm font-medium">
            {selectedAsset ? (
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-2">
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
                <span className="text-sm font-bold text-[#a21b7e] bg-[#a21b7e]/5 px-3 py-1 rounded-full border border-[#a21b7e]/10">
                  1 item selecionado
                </span>
                <div className="h-4 w-px bg-gray-200 mx-2" />
                <button className="flex items-center gap-2 text-gray-600 hover:text-[#a21b7e] transition-colors font-bold text-xs uppercase tracking-widest">
                  <Download size={16} />
                  Baixar
                </button>
                <button className="flex items-center gap-2 text-gray-600 hover:text-[#a21b7e] transition-colors font-bold text-xs uppercase tracking-widest">
                  <Share2 size={16} />
                  Partilhar
                </button>
                <button className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors font-bold text-xs uppercase tracking-widest">
                  <Trash2 size={16} />
                  Excluir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="text-gray-400 cursor-pointer hover:text-[#a21b7e] transition-colors"
                  onClick={() => { setSelectedFolderId(null); setActiveTab('all'); }}
                >
                  Todos os arquivos
                </span>
                {selectedFolderId && activeTab === 'google_drive' && (
                  <>
                    <ChevronRight size={14} className="text-gray-300" />
                    <button
                      onClick={() => handleGoogleSync()}
                      className="text-[#a21b7e] font-bold hover:underline"
                    >
                      Google Drive (Raiz)
                    </button>
                  </>
                )}
                {selectedFolderId && activeTab !== 'google_drive' && (
                  <>
                    <ChevronRight size={14} className="text-gray-300" />
                    <span className="text-gray-800 font-bold">
                      {folders.find(f => f.id === selectedFolderId)?.name}
                    </span>
                  </>
                )}
                {activeTab !== 'all' && (
                  <>
                    <ChevronRight size={14} className="text-gray-300" />
                    <span className="text-gray-800 font-bold capitalize">
                      {activeTab === 'image' ? 'Imagens' : activeTab === 'video' ? 'Vídeos' : 'Documentos'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-[#a21b7e] text-white px-5 py-2.5 rounded-[5px] text-sm font-bold shadow-sm hover:bg-[#8e176e] transition-all"
            >
              <Upload size={16} />
              Carregar
            </button>
            <button
              onClick={handleCreateFolder}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-[5px] text-sm font-bold shadow-sm hover:bg-gray-50 transition-all"
            >
              <FolderPlus size={16} />
              Criar nova pasta
            </button>
          </div>
        </div>

        {/* Files Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50">
          {filteredAssets.length === 0 && folders.filter(f => f.parentId === selectedFolderId).length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Search size={48} className="text-gray-100" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Nada por aqui...</h3>
              <p className="text-sm text-gray-400 max-w-xs">
                Sua pasta está vazia ou nenhum arquivo corresponde à sua busca.
              </p>
            </div>
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="p-8 flex flex-col gap-8 bg-gray-50 min-h-full w-full">
                  {/* Grid de Pastas */}
                  {(activeTab === 'all' || activeTab === 'google_drive') && folders.filter(f => f.parentId === selectedFolderId).length > 0 && (
                    <div className="w-full flex flex-col gap-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pastas</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                        {folders.filter(f => f.parentId === selectedFolderId).map(folder => (
                          <div
                            key={folder.id}
                            onClick={() => {
                              if ((folder as any).ownerId === 'google-drive') {
                                handleGoogleSync(folder.id);
                              } else {
                                setSelectedFolderId(folder.id);
                              }
                            }}
                            className="flex items-center justify-between p-4 bg-white border border-gray-100 hover:border-gray-200 transition-all cursor-pointer group shadow-sm relative overflow-visible rounded-lg"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <FolderIcon size={20} className="text-yellow-500 fill-yellow-500/10 shrink-0" />
                              <span className="text-xs font-bold text-gray-700 truncate uppercase">{folder.name}</span>
                            </div>
                            
                            <div className="relative overflow-visible">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id);
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-50 transition-colors"
                              >
                                <MoreVertical size={16} />
                              </button>

                              <AnimatePresence>
                                {activeFolderMenuId === folder.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-30" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFolderMenuId(null);
                                      }}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                      transition={{ duration: 0.1 }}
                                      className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-40 p-1.5 text-left text-gray-700 font-sans cursor-default"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          alert("Descarregando a pasta: " + folder.name);
                                          setActiveFolderMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all text-left"
                                      >
                                        <Download size={14} className="text-gray-400" />
                                        <span>Transferir</span>
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newName = prompt("Digite o novo nome para " + folder.name);
                                          if (newName) {
                                            updateDoc(doc(db, "folders", folder.id), { name: newName });
                                          }
                                          setActiveFolderMenuId(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all text-left"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <FileText size={14} className="text-gray-400" />
                                          <span>Mudar nome</span>
                                        </div>
                                        <span className="text-[9px] text-gray-400 font-medium">⌥⌘E</span>
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          alert("Abrindo partilha para " + folder.name);
                                          setActiveFolderMenuId(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all text-left"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <Users size={14} className="text-gray-400" />
                                          <span>Partilhar</span>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-400" />
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          alert("Organizando pasta " + folder.name);
                                          setActiveFolderMenuId(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all text-left"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <FolderIcon size={14} className="text-gray-400" />
                                          <span>Organizar</span>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-400" />
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          alert("Informações da pasta: " + folder.name);
                                          setActiveFolderMenuId(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all text-left"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <BarChart3 size={14} className="text-gray-400" />
                                          <span>Informações da pasta</span>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-400" />
                                      </button>

                                      <div className="my-1 border-t border-gray-100" />

                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (confirm("Tem certeza que deseja mover " + folder.name + " para o lixo?")) {
                                            await updateDoc(doc(db, "folders", folder.id), { parentId: "trash" });
                                          }
                                          setActiveFolderMenuId(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-all text-left"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <Trash2 size={14} className="text-red-400" />
                                          <span>Mover para o lixo</span>
                                        </div>
                                        <span className="text-[9px] text-red-400 font-medium">Delete</span>
                                      </button>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grid de Arquivos / Fotos */}
                  {(activeTab !== 'all' || activeTab === 'google_drive') && filteredAssets.length > 0 && (
                    <div className="w-full flex flex-col gap-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Arquivos</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                        {filteredAssets.map(asset => (
                          <AssetCard
                            key={asset.id}
                            asset={asset}
                            onSelect={() => {
                              if (asset.type === 'folder') {
                                handleGoogleSync(asset.driveId || asset.id);
                              } else {
                                setPreviewAsset(asset);
                              }
                            }}
                            onPreview={() => {
                              if (asset.type === 'folder') {
                                handleGoogleSync(asset.driveId || asset.id);
                              } else {
                                setPreviewAsset(asset);
                              }
                            }}
                            isSelected={selectedAsset?.id === asset.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* List Header */}
                  <div className="sticky top-0 grid grid-cols-12 px-8 py-3 bg-gray-50/80 backdrop-blur border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest z-10">
                    <div className="col-span-6">Nome do arquivo</div>
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-2">Modificação</div>
                    <div className="col-span-2 text-right pr-4">Tamanho</div>
                  </div>

                  {/* Folders in List - Only show in 'All Files' or 'Google Drive' view */}
                  {(activeTab === 'all' || activeTab === 'google_drive') && folders.filter(f => f.parentId === selectedFolderId).map(folder => (
                    <div
                      key={folder.id}
                      onClick={() => {
                        if ((folder as any).ownerId === 'google-drive') {
                          handleGoogleSync(folder.id);
                        } else {
                          setSelectedFolderId(folder.id);
                        }
                      }}
                      className="grid grid-cols-12 px-8 py-4 border-b border-gray-50 items-center hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      <div className="col-span-6 flex items-center gap-4">
                        <FolderIcon size={24} className="text-yellow-400" />
                        <span className="text-sm font-bold text-gray-700">{folder.name}</span>
                      </div>
                      <div className="col-span-2 text-[10px] font-black text-gray-300 uppercase">Pasta</div>
                      <div className="col-span-2 text-xs text-gray-400 font-medium">
                        {format(folder.date, "dd/MM/yyyy")}
                      </div>
                      <div className="col-span-2 text-right pr-4 text-xs text-gray-300">-</div>
                    </div>
                  ))}

                  {/* Assets (Files & Folders from Drive) in List */}
                  {filteredAssets.map(asset => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      onSelect={() => {
                        if (asset.type === 'folder') {
                          handleGoogleSync(asset.driveId || asset.id);
                        } else {
                          setPreviewAsset(asset); // Abrir visualização no clique simples
                        }
                      }}
                      onPreview={() => {
                        if (asset.type === 'folder') {
                          handleGoogleSync(asset.driveId || asset.id);
                        } else {
                          setPreviewAsset(asset);
                        }
                      }}
                      isSelected={selectedAsset?.id === asset.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Upload Progress Overlay (Fixed Bottom Right) */}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 right-8 bg-white border border-gray-100 shadow-2xl rounded-xl p-4 w-80 z-[100]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-[#a21b7e]">Sincronizando...</span>
              <span className="text-sm font-bold text-[#a21b7e]">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <motion.div
                className="bg-[#a21b7e] h-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-3 italic font-bold uppercase tracking-widest text-center">Processando arquivos no servidor...</p>
          </motion.div>
        )}
        {/* Modal de Visualização */}
        <AnimatePresence>
          {previewAsset && (
            <FilePreviewModal
              asset={previewAsset}
              onClose={() => setPreviewAsset(null)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Details Pane */}
      <AnimatePresence>
        {selectedAsset && (
          <motion.aside
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-72 border-l border-gray-100 bg-white p-5 overflow-y-auto shrink-0 z-20 shadow-xl shadow-black/5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[10px] text-gray-400 uppercase tracking-[0.2em]">Inspecionar</h3>
              <button
                onClick={() => setSelectedAsset(null)}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-md text-gray-300 transition-colors"
              >
                <Plus className="rotate-45" size={18} />
              </button>
            </div>

            <div className="aspect-square bg-gray-50 mb-6 flex items-center justify-center border border-gray-100 relative group overflow-hidden shadow-inner">
              {(selectedAsset.thumbnailUrl || selectedAsset.driveId) ? (
                <img
                  src={selectedAsset.thumbnailUrl || `https://drive.google.com/thumbnail?id=${selectedAsset.driveId}&sz=w500`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                selectedAsset.type === "image" ? (
                  <ImageIcon className="text-[#722f37] opacity-20" size={48} />
                ) : selectedAsset.type === "video" ? (
                  <Video className="text-[#722f37] opacity-20" size={48} />
                ) : (
                  <FileText className="text-[#722f37] opacity-20" size={48} />
                )
              )}
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest text-[#722f37] border border-[#722f37]/10 shadow-sm">
                {selectedAsset.type}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-sm text-gray-800 mb-1 truncate" title={selectedAsset.name}>
                {selectedAsset.name}
              </h4>
              <div className="flex items-center gap-3 text-gray-400 text-[9px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  <Clock size={10} className="text-[#722f37]" />
                  {format(selectedAsset.captureDate, "dd/MM/yy")}
                </span>
                <span className="flex items-center gap-1 border-l border-gray-100 pl-3">
                  <Download size={10} className="text-[#722f37]" />
                  {selectedAsset.versions[0].size}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-2">Entregas</h5>
                <div className="space-y-1.5">
                  {selectedAsset.versions.map((version, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all border border-gray-50">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 leading-none mb-1">
                          {version.quality}
                        </span>
                        <span className="text-[11px] font-bold text-gray-700">{version.size}</span>
                      </div>
                      <button className="w-7 h-7 flex items-center justify-center text-[#722f37] bg-white shadow-sm border border-gray-100 rounded-md hover:bg-[#722f37] hover:text-white transition-all">
                        <Download size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <button className="w-full flex items-center justify-center gap-2 bg-[#722f37] text-white py-2.5 rounded-lg font-bold shadow-md shadow-[#722f37]/10 hover:bg-[#5a252c] transition-all">
                  <ArrowBigUpDash size={16} />
                  <span className="text-xs">Processar Master</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper Components
interface SidebarItemProps {
  key?: React.Key;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[16px] font-bold transition-all relative",
        active
          ? "bg-[#a21b7e]/5 text-[#a21b7e]"
          : "text-gray-500 hover:bg-gray-50 hover:text-[#a21b7e]"
      )}
    >
      <span className={cn("transition-colors", active ? "text-[#a21b7e]" : "text-gray-400")}>{icon}</span>
      <span className="tracking-tight">{label}</span>
      {active && (
        <div className="absolute right-3 w-1 h-1 rounded-full bg-[#a21b7e]" />
      )}
    </button>
  );
}

interface FolderCardProps {
  key?: React.Key;
  folder: FolderData;
  onClick: () => void;
}

function FolderCard({ folder, onClick }: FolderCardProps) {
  return (
    <div
      onClick={onClick}
      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md cursor-pointer transition-all group"
    >
      <div className="w-10 h-10 bg-yellow-50 text-yellow-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        <FolderIcon size={24} />
      </div>
      <p className="text-sm font-semibold text-gray-800 truncate">{folder.name}</p>
      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tight font-bold">
        {format(folder.date, "dd MMM yyyy", { locale: ptBR })}
      </p>
    </div>
  );
}

interface AssetCardProps {
  key?: React.Key;
  asset: Asset;
  onSelect: () => void;
  isSelected: boolean;
}

function AssetCard({ asset, onSelect, isSelected, onPreview }: { asset: Asset; onSelect: () => void; isSelected: boolean; onPreview: () => void }) {
  const Icon = asset.type === "folder" ? FolderIcon : (asset.type === "image" ? ImageIcon : (asset.type === "video" ? Video : FileText));
  const iconColor = asset.type === "image" ? "text-blue-500" : (asset.type === "video" ? "text-purple-500" : "text-gray-400");

  const thumbUrl = asset.thumbnailUrl ? asset.thumbnailUrl.replace('=s220', '=s500') : `https://drive.google.com/thumbnail?id=${asset.driveId}&sz=w500`;

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onPreview}
      className={cn(
        "aspect-[3/2] relative border transition-all cursor-pointer overflow-hidden group",
        isSelected
          ? "border-[#a21b7e] ring-2 ring-[#a21b7e]/10 shadow-lg"
          : "border-gray-100 hover:border-gray-300"
      )}
    >
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        {(asset.thumbnailUrl || asset.driveId) ? (
          <img 
            src={thumbUrl} 
            alt={asset.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <Icon size={40} className={cn("transition-all duration-300", iconColor)} />
        )}
      </div>

      {/* Hover Overlay - Descrição ao passar o mouse */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
        <h4 className="font-bold text-[11px] text-white truncate mb-0.5">{asset.name}</h4>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-gray-300 uppercase">{format(asset.captureDate, "dd/MM/yy")}</span>
          <span className="text-[9px] font-bold text-[#a21b7e] bg-white px-1.5 py-0.5 rounded-sm uppercase">{asset.versions[0]?.size}</span>
        </div>
      </div>
    </div>
  );
}

interface AssetRowProps {
  key?: React.Key;
  asset: Asset;
  onSelect: () => void;
  isSelected: boolean;
  onPreview: () => void;
}

function AssetRow({ asset, onSelect, isSelected, onPreview }: AssetRowProps) {
  const Icon = asset.type === "folder" ? FolderIcon : (asset.type === "image" ? ImageIcon : (asset.type === "video" ? Video : FileText));
  const iconColor = asset.type === "folder" ? "text-yellow-400" : (asset.type === "image" ? "text-blue-500" : (asset.type === "video" ? "text-purple-500" : "text-orange-500"));

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onPreview}
      className={cn(
        "grid grid-cols-12 px-8 py-4 border-b border-gray-50 items-center hover:bg-gray-50 cursor-pointer transition-all",
        isSelected && "bg-[#a21b7e]/5 hover:bg-[#a21b7e]/10 border-[#a21b7e]/10"
      )}
    >
      <div className="col-span-6 flex items-center gap-4">
        {(asset.thumbnailUrl || asset.driveId) && asset.type !== 'folder' ? (
          <div className="w-8 h-8 overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
            <img
              src={asset.thumbnailUrl || `https://drive.google.com/thumbnail?id=${asset.driveId}&sz=w100`}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <Icon size={24} className={iconColor} />
        )}
        <span className="text-[16px] font-bold text-gray-700 truncate">{asset.name}</span>
      </div>
      <div className="col-span-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">{asset.type}</div>
      <div className="col-span-2 text-xs text-gray-400 font-medium">
        {format(asset.captureDate, "dd/MM/yyyy")}
      </div>
      <div className="col-span-2 text-right pr-4 text-xs text-gray-500 font-mono">
        {asset.versions[0]?.size || "0 MB"}
      </div>
    </div>
  );
}
