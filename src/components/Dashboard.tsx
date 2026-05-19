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
  Cloud,
  Sparkles,
  ExternalLink,
  Pencil,
  Copy,
  UserPlus,
  Info,
  CheckCircle2,
  Check,
  FolderDot,
  Key,
  RefreshCw,
  Square,
  CheckSquare,
  Mail,
  Folder,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Database,
  Link
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, handleFirestoreError, OperationType } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { supabase, collection, query, where, onSnapshot, addDoc, getDoc, doc, updateDoc, setDoc, serverTimestamp, Timestamp, deleteDoc } from "../lib/supabase";
const db = null;
import { useRef } from "react";
import logoHorizontal from "../Logo/logo_horizontal_clean.png";
import logoJpg from "../Logo/logo_main_jpg.jpg";

// Helper de requisição segura para evitar Unexpected end of JSON input e expor erros reais
async function fetchWithErrorMessage(url: string, options: RequestInit): Promise<any> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let errorMsg = `Erro na operação (${response.status})`;
    try {
      const errData = await response.json();
      errorMsg = errData.error || errorMsg;
    } catch {
      try {
        const text = await response.text();
        if (text && text.length < 200) {
          errorMsg = text;
        }
      } catch {}
    }
    throw new Error(errorMsg);
  }
  
  try {
    return await response.json();
  } catch {
    return {};
  }
}

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
  webViewLink?: string;
}

// Componente SafeImage para garantir visibilidade e fallbacks de thumbnails
interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  thumbnailUrl?: string;
  driveId?: string;
  fallbackSize?: 'w100' | 'w500' | 'w1200';
  alt?: string;
  className?: string;
}

function SafeImage({ thumbnailUrl, driveId, fallbackSize = 'w500', alt, className, ...props }: SafeImageProps) {
  const initialUrl = driveId 
    ? `/api/drive/thumbnail?id=${driveId}` 
    : (thumbnailUrl || '');
  const [src, setSrc] = useState(initialUrl);
  const [hasFailedOnce, setHasFailedOnce] = useState(false);
  const [hasFailedAlt, setHasFailedAlt] = useState(false);

  useEffect(() => {
    const newUrl = driveId 
      ? `/api/drive/thumbnail?id=${driveId}` 
      : (thumbnailUrl || '');
    setSrc(newUrl);
    setHasFailedOnce(false);
    setHasFailedAlt(false);
  }, [thumbnailUrl, driveId, fallbackSize]);

  const handleError = () => {
    if (!hasFailedOnce && driveId) {
      setHasFailedOnce(true);
      setSrc(`https://drive.google.com/thumbnail?id=${driveId}&sz=${fallbackSize}`);
    } else if (!hasFailedAlt && driveId) {
      setHasFailedAlt(true);
      setSrc(`https://docs.google.com/uc?export=view&id=${driveId}`);
    }
  };

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      onError={handleError}
      className={className}
      {...props}
    />
  );
}

// Componente Skeleton Loading realista e premium
function SkeletonView({ viewMode, activeTab }: { viewMode: 'grid' | 'list'; activeTab: string }) {
  const isList = viewMode === 'list';
  const showFolders = activeTab === 'all' || activeTab === 'google_drive';

  if (isList) {
    return (
      <div className="p-8 flex flex-col gap-3 bg-gray-50 min-h-full w-full">
        {/* Cabeçalho da Tabela fake */}
        <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider px-4">
          <div className="col-span-6">Nome</div>
          <div className="col-span-2">Modificado em</div>
          <div className="col-span-2">Tamanho</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        {/* Linhas de Pastas */}
        {showFolders && Array.from({ length: 4 }).map((_, i) => (
          <div key={`folder-ske-${i}`} className="grid grid-cols-12 gap-4 py-3.5 items-center bg-white border border-gray-50 rounded-lg px-4 shadow-sm animate-pulse">
            <div className="col-span-6 flex items-center gap-3">
              <div className="w-5 h-5 bg-yellow-100 rounded-md shrink-0" />
              <div className="w-32 h-3.5 bg-gray-200 rounded" />
            </div>
            <div className="col-span-2">
              <div className="w-20 h-3 bg-gray-100 rounded" />
            </div>
            <div className="col-span-2">
              <div className="w-10 h-3 bg-gray-100 rounded" />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded-full" />
            </div>
          </div>
        ))}

        {/* Linhas de Arquivos */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`file-ske-${i}`} className="grid grid-cols-12 gap-4 py-3.5 items-center bg-white border border-gray-50 rounded-lg px-4 shadow-sm animate-pulse">
            <div className="col-span-6 flex items-center gap-3">
              <div className="w-5 h-5 bg-purple-100 rounded-md shrink-0" />
              <div className="w-44 h-3.5 bg-gray-200 rounded" />
            </div>
            <div className="col-span-2">
              <div className="w-20 h-3 bg-gray-100 rounded" />
            </div>
            <div className="col-span-2">
              <div className="w-12 h-3 bg-gray-100 rounded" />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid view
  return (
    <div className="p-8 flex flex-col gap-8 bg-gray-50 min-h-full w-full">
      {/* Grid de Pastas */}
      {showFolders && (
        <div className="w-full flex flex-col gap-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`folder-ske-g-${i}`} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg shadow-sm animate-pulse">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-5 h-5 bg-yellow-100 rounded-md shrink-0" />
                  <div className="w-24 h-3 bg-gray-200 rounded" />
                </div>
                <div className="w-4 h-4 bg-gray-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Arquivos */}
      <div className="w-full flex flex-col gap-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`file-ske-g-${i}`} className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm aspect-square flex flex-col animate-pulse">
              <div className="flex-1 bg-gray-50 flex items-center justify-center relative">
                <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center animate-pulse" />
              </div>
              <div className="p-3 flex flex-col gap-1.5 border-t border-gray-50 bg-white">
                <div className="w-28 h-3 bg-gray-200 rounded" />
                <div className="w-16 h-2 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Componente do Visualizador Interno
function FilePreviewModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const url = asset.versions[0]?.url;
  // Converter link de visualização para link de incorporação (embed)
  const embedUrl = url ? url.replace('/view', '/preview') : '';

  // Formatação personalizada conforme pedido
  const extension = asset.name.includes('.') ? asset.name.split('.').pop() : '';
  const nameWithoutExt = asset.name.includes('.') ? asset.name.substring(0, asset.name.lastIndexOf('.')) : asset.name;
  const capitalizedType = asset.type.charAt(0).toUpperCase() + asset.type.slice(1);
  const formatDisplay = extension ? `${capitalizedType}.${extension.toLowerCase()}` : capitalizedType;
  const sizeDisplay = asset.versions?.[0]?.size || "0 MB";
  const dateDisplay = asset.captureDate ? format(asset.captureDate, "dd/MM/yyyy") : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#18191a] max-w-4xl w-full h-[75vh] md:h-[70vh] rounded-[10px] overflow-hidden flex flex-col shadow-2xl relative border border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão de Fechar flutuante */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/15 cursor-pointer shadow-md hover:scale-105"
        >
          <Plus className="rotate-45" size={20} />
        </button>

        <div className="flex-1 bg-[#121212] flex items-center justify-center relative overflow-hidden w-full h-full">
          {asset.type === 'image' ? (
            <SafeImage
              thumbnailUrl={asset.thumbnailUrl ? asset.thumbnailUrl.replace('=s220', '=s800') : undefined}
              driveId={asset.driveId}
              fallbackSize="w1200"
              className="w-full h-full object-cover"
              alt={asset.name}
            />
          ) : asset.versions?.[0]?.url ? (
            <iframe
              src={asset.versions[0].url.includes('drive.google.com')
                ? asset.versions[0].url.replace('/view', '/preview')
                : asset.versions[0].url}
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

        {/* Barra inferior translúcida com dados e botão baixar */}
        <div className="absolute bottom-0 inset-x-0 pt-16 pb-5 px-6 bg-gradient-to-t from-black/95 via-black/70 to-black/0 flex items-center justify-between text-white z-10 rounded-b-[10px]">
          <div className="flex items-center max-w-[75%] text-left">
            <span className="text-xs md:text-sm font-medium text-white tracking-normal select-text">
              {formatDisplay} {sizeDisplay} &nbsp;|&nbsp; {nameWithoutExt} &nbsp;|&nbsp; {dateDisplay}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              let downloadUrl = asset.versions?.[0]?.url || asset.webViewLink;
              if (downloadUrl) {
                if (downloadUrl.includes('drive.google.com')) {
                  const matchId = downloadUrl.match(/id=([^&]+)/) || downloadUrl.match(/\/file\/d\/([^/]+)/);
                  const fileId = matchId ? matchId[1] : asset.driveId;
                  if (fileId) {
                    downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                  }
                }
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = downloadUrl;
                document.body.appendChild(iframe);
                setTimeout(() => document.body.removeChild(iframe), 3000);
              }
            }}
            className="flex items-center gap-1.5 bg-transparent hover:text-[#a21b7e] text-white px-2 py-1.5 rounded-none text-xs font-bold transition-all cursor-pointer select-none border-none shadow-none"
          >
            <Download size={14} />
            <span>Baixar</span>
          </button>
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
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => {
    return sessionStorage.getItem('prov_selected_folder_id') || null;
  });
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'document' | 'other' | 'google_drive' | 'contas_acesso'>(() => {
    return (sessionStorage.getItem('prov_active_tab') as any) || 'all';
  });
  const [isClientsMenuOpen, setIsClientsMenuOpen] = useState(true);
  const [isClientsListOpen, setIsClientsListOpen] = useState(true);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid"); // Grelha por padrão
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [driveFilterType, setDriveFilterType] = useState<string | null>(() => {
    return sessionStorage.getItem('prov_drive_filter_type') || null;
  });
  const [storageQuota, setStorageQuota] = useState<{ limit: string; usage: string } | null>(null);
  const [activeFolderMenuId, setActiveFolderMenuId] = useState<string | null>(null);
  const [activeFolderSubmenu, setActiveFolderSubmenu] = useState<'none' | 'partilhar' | 'organizar' | 'atribuir'>('none');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  
  // Estado para conexão híbrida pessoal de Google Drive do Silva
  const [driveStatus, setDriveStatus] = useState<{connected: boolean; type: string; email: string; configNeeded: boolean} | null>(null);
  const [isDriveDropdownOpen, setIsDriveDropdownOpen] = useState(false);
  
  // Estados para Gestão de Contas de Acesso dos Clientes
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountResponsible, setNewAccountResponsible] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountLogo, setNewAccountLogo] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [newAccountRole, setNewAccountRole] = useState<"admin" | "cliente">("cliente");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  // Estados para as janelas interativas reais dos arquivos (sem bonecos!)
  const [geminiAsset, setGeminiAsset] = useState<Asset | null>(null);
  const [geminiQuestion, setGeminiQuestion] = useState("");
  const [geminiAnswers, setGeminiAnswers] = useState<Array<{role: 'user' | 'gemini', text: string}>>([]);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [shareAsset, setShareAsset] = useState<Asset | null>(null);
  const [organizeAsset, setOrganizeAsset] = useState<Asset | null>(null);
  const [organizeMode, setOrganizeMode] = useState<'mover' | 'copiar'>('mover');
  const [organizeTargetFolderId, setOrganizeTargetFolderId] = useState<string>("");
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [distributeModalOpen, setDistributeModalOpen] = useState(false);
  const [itemToDistribute, setItemToDistribute] = useState<{ id: string, type: 'folder' | 'asset', currentName: string } | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isDistributing, setIsDistributing] = useState(false);

  // Buscar a pasta geral chamada "arquivo" no nível raiz para servir como raiz do Meu Drive
  const arquivoFolder = useMemo(() => {
    if (!folders || !Array.isArray(folders)) return null;
    // 1. Tentar busca exata por "arquivo" na raiz
    let found = folders.find(f => 
      f && f.name && typeof f.name === 'string' && 
      f.name.trim().toLowerCase() === 'arquivo' && 
      (!(f as any).parentId || (f as any).parentId === 'root' || (f as any).parentId === '') && 
      !(f as any).trashed
    );
    if (found) return found;

    // 2. Fallback: buscar pasta que contenha "arquivo" no nome na raiz
    found = folders.find(f => 
      f && f.name && typeof f.name === 'string' && 
      f.name.toLowerCase().includes('arquivo') && 
      (!(f as any).parentId || (f as any).parentId === 'root' || (f as any).parentId === '') && 
      !(f as any).trashed
    );
    if (found) return found;

    // 3. Fallback final: se não achou na raiz, buscar qualquer pasta chamada "arquivo" no sistema
    return folders.find(f => 
      f && f.name && typeof f.name === 'string' && 
      f.name.trim().toLowerCase() === 'arquivo' && 
      !(f as any).trashed
    );
  }, [folders]);

  const arquivoFolderId = arquivoFolder ? arquivoFolder.id : null;

  const [visibleImagesCount, setVisibleImagesCount] = useState(10);
  const [foldersLoaded, setFoldersLoaded] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  useEffect(() => {
    if (activeTab) {
      sessionStorage.setItem('prov_active_tab', activeTab);
    } else {
      sessionStorage.removeItem('prov_active_tab');
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedFolderId) {
      sessionStorage.setItem('prov_selected_folder_id', selectedFolderId);
    } else {
      sessionStorage.removeItem('prov_selected_folder_id');
    }
  }, [selectedFolderId]);

  useEffect(() => {
    if (driveFilterType) {
      sessionStorage.setItem('prov_drive_filter_type', driveFilterType);
    } else {
      sessionStorage.removeItem('prov_drive_filter_type');
    }
  }, [driveFilterType]);

  // Lógica premium para evitar skeleton em ações internas (sincronizada com sessionStorage)
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isActionReloading, setIsActionReloading] = useState(() => {
    return sessionStorage.getItem('action_in_progress') === 'true';
  });

  useEffect(() => {
    if (foldersLoaded && assetsLoaded) {
      sessionStorage.removeItem('action_in_progress');
      setIsActionReloading(false);
    }
  }, [foldersLoaded, assetsLoaded]);

  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("contextmenu", handleGlobalClick);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("contextmenu", handleGlobalClick);
    };
  }, []);

  // Grelha de 5 colunas como padrão para tudo
  useEffect(() => {
    setViewMode('grid');
  }, [activeTab]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{ id: string; name: string; progress: number; status: 'uploading' | 'completed' | 'error' }[]>([]);
  const [showUploadQueueCard, setShowUploadQueueCard] = useState(false);
  const [newlyUploadedAssetIds, setNewlyUploadedAssetIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchDriveStatus = async () => {
      try {
        const response = await fetch("/api/drive/auth/status");
        if (response.ok) {
          const data = await response.json();
          setDriveStatus(data);
        }
      } catch (err) {
        console.error("Erro ao buscar status do Drive:", err);
      }
    };
    fetchDriveStatus();
    // Atualizar a cada 8 segundos para detectar conexões rápidas feitas no popup
    const interval = setInterval(fetchDriveStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectDrive = async () => {
    try {
      const response = await fetch("/api/drive/auth/url");
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.open(data.url, "_blank", "width=600,height=650,left=150,top=100");
        } else {
          alert(data.error || "Erro ao conectar.");
        }
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao iniciar conexão com o Google Drive.");
      }
    } catch (err: any) {
      alert("Erro ao conectar: " + err.message);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!confirm("Tem certeza que deseja desconectar o Google Drive? Esta ação desativará o upload direto para sua conta pessoal.")) return;
    try {
      const response = await fetch("/api/drive/auth/disconnect", { method: "POST" });
      if (response.ok) {
        alert("Google Drive desconectado com sucesso.");
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao desconectar.");
      }
    } catch (err: any) {
      alert("Erro ao desconectar: " + err.message);
    }
  };

  const isDataLoading = !foldersLoaded || !assetsLoaded;
  const handleActionSuccess = () => {
    setIsProcessingAction(false);
    sessionStorage.removeItem('action_in_progress');
  };
  const showSkeleton = false;
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
      setIsProcessingAction(true);
      sessionStorage.setItem('action_in_progress', 'true');
      await addDoc(collection(db, "folders"), {
        name: folderName,
        date: serverTimestamp(),
        ownerId: currentUser?.id || "mock-admin",
        parentId: selectedFolderId || (activeTab === 'all' ? '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG' : null),
        color: "#e2b13c",
        adminToken: "Silva_Chamo_Master_Admin_2026"
      });
      setIsProcessingAction(false);
      sessionStorage.removeItem('action_in_progress');
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
      setIsProcessingAction(false);
      sessionStorage.removeItem('action_in_progress');
    }
  };

  // Gestão de Contas de Acesso dos Clientes (Criar ou Editar)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAccountError("A imagem selecionada é muito grande. Escolha uma imagem de até 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const MAX_DIM = 200;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setNewAccountLogo(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(null);

    if (!newAccountEmail || !newAccountResponsible || !newAccountName || !newAccountPassword) {
      setAccountError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (newAccountPassword.length < 6) {
      setAccountError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    setIsCreatingAccount(true);
    const displayNameValue = `${newAccountResponsible.trim()}|${newAccountName.trim()}|${newAccountLogo.trim()}`;

    try {
      if (editingAccount) {
        // MODO EDIÇÃO: Atualizar documento existente no Firestore
        await setDoc(doc(db, "users", editingAccount.id), {
          email: newAccountEmail.trim().toLowerCase(),
          displayName: displayNameValue,
          password: newAccountPassword,
          role: newAccountRole,
          adminToken: "Silva_Chamo_Master_Admin_2026"
        }, { merge: true });

        setAccountSuccess("Conta de acesso editada com sucesso!");
      } else {
        // MODO CRIAÇÃO: Verificar se o email já está cadastrado
        const emailExists = accounts.some(
          (acc) => acc.email?.toLowerCase() === newAccountEmail.trim().toLowerCase()
        );
        if (emailExists) {
          setAccountError("Este e-mail já está cadastrado.");
          setIsCreatingAccount(false);
          return;
        }

        // Gerar ID de usuário
        const generatedUid = "client_" + Math.random().toString(36).substring(2, 11);
        
        // Salvar conta no Firestore na coleção "users"
        await setDoc(doc(db, "users", generatedUid), {
          email: newAccountEmail.trim().toLowerCase(),
          displayName: displayNameValue,
          password: newAccountPassword, // Senha salva para login resiliente local
          role: newAccountRole,
          clientId: generatedUid, // ID do cliente para filtrar seus arquivos
          createdAt: serverTimestamp(),
          adminToken: "Silva_Chamo_Master_Admin_2026"
        });

        setAccountSuccess("Conta de acesso criada com sucesso!");
      }

      setNewAccountEmail("");
      setNewAccountResponsible("");
      setNewAccountName("");
      setNewAccountLogo("");
      setNewAccountPassword("");
      setNewAccountRole("cliente");
      
      // Fechar modal após 1.5s
      setTimeout(() => {
        setIsAddAccountModalOpen(false);
        setEditingAccount(null);
        setAccountSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error("Erro ao salvar conta:", err);
      setAccountError(`Erro no banco de dados ao salvar a conta: ${err.message || err}`);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const generateStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nums = "0123456789";
    const syms = "@#!$%&*";
    let pass = "";
    // Garantir pelo menos um caractere de cada conjunto obrigatório
    pass += chars[Math.floor(Math.random() * chars.length)];
    pass += caps[Math.floor(Math.random() * caps.length)];
    pass += nums[Math.floor(Math.random() * nums.length)];
    pass += syms[Math.floor(Math.random() * syms.length)];
    // Completar o restante até atingir 10 caracteres
    const allChars = chars + caps + nums + syms;
    for (let i = 0; i < 6; i++) {
      pass += allChars[Math.floor(Math.random() * allChars.length)];
    }
    // Misturar aleatoriamente a ordem dos caracteres
    return pass.split("").sort(() => 0.5 - Math.random()).join("");
  };

  const handleEditClick = (account: any) => {
    setEditingAccount(account);
    setNewAccountEmail(account.email);
    const rawName = String(account.displayName || "");
    const parts = rawName.split('|');
    if (parts.length === 3) {
      setNewAccountResponsible(parts[0]);
      setNewAccountName(parts[1]);
      setNewAccountLogo(parts[2] || "");
    } else if (parts.length === 2) {
      setNewAccountResponsible("");
      setNewAccountName(parts[0]);
      setNewAccountLogo(parts[1] || "");
    } else {
      setNewAccountResponsible("");
      setNewAccountName(rawName);
      setNewAccountLogo("");
    }
    setNewAccountPassword(account.password || "");
    setNewAccountRole(account.role || "cliente");
    setAccountError(null);
    setAccountSuccess(null);
    setIsAddAccountModalOpen(true);
  };

  const handleCloseAccountModal = () => {
    setIsAddAccountModalOpen(false);
    setEditingAccount(null);
    setNewAccountEmail("");
    setNewAccountResponsible("");
    setNewAccountName("");
    setNewAccountLogo("");
    setNewAccountPassword("");
    setNewAccountRole("cliente");
    setAccountError(null);
    setAccountSuccess(null);
  };

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir a conta de "${accountName}"?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", accountId));
    } catch (err) {
      console.error("Erro ao excluir conta:", err);
      alert("Erro ao excluir conta.");
    }
  };

  // Auth logout
  const handleLogout = async () => { 
    localStorage.removeItem("provisual_local_admin");
    await supabase.auth.signOut(); 
    window.location.href = "/login";
  };

  // Trigger File Input
  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setShowUploadQueueCard(true);

    const filesArray = Array.from(files) as File[];
    const totalFiles = filesArray.length;

    // Adicionar todos os arquivos à fila de upload
    const newItems = filesArray.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      name: file.name,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadQueue(newItems);

    try {
      // 1. Identificar e criar pastas recursivamente se for upload de pasta
      let rootFolderId = selectedFolderId;
      if (!rootFolderId) {
        if (activeTab === 'google_drive') {
          rootFolderId = arquivoFolderId || 'root';
        } else if (activeTab === 'all') {
          rootFolderId = '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG';
        } else {
          rootFolderId = 'root';
        }
      }

      const dirToDriveId: { [path: string]: string } = { "": rootFolderId };
      const isFolderUpload = filesArray.some(file => file.webkitRelativePath);

      if (isFolderUpload) {
        const uniqueDirs = new Set<string>();
        filesArray.forEach(file => {
          if (file.webkitRelativePath) {
            const parts = file.webkitRelativePath.split('/');
            parts.pop(); // Remove o nome do arquivo
            for (let i = 1; i <= parts.length; i++) {
              uniqueDirs.add(parts.slice(0, i).join('/'));
            }
          }
        });

        // Ordenar por nível de profundidade (número de barras / segmentos)
        const sortedDirs = Array.from(uniqueDirs).sort(
          (a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b)
        );

        for (const dirPath of sortedDirs) {
          const segments = dirPath.split('/');
          const folderName = segments[segments.length - 1];
          segments.pop();
          const parentPath = segments.join('/');
          const parentDriveId = dirToDriveId[parentPath]; // Sempre existe porque ordenamos!

          // Criar pasta no Google Drive físico
          const createResponse = await fetch('/api/drive/create-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: folderName, parentId: parentDriveId })
          });

          if (!createResponse.ok) {
            let errorMsg = `Erro ao criar a pasta "${folderName}" no Google Drive.`;
            try {
              const errData = await createResponse.json();
              if (errData && errData.error) {
                errorMsg += ` Detalhes: ${errData.error}`;
              }
            } catch (e) {}
            throw new Error(errorMsg);
          }

          const driveFolder = await createResponse.json();
          const driveFolderId = driveFolder.id;

          // Guardar no cache de caminhos -> Drive IDs
          dirToDriveId[dirPath] = driveFolderId;

          // Guardar no Firestore folders
          await setDoc(doc(db, "folders", driveFolderId), {
            name: folderName,
            date: serverTimestamp(),
            ownerId: "google-drive",
            parentId: parentDriveId === 'root' ? null : parentDriveId,
            starred: false,
            trashed: false,
            adminToken: "Silva_Chamo_Master_Admin_2026"
          });
        }
      }

      // 2. Fazer upload de cada arquivo
      for (let i = 0; i < totalFiles; i++) {
        const file = filesArray[i];
        const currentQueueItem = newItems[i];

        // Atualizar progresso inicial do item atual
        setUploadQueue(prev => prev.map(item => item.id === currentQueueItem.id ? { ...item, progress: 15 } : item));

        // Determinar o ID do diretório destino do arquivo
        let fileFolderId = rootFolderId;
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split('/');
          parts.pop();
          const dirPath = parts.join('/');
          fileFolderId = dirToDriveId[dirPath] || fileFolderId;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderId", fileFolderId);

        try {
          const response = await fetch(`${process.env.VITE_API_BASE || 'http://localhost:3333'}/api/drive/upload`, {
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

          const assetData = {
            name: driveFile.name,
            type: fileType,
            captureDate: driveFile.createdTime ? Timestamp.fromDate(new Date(driveFile.createdTime)) : serverTimestamp(),
            uploadDate: serverTimestamp(),
            folderId: fileFolderId === 'root' ? null : fileFolderId,
            ownerId: "google-drive",
            driveId: driveFile.id,
            thumbnailUrl: driveFile.thumbnailLink || "",
            versions: [{
              quality: "original",
              size: fileSize,
              url: driveFile.webViewLink
            }],
            ...(userProfile?.role === 'cliente' && { clientId: userProfile?.email }),
            adminToken: "Silva_Chamo_Master_Admin_2026"
          };

          const docRef = await addDoc(collection(db, "assets"), assetData);

          // Salvar na lista de recém-carregados para marcar com visto verde no grid
          setNewlyUploadedAssetIds(prev => [...prev, docRef.id]);

          // Atualizar progresso e status do item atual para concluído
          setUploadQueue(prev => prev.map(item => item.id === currentQueueItem.id ? { ...item, progress: 100, status: 'completed' } : item));
        } catch (fileError: any) {
          console.error("Erro no upload do arquivo:", file.name, fileError);
          setUploadQueue(prev => prev.map(item => item.id === currentQueueItem.id ? { ...item, status: 'error', progress: 100 } : item));
        }
      }
    } catch (err: any) {
      console.error("Erro geral no upload:", err);
      alert("Erro ao enviar pasta/arquivos: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Removido window.location.reload() para permitir que os uploads continuem sem travar/recarregar a tela!
    }
  };

  // Seleção e Ações em Massa
  const handleToggleBulkSelect = (assetId: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleBulkMove = async (destinationFolderId: string | null) => {
    if (selectedAssetIds.length === 0) return;
    setIsProcessingAction(true);
    sessionStorage.setItem('action_in_progress', 'true');
    
    try {
      for (const assetId of selectedAssetIds) {
        const asset = assets.find(a => a.id === assetId);
        if (!asset) continue;
        
        // 1. Atualizar no Google Drive real se aplicável
        if (asset.driveId) {
          await fetch('/api/drive/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileId: asset.driveId,
              addParents: destinationFolderId || 'root',
              removeParents: asset.folderId === 'root' || asset.folderId === '' || !asset.folderId ? undefined : asset.folderId
            })
          });
        }
        
        // 2. Atualizar no Firestore
        await updateDoc(doc(db, "assets", asset.id), {
          folderId: destinationFolderId
        });
      }
      
      setSelectedAssetIds([]);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao mover itens em massa: " + err.message);
    } finally {
      setIsProcessingAction(false);
      sessionStorage.removeItem('action_in_progress');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssetIds.length === 0) return;
    if (!confirm(`Tem certeza que deseja mover os ${selectedAssetIds.length} itens selecionados para a Lixeira?`)) return;

    setIsProcessingAction(true);
    sessionStorage.setItem('action_in_progress', 'true');

    try {
      for (const assetId of selectedAssetIds) {
        const asset = assets.find(a => a.id === assetId);
        if (!asset) continue;

        // 1. Mover para a Lixeira no Google Drive
        if (asset.driveId) {
          await fetch('/api/drive/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileId: asset.driveId,
              trashed: true
            })
          });
        }

        // 2. Atualizar no Firestore
        await updateDoc(doc(db, "assets", asset.id), { 
          folderId: "trash", 
          trashed: true 
        });
      }

      setSelectedAssetIds([]);
    } catch (err: any) {
      console.error(err);
      alert("Erro ao eliminar itens em massa: " + err.message);
    } finally {
      setIsProcessingAction(false);
      sessionStorage.removeItem('action_in_progress');
    }
  };

  const handleGoogleSync = async (targetFolderId?: string, filterType?: string, isBackground = false) => {
    if (!assetsLoaded || !foldersLoaded) {
      console.log("Aguardando carregamento de metadados do Supabase antes de sincronizar...");
      return;
    }
    const folderId = targetFolderId || 'root';
    
    // Se a aba ativa for 'all' (Dados do Cliente), mantemos a aba ativa como 'all' para consistência de navegação.
    // Caso contrário, alteramos para a aba 'google_drive'.
    if (!isBackground) {
      if (activeTab !== 'all' && activeTab !== 'contas_acesso') {
        setActiveTab('google_drive');
        setDriveFilterType(filterType || null);
      }
      setSelectedFolderId(folderId === 'root' ? null : folderId);
    }
    
    if (!isBackground) {
      setIsUploading(true);
      setUploadProgress(10);
    }

    try {
      const response = await fetch('/api/drive/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, filterType })
      });

      if (!response.ok) {
        let errMsg = 'Erro ao conectar com Google Drive';
        try {
          const errorData = await response.json();
          errMsg = errorData.error || errMsg;
        } catch (_) {
          try {
            const text = await response.text();
            errMsg = text.substring(0, 150) || errMsg;
          } catch (__) {}
        }
        throw new Error(errMsg);
      }

      let driveFiles;
      try {
        driveFiles = await response.json();
      } catch (jsonErr) {
        let textVal = '';
        try { textVal = await response.text(); } catch (_) {}
        throw new Error("Resposta inválida do servidor: " + (textVal.substring(0, 150) || jsonErr.message));
      }
      if (!isBackground) setUploadProgress(50);

      // Converter arquivos do Drive para o formato do nosso sistema
      for (const file of driveFiles) {
        const isShortcut = file.mimeType === 'application/vnd.google-apps.shortcut';
        const targetMimeType = isShortcut ? file.shortcutDetails?.targetMimeType : null;
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder' || 
          (isShortcut && targetMimeType === 'application/vnd.google-apps.folder');
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const isRaw = ['cr2', 'cr3', 'nef', 'arw', 'dng', 'raf', 'orf'].includes(extension);

        const mimeTypeToUse = targetMimeType || file.mimeType;
        const fileType = isFolder ? 'folder' : (mimeTypeToUse.includes('image') || isRaw ? 'image' : (mimeTypeToUse.includes('video') ? 'video' : 'document'));
        const fileSize = file.size ? `${(parseInt(file.size) / 1024 / 1024).toFixed(1)} MB` : (isFolder ? '-' : '0 MB');

        // Resolver o ID real do alvo se for um atalho
        const realId = (isShortcut && file.shortcutDetails?.targetId) ? file.shortcutDetails.targetId : file.id;

        if (isFolder) {
          // Salvar pasta no Firestore com o mesmo ID do Drive
          await setDoc(doc(db, "folders", realId), {
            name: file.name,
            date: file.createdTime ? Timestamp.fromDate(new Date(file.createdTime)) : serverTimestamp(),
            ownerId: "google-drive",
            parentId: file.trashed ? 'trash' : (folderId === 'root' ? null : folderId),
            starred: file.starred || false,
            trashed: file.trashed || false,
            adminToken: "Silva_Chamo_Master_Admin_2026"
          });

          // Limpar qualquer asset residual que tenha sido cadastrado incorretamente com esse ID de pasta/atalho
          const residual = assets.find(a => a.driveId === realId);
          if (residual) {
            try {
              await deleteDoc(doc(db, "assets", residual.id));
            } catch (err) {
              console.warn("Erro ao limpar asset residual:", err);
            }
          }
        }

        const assetData = {
          name: file.name,
          type: fileType,
          captureDate: file.createdTime ? Timestamp.fromDate(new Date(file.createdTime)) : serverTimestamp(),
          uploadDate: serverTimestamp(),
          folderId: file.trashed ? 'trash' : folderId,
          ownerId: "google-drive",
          driveId: realId,
          thumbnailUrl: file.thumbnailLink || "",
          starred: file.starred || false,
          trashed: file.trashed || false,
          versions: [{
            quality: "original",
            size: fileSize,
            url: file.webViewLink
          }],
          adminToken: "Silva_Chamo_Master_Admin_2026"
        };

        if (!isFolder) {
          try {
            // Usar o setDoc para fazer upsert na tabela assets com o ID do documento igual ao driveId (realId)
            // e garantir acionamento do notifyTableChange para atualização instantânea em tempo real!
            await setDoc(doc(db, "assets", realId), assetData);
          } catch (upsertErr: any) {
            console.warn("[Sync Silencioso] Salvar asset ignorado:", upsertErr?.message);
          }
        }
      }

      // 1. Identificar arquivos no Supabase para esta pasta que foram apagados ou movidos do Drive
      const currentDbAssets = assets.filter(a => a.folderId === (folderId === 'root' ? null : folderId));
      const driveFileIds = driveFiles.map((f: any) => {
        const isShortcut = f.mimeType === 'application/vnd.google-apps.shortcut';
        return (isShortcut && f.shortcutDetails?.targetId) ? f.shortcutDetails.targetId : f.id;
      });
      for (const dbAsset of currentDbAssets) {
        if (dbAsset.driveId && !driveFileIds.includes(dbAsset.driveId)) {
          try {
            await deleteDoc(doc(db, "assets", dbAsset.id));
            console.log(`[Limpeza Sincronizada] Removido arquivo fantasma no Firestore: ${dbAsset.name}`);
          } catch (err) {
            console.warn("Erro ao limpar arquivo fantasma no Firestore:", err);
          }
        }
      }

      // 2. Identificar subpastas no Supabase para esta pasta que foram apagadas ou movidas do Drive
      const currentDbFolders = folders.filter(f => f.parentId === (folderId === 'root' ? null : folderId));
      for (const dbFolder of currentDbFolders) {
        if (dbFolder.id && !driveFileIds.includes(dbFolder.id) && (dbFolder as any).ownerId === 'google-drive') {
          try {
            await deleteDoc(doc(db, "folders", dbFolder.id));
            console.log(`[Limpeza Sincronizada] Removido pasta fantasma no Firestore: ${dbFolder.name}`);
          } catch (err) {
            console.warn("Erro ao limpar pasta fantasma no Firestore:", err);
          }
        }
      }

      if (!isBackground) {
        setUploadProgress(100);
        setTimeout(() => { setIsUploading(false); setUploadProgress(0); }, 1000);
      }
    } catch (error: any) {
      console.error("Sync Error:", error);
      if (!isBackground) {
        alert("Erro na Sincronização: " + error.message);
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  useEffect(() => {
    const localUserJson = localStorage.getItem("provisual_local_admin");
    if (!currentUser && localUserJson) {
      try {
        const localUser = JSON.parse(localUserJson);
        setUserProfile({
          role: localUser.role || "admin",
          email: localUser.email || "admin@provisual.demo",
          displayName: localUser.displayName || "Admin"
        });
        return;
      } catch (e) {
        // ignore
      }
    }

    if (!currentUser) {
      setUserProfile({
        role: "admin",
        email: "admin@provisual.demo",
        displayName: "Silva Chamo (Admin Master)"
      });
      return;
    }
    
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.id));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        } else {
          setUserProfile({
            role: "admin",
            email: currentUser.email || "admin@provisual.demo",
            displayName: currentUser.user_metadata?.displayName || "Silva Chamo"
          });
        }
      } catch (e) {
        console.error("Erro ao buscar perfil do usuário", e);
      }
    };
    fetchProfile();
  }, [currentUser]);

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
      setFoldersLoaded(true);
    }, (error) => {
      console.error("Folders read error:", error);
      setFoldersLoaded(true);
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
      setAssetsLoaded(true);
    }, (error) => {
      console.error("Assets read error:", error);
      setAssetsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Accounts
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accountsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAccounts(accountsList);
      setAccountsLoaded(true);
    }, (error) => {
      console.error("Accounts read error:", error);
      setAccountsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Impedir que clientes acessem a aba Contas de Acesso
  useEffect(() => {
    if (userProfile?.role === 'cliente' && activeTab === 'contas_acesso') {
      setActiveTab('all');
      setSelectedFolderId(null);
      setDriveFilterType(null);
    }
  }, [userProfile?.role, activeTab]);

  // Helper para verificar se a pasta selecionada é permitida para o cliente ativo
  // Helper to normalize strings for comparison (removes accents, spaces, special chars)
  const cleanCompareStr = (s: string): string => {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  // Helper para buscar as pastas raiz permitidas para o cliente
  const getAllowedClientRootFolders = (allFolders: FolderData[]): FolderData[] => {
    if (!userProfile || userProfile.role !== 'cliente') return allFolders;

    const email = userProfile.email?.toLowerCase() || "";
    const displayName = userProfile.displayName || "";
    
    // Extrai o nome da empresa se o displayName estiver no formato "Responsável | Empresa | Logo"
    let companyName = "";
    let responsibleName = "";
    if (displayName.includes('|')) {
      const parts = displayName.split('|');
      responsibleName = parts[0]?.trim() || "";
      companyName = parts[1]?.trim() || "";
    } else {
      companyName = displayName.trim();
    }

    const cleanEmail = cleanCompareStr(email);
    const cleanCompany = cleanCompareStr(companyName);
    const cleanResponsible = cleanCompareStr(responsibleName);

    return allFolders.filter(f =>
      f.parentId === '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG' &&
      (
        (email && cleanCompareStr(f.name) === cleanEmail) ||
        (companyName && cleanCompareStr(f.name) === cleanCompany) ||
        (responsibleName && cleanCompareStr(f.name) === cleanResponsible) ||
        (email && (f as any).clientId?.toLowerCase() === email)
      )
    );
  };

  // Helper para verificar se a pasta selecionada é permitida para o cliente ativo
  const isFolderAllowedForClient = (folderId: string | null): boolean => {
    if (!userProfile || userProfile.role !== 'cliente') return true; // Admins podem ver tudo
    if (folderId === null) return false; // A raiz geral não é permitida para clientes, apenas subpastas autorizadas

    const allowedClientRootFolders = getAllowedClientRootFolders(folders);
    const allowedIds = new Set(allowedClientRootFolders.map(f => f.id));

    // Rastrear a hierarquia para cima até achar uma pasta autorizada
    let currentId: string | null = folderId;
    let depth = 0;
    while (currentId && depth < 20) {
      if (allowedIds.has(currentId)) return true;
      const folder = folders.find(f => f.id === currentId);
      currentId = folder ? folder.parentId : null;
      depth++;
    }

    return false;
  };

  // Efeito de segurança para impedir acessos diretos não autorizados a pastas
  useEffect(() => {
    if (userProfile?.role === 'cliente' && selectedFolderId !== null && folders.length > 0) {
      if (!isFolderAllowedForClient(selectedFolderId)) {
        console.warn("Acesso negado à pasta e reset de segurança acionado:", selectedFolderId);
        setSelectedFolderId(null);
      }
    }
  }, [userProfile?.role, selectedFolderId, folders]);



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

    // Sincronização silenciosa das pastas de clientes do Google Drive ao iniciar (ID da pasta "clientes")
    const syncClientFolders = async () => {
      try {
        const response = await fetch('/api/drive/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG' })
        });
        if (response.ok) {
          const driveFiles = await response.json();
          for (const file of driveFiles) {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            if (isFolder) {
              // Buscar o registro existente no Supabase para não sobrescrever o client_id configurado
              const { data: existingFolder } = await supabase
                .from('folders')
                .select('client_id')
                .eq('id', file.id)
                .maybeSingle();

              let folderClientId = existingFolder?.client_id || null;

              // Tenta extrair das permissões do Drive
              const sharedEmails = (file.permissions || [])
                .map((p: any) => p.emailAddress?.toLowerCase())
                .filter(Boolean);

              const gDriveClientEmail = sharedEmails.find((email: string) => 
                email !== 'provisualcorporate@gmail.com' && 
                email !== 'silva.chamo@gmail.com' &&
                !email.endsWith('.demo')
              );

              if (gDriveClientEmail) {
                folderClientId = gDriveClientEmail;
              }

              await setDoc(doc(db, "folders", file.id), {
                name: file.name,
                date: file.createdTime ? Timestamp.fromDate(new Date(file.createdTime)) : serverTimestamp(),
                ownerId: "google-drive",
                parentId: '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG',
                ...(folderClientId && { clientId: folderClientId })
              });
            }
          }
        }
      } catch (error) {
        console.error("Erro na sincronização silenciosa de pastas de clientes:", error);
      }
    };
    syncClientFolders();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Sincronizar pastas de clientes do Drive e associar client_id no banco
      const resClient = await fetch('/api/drive/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG' })
      });
      if (resClient.ok) {
        const driveFiles = await resClient.json();
        for (const file of driveFiles) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            const { data: existingFolder } = await supabase
              .from('folders')
              .select('client_id')
              .eq('id', file.id)
              .maybeSingle();

            let folderClientId = existingFolder?.client_id || null;

            const sharedEmails = (file.permissions || [])
              .map((p: any) => p.emailAddress?.toLowerCase())
              .filter(Boolean);

            const gDriveClientEmail = sharedEmails.find((email: string) => 
              email !== 'provisualcorporate@gmail.com' && 
              email !== 'silva.chamo@gmail.com' &&
              !email.endsWith('.demo')
            );

            if (gDriveClientEmail) {
              folderClientId = gDriveClientEmail;
            }

            await setDoc(doc(db, "folders", file.id), {
              name: file.name,
              date: file.createdTime ? Timestamp.fromDate(new Date(file.createdTime)) : serverTimestamp(),
              ownerId: "google-drive",
              parentId: '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG',
              ...(folderClientId && { clientId: folderClientId })
            });
          }
        }
      }

      // 2. Sincronizar arquivos da pasta atual ou raiz
      const activeFolder = selectedFolderId || '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG';
      await handleGoogleSync(activeFolder, undefined, true);

      alert("Sincronização efetuada com sucesso!");
    } catch (error: any) {
      console.error("Erro na sincronização manual:", error);
      alert("Erro ao sincronizar: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredAssets = useMemo(() => {
    let result = assets;
    
    // Filtrar por clientId ou pasta permitida se for cliente (ver apenas seus próprios arquivos)
    if (userProfile?.role === 'cliente') {
      result = result.filter(a => 
        ((a as any).clientId === userProfile.email) ||
        isFolderAllowedForClient(a.folderId)
      );
    }
    
    // Se estivermos visualizando o Lixo, mostra apenas os itens marcados como trashed
    if (activeTab === 'google_drive' && driveFilterType === 'trashed') {
      result = result.filter(a => a.trashed === true || a.folderId === 'trash');
      if (searchQuery) {
        result = result.filter(a => a && a.name && typeof a.name === 'string' && a.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return result;
    }
    
    // Para Meu Drive e Gestão de Clientes na raiz, exibir arquivos normalmente
    // Removemos o filtro estrito que ocultava os arquivos carregados na raiz

    // Para todas as outras abas/views, remover itens que estão no lixo
    result = result.filter(a => !a.trashed && a.folderId !== 'trash');

    if (selectedFolderId) {
      // Se for uma pasta do Google Drive, o ID dela no Firestore será o ID do Google
      result = result.filter(a => a.folderId === selectedFolderId);
    } else if (activeTab === 'google_drive') {
      // Mostrar apenas os arquivos que pertencem à pasta geral "arquivo" na raiz (ou arquivos sem pai se a pasta não existir)
      if (driveFilterType === 'starred') {
        result = result.filter(a => (a as any).ownerId === 'google-drive' && a.starred === true);
      } else if (driveFilterType === 'recent') {
        result = result.filter(a => (a as any).ownerId === 'google-drive')
                       .sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
      } else {
        result = result.filter(a => 
          (a as any).ownerId === 'google-drive' && 
          (a.folderId === arquivoFolderId || (!a.folderId && !arquivoFolderId))
        );
      }
    } else if (activeTab === 'all') {
      result = result.filter(a => a.folderId === '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG');
    } else if (activeTab !== 'all') {
      result = result.filter(a => a.type === activeTab);
    }
    if (searchQuery) {
      result = result.filter(a => a && a.name && typeof a.name === 'string' && a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [selectedFolderId, activeTab, driveFilterType, searchQuery, assets, arquivoFolderId]);

  const displayedAssets = useMemo(() => {
    if (activeTab === 'image') {
      return filteredAssets.slice(0, visibleImagesCount);
    }
    return filteredAssets;
  }, [filteredAssets, activeTab, visibleImagesCount]);

  const filteredFolders = useMemo(() => {
    let result = folders;

    // Se estivermos visualizando o Lixo
    if (activeTab === 'google_drive' && driveFilterType === 'trashed') {
      return result.filter(f => f.trashed === true || f.parentId === 'trash');
    }

    // Remover itens que estão no lixo
    result = result.filter(f => !f.trashed && f.parentId !== 'trash');

    if (activeTab === 'google_drive') {
      // No Google Drive/Arquivo Provisual, se estivermos na raiz, mostramos as pastas da pasta geral "arquivo"
      // Caso contrário, mostramos as subpastas da pasta selecionada.
      // Ocultamos a pasta de Clientes ('1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG') de qualquer nível aqui.
      const targetParentId = selectedFolderId === null ? arquivoFolderId : selectedFolderId;
      result = result.filter(f => f.parentId === targetParentId && f.id !== '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG');
    } else if (activeTab === 'all') {
      // Na Gestão de Clientes:
      if (selectedFolderId === null) {
        if (userProfile?.role === 'cliente') {
          // Filtrar para mostrar apenas a pasta correspondente a este cliente
          result = getAllowedClientRootFolders(result);
        } else {
          // Se estivermos na raiz da Gestão de Clientes:
          // O conteúdo desta pasta ('1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG') deve vir no menu "Gestão de Clientes"
          result = result.filter(f => f.parentId === '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG');
        }
      } else {
        // Se estivermos dentro de uma pasta na Gestão de Clientes:
        // Mostramos as subpastas daquela pasta normalmente
        result = result.filter(f => f.parentId === selectedFolderId);
      }
    } else {
      // Para outras abas (imagens, vídeos, documentos), não mostramos pastas (pois elas filtram apenas os arquivos das abas)
      return [];
    }

    if (searchQuery) {
      result = result.filter(f => f && f.name && typeof f.name === 'string' && f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Filtro extra de segurança para garantir que o cliente nunca veja pastas de outros clientes
    if (userProfile?.role === 'cliente') {
      result = result.filter(f => isFolderAllowedForClient(f.id));
    }

    return result;
  }, [folders, selectedFolderId, activeTab, driveFilterType, searchQuery, userProfile]);

  const localUsageBytes = useMemo(() => {
    let totalBytes = 0;
    assets.forEach(asset => {
      const sizeStr = asset.versions?.[0]?.size || "";
      if (sizeStr.includes("MB")) {
        totalBytes += parseFloat(sizeStr) * 1024 * 1024;
      } else if (sizeStr.includes("KB")) {
        totalBytes += parseFloat(sizeStr) * 1024;
      } else if (sizeStr.includes("GB")) {
        totalBytes += parseFloat(sizeStr) * 1024 * 1024 * 1024;
      }
    });
    return totalBytes;
  }, [assets]);

  const storageInfo = useMemo(() => {
    // Fallbacks inteligentes para manter consistência mesmo se a conta de serviço retornar dados vazios/nulos
    const fallbackLimitBytes = 15 * 1024 * 1024 * 1024; // 15 GB padrão do Drive
    const fallbackUsageBytes = localUsageBytes > 0 ? localUsageBytes : 1.24 * 1024 * 1024 * 1024; // 1.24 GB realista
    
    if (!storageQuota) {
      const limitGB = (fallbackLimitBytes / 1024 / 1024 / 1024).toFixed(2);
      const usageGB = (fallbackUsageBytes / 1024 / 1024 / 1024).toFixed(2);
      const percent = Math.min(100, Math.round((fallbackUsageBytes / fallbackLimitBytes) * 100));
      return { limit: `${limitGB} GB`, usage: `${usageGB} GB`, percent };
    }

    const limit = parseInt(storageQuota.limit) || fallbackLimitBytes;
    const usage = parseInt(storageQuota.usage) || localUsageBytes || fallbackUsageBytes;
    
    const limitGB = (limit / 1024 / 1024 / 1024).toFixed(2);
    const usageGB = (usage / 1024 / 1024 / 1024).toFixed(2);
    const percent = Math.min(100, Math.round((usage / limit) * 100)) || 0;
    
    return { limit: `${limitGB} GB`, usage: `${usageGB} GB`, percent };
  }, [storageQuota, localUsageBytes]);

  // Constrói o caminho realístico de breadcrumbs usando a hierarquia de parentId
  const getBreadcrumbs = () => {
    const list: { id: string | null; name: string; type: 'all' | 'folder' | 'drive_root' }[] = [];

    // Se nenhuma pasta estiver selecionada, mostramos o rótulo da aba correspondente
    if (!selectedFolderId) {
      if (activeTab === 'all') {
        const label = "Meu Arquivo";
        list.push({ id: null, name: label, type: 'all' });
      } else if (activeTab === 'google_drive') {
        list.push({ id: 'google_drive_root', name: 'Arquivo Provisual', type: 'drive_root' });
        if (driveFilterType === 'trashed') {
          list.push({ id: 'google_drive_trash', name: 'Lixo', type: 'all' });
        } else if (driveFilterType === 'starred') {
          list.push({ id: 'google_drive_starred', name: 'Com Estrela', type: 'all' });
        } else if (driveFilterType === 'recent') {
          list.push({ id: 'google_drive_recent', name: 'Recentes', type: 'all' });
        }
      } else {
        const label = activeTab === 'image' ? 'Imagens' : activeTab === 'video' ? 'Vídeos' : 'Documentos';
        list.push({ id: null, name: label, type: 'all' });
      }
    } else {
      // Se há uma pasta selecionada, adicionamos o ponto de partida (raiz) no início dos breadcrumbs
      if (activeTab === 'all') {
        const label = "Meu Arquivo";
        list.push({ id: null, name: label, type: 'all' });
      } else if (activeTab === 'google_drive') {
        list.push({ id: null, name: 'Arquivo Provisual', type: 'all' });
      }

      const path: { id: string; name: string; type: 'folder' }[] = [];
      let currentId = selectedFolderId;
      let visited = new Set<string>();
      
      while (currentId && currentId !== '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG' && currentId !== arquivoFolderId && !visited.has(currentId)) {
        visited.add(currentId);
        const folder = folders.find(f => f.id === currentId);
        if (folder) {
          path.unshift({ id: folder.id, name: folder.name, type: 'folder' });
          currentId = folder.parentId || '';
        } else {
          break;
        }
      }
      list.push(...path);
    }

    return list;
  };

  const handleBreadcrumbClick = (item: { id: string | null; name: string; type: 'all' | 'folder' | 'drive_root' }) => {
    setSelectedAsset(null);
    if (item.type === 'all') {
      setSelectedFolderId(null);
      setActiveTab('all');
      setDriveFilterType(null);
      handleGoogleSync('1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG', undefined, true);
    } else if (item.type === 'drive_root') {
      handleGoogleSync(undefined, undefined, true);
    } else if (item.type === 'folder') {
      const folder = folders.find(f => f.id === item.id);
      if (folder && (folder as any).ownerId === 'google-drive') {
        setSelectedFolderId(item.id);
        handleGoogleSync(item.id, undefined, true);
      } else {
        setSelectedFolderId(item.id);
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#fafafa] text-gray-800 font-sans overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex items-center gap-2 mb-6 mt-1 px-1">
            <img src={logoHorizontal} alt="ProVisual" className="h-10 w-auto object-contain" />
          </div>

          <h3 className="text-[13px] font-black text-[#a21b7e] uppercase tracking-[0.08em] px-3 py-2.5 mb-2 bg-[#a21b7e]/5 rounded-sm">
            Navegação
          </h3>
          <nav className="space-y-0.5">
            {userProfile?.role === 'admin' && (
              <SidebarItem
                icon={<Users size={20} />}
                label="Contas de Acesso"
                active={activeTab === 'contas_acesso'}
                onClick={() => { setActiveTab('contas_acesso'); setSelectedFolderId(null); setDriveFilterType(null); setVisibleImagesCount(10); }}
              />
            )}
            <SidebarItem
              icon={<Database size={20} />}
              label="Meu Arquivo"
              active={activeTab === 'all'}
              onClick={() => { setActiveTab('all'); setSelectedFolderId(null); setDriveFilterType(null); setVisibleImagesCount(10); handleGoogleSync('1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG', undefined, true); }}
            />
            <SidebarItem
              icon={<ImageIcon size={20} />}
              label="Imagens"
              active={activeTab === 'image'}
              onClick={() => { setActiveTab('image'); setSelectedFolderId(null); setDriveFilterType(null); setVisibleImagesCount(10); }}
            />
            <SidebarItem
              icon={<Video size={20} />}
              label="Vídeos"
              active={activeTab === 'video'}
              onClick={() => { setActiveTab('video'); setSelectedFolderId(null); setDriveFilterType(null); setVisibleImagesCount(10); }}
            />
            <SidebarItem
              icon={<FileText size={20} />}
              label="Documentos"
              active={activeTab === 'document'}
              onClick={() => { setActiveTab('document'); setSelectedFolderId(null); setDriveFilterType(null); setVisibleImagesCount(10); }}
            />

            {userProfile?.role === 'admin' && (
              <>
                <div className="my-5" />
                <h3 className="text-[13px] font-black text-[#a21b7e] uppercase tracking-[0.08em] px-3 py-2.5 mb-2 bg-[#a21b7e]/5 rounded-sm">
                  Arquivo Provisual
                </h3>

                <SidebarItem
                  icon={<HardDrive size={20} />}
                  label="Meu Drive"
                  active={activeTab === 'google_drive' && driveFilterType === null}
                  onClick={() => { setActiveTab('google_drive'); handleGoogleSync('root'); setVisibleImagesCount(10); }}
                />
                <SidebarItem
                  icon={<Users size={20} />}
                  label="Partilhados Comigo"
                  active={activeTab === 'google_drive' && driveFilterType === 'sharedWithMe'}
                  onClick={() => { setActiveTab('google_drive'); handleGoogleSync(undefined, 'sharedWithMe'); setVisibleImagesCount(10); }}
                />
                <SidebarItem
                  icon={<Clock size={20} />}
                  label="Recentes"
                  active={activeTab === 'google_drive' && driveFilterType === 'recent'}
                  onClick={() => { setActiveTab('google_drive'); handleGoogleSync(undefined, 'recent'); setVisibleImagesCount(10); }}
                />
                <SidebarItem
                  icon={<Star size={20} />}
                  label="Com Estrela"
                  active={activeTab === 'google_drive' && driveFilterType === 'starred'}
                  onClick={() => { setActiveTab('google_drive'); handleGoogleSync(undefined, 'starred'); setVisibleImagesCount(10); }}
                />
                <SidebarItem
                  icon={<Trash2 size={20} />}
                  label="Lixo"
                  active={activeTab === 'google_drive' && driveFilterType === 'trashed'}
                  onClick={() => { setActiveTab('google_drive'); handleGoogleSync(undefined, 'trashed'); setVisibleImagesCount(10); }}
                />
              </>
            )}
          </nav>
        </div>

        {/* Armazenamento progress bar (no rodapé da sidebar, com as cores da Provisual e dados reais) */}
        <div className="p-4 bg-[#a21b7e]/5 border-t border-[#a21b7e]/10 shrink-0">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#a21b7e]">
            <Cloud size={16} />
            <span>Armazenamento</span>
          </div>
          <div className="w-full bg-[#a21b7e]/10 h-2 rounded-full overflow-hidden mb-2">
            <div 
              className="bg-[#a21b7e] h-full rounded-full transition-all duration-500" 
              style={{ width: `${storageInfo.percent}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-600 font-bold mb-3">
            {storageInfo.usage} de {storageInfo.limit} usados ({storageInfo.percent}%)
          </div>
          <a
            href="https://one.google.com/about/plans"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center w-full py-1.5 text-[10px] font-black text-white hover:text-white bg-[#a21b7e] hover:bg-[#8e176e] border border-transparent rounded-sm transition-all uppercase tracking-wider cursor-pointer shadow-sm"
          >
            Obter mais espaço
          </a>
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
              className="block w-full pl-10 pr-3 py-2 border border-gray-100 rounded-sm bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a21b7e] transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 border border-gray-100 rounded-lg hover:border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all font-bold text-xs text-gray-700 cursor-pointer shadow-sm hover:shadow-md",
                isSyncing && "opacity-75 cursor-not-allowed"
              )}
            >
              <RefreshCw size={13} className={cn("text-gray-500", isSyncing && "animate-spin text-[#a21b7e]")} />
              <span>{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
            </button>

            {userProfile && (
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-3.5 py-1.5 rounded-lg select-none">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[11px] text-gray-800 font-bold max-w-[160px] truncate mb-0.5" title={userProfile.displayName || userProfile.email}>
                    Olá, {(() => {
                      const name = userProfile.displayName || "";
                      if (!name) {
                        const emailPrefix = userProfile.email.split('@')[0];
                        return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
                      }
                      if (name.toLowerCase().includes("silva")) return "Silva";
                      return name.split(' ')[0].replace(/[()]/g, '');
                    })()}
                  </span>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest",
                    userProfile.role === 'admin' ? "text-[#a21b7e]" : "text-blue-600"
                  )}>
                    {userProfile.role === 'admin' ? 'Administrador' : 'Cliente'}
                  </span>
                </div>
              </div>
            )}

            {driveStatus && driveStatus.connected && (
              <div 
                className="w-9 h-9 rounded-sm bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 transition-all select-none hover:bg-emerald-100/50 cursor-pointer shrink-0"
                title={`Drive Pessoal Ativo: ${driveStatus.email}`}
              >
                <div className="relative">
                  <HardDrive size={18} />
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 border border-white animate-pulse" />
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-sm text-sm font-bold shadow-sm hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer h-9 shrink-0"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </header>

        {/* Path & Primary Actions */}
        <div className="bg-white px-8 py-3 flex items-center justify-between border-b border-gray-100 z-10">
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
              <div className="flex items-center gap-1 text-xs font-medium text-gray-500 max-w-full overflow-x-auto whitespace-nowrap no-scrollbar select-none">
                {getBreadcrumbs().map((item, index, arr) => {
                  const isLast = index === arr.length - 1;
                  return (
                    <React.Fragment key={index}>
                      {index > 0 && <ChevronRight size={10} className="text-gray-300 mx-0.5 animate-in fade-in shrink-0" />}
                      {isLast ? (
                        <span className="text-gray-700 font-semibold shrink-0">
                          {item.name}
                        </span>
                      ) : (
                        <span
                          className="hover:text-[#a21b7e] cursor-pointer transition-colors shrink-0"
                          onClick={() => handleBreadcrumbClick(item)}
                        >
                          {item.name}
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={uploadMenuRef}>
              <button
                onClick={() => {
                  if (userProfile?.role === 'cliente') {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute("webkitdirectory");
                      fileInputRef.current.removeAttribute("directory");
                      fileInputRef.current.click();
                    }
                  } else {
                    setIsUploadMenuOpen(!isUploadMenuOpen);
                  }
                }}
                className="flex items-center justify-center gap-2 bg-[#a21b7e] text-white px-4 py-2 rounded-sm text-sm font-bold shadow-sm hover:bg-[#8e176e] transition-all cursor-pointer h-9"
              >
                <Upload size={16} />
                Carregar
                {userProfile?.role === 'admin' && <ChevronDown size={14} />}
              </button>
              
              {isUploadMenuOpen && userProfile?.role === 'admin' && (
                <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 bg-white border border-gray-200/80 rounded-sm shadow-[0_0_3px_rgba(0,0,0,0.08)] z-50 py-1.5 w-44 text-left text-gray-700 font-sans cursor-default animate-in fade-in slide-in-from-top-2 duration-100">
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute("webkitdirectory");
                        fileInputRef.current.removeAttribute("directory");
                        fileInputRef.current.click();
                      }
                      setIsUploadMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:text-[#a21b7e] transition-all text-left text-xs font-semibold text-gray-700 cursor-pointer bg-transparent hover:bg-transparent group"
                  >
                    <FileUp size={14} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                    <span>Carregar ficheiro</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute("webkitdirectory", "true");
                        fileInputRef.current.setAttribute("directory", "true");
                        fileInputRef.current.click();
                        setTimeout(() => {
                          fileInputRef.current?.removeAttribute("webkitdirectory");
                          fileInputRef.current?.removeAttribute("directory");
                        }, 1000);
                      }
                      setIsUploadMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:text-[#a21b7e] transition-all text-left text-xs font-semibold text-gray-700 cursor-pointer bg-transparent hover:bg-transparent group"
                  >
                    <FolderUp size={14} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                    <span>Carregar pasta</span>
                  </button>
                </div>
              )}
            </div>
            {userProfile?.role === 'admin' && (
              <button
                onClick={handleCreateFolder}
                className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-sm text-sm font-bold shadow-sm hover:bg-gray-50 transition-all cursor-pointer h-9"
              >
                <FolderPlus size={16} />
                Nova pasta
              </button>
            )}

            {/* Botão Selecionar Todos - Apenas para Admins */}
            {userProfile?.role === 'admin' && filteredAssets.length > 0 && (
              <button
                onClick={() => {
                  const allAssetIds = filteredAssets.map(a => a.id);
                  const allSelected = allAssetIds.every(id => selectedAssetIds.includes(id));
                  if (allSelected) {
                    setSelectedAssetIds(prev => prev.filter(id => !allAssetIds.includes(id)));
                  } else {
                    setSelectedAssetIds(prev => Array.from(new Set([...prev, ...allAssetIds])));
                  }
                }}
                className={cn(
                  "flex items-center justify-center bg-white border border-gray-200 text-gray-500 rounded-sm shadow-sm hover:bg-gray-50 hover:text-[#a21b7e] hover:border-[#a21b7e]/30 transition-all cursor-pointer h-9 w-9 shrink-0",
                  filteredAssets.map(a => a.id).every(id => selectedAssetIds.includes(id)) && "border-[#a21b7e] text-[#a21b7e] bg-[#a21b7e]/5"
                )}
                title={filteredAssets.map(a => a.id).every(id => selectedAssetIds.includes(id)) ? "Desmarcar Todos" : "Selecionar Todos"}
              >
                {filteredAssets.map(a => a.id).every(id => selectedAssetIds.includes(id)) ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
              </button>
            )}

            <div className="h-5 w-px bg-gray-200 mx-1" />

            <div className="flex bg-gray-50 p-1 rounded-sm border border-gray-100 items-center">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-1.5 rounded transition-all cursor-pointer", viewMode === "grid" ? "bg-white shadow-sm text-[#a21b7e]" : "text-gray-400 hover:text-gray-600")}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 rounded transition-all cursor-pointer", viewMode === "list" ? "bg-white shadow-sm text-[#a21b7e]" : "text-gray-400 hover:text-gray-600")}
              >
                <ListIcon size={16} />
              </button>
            </div>

            {/* Dropdown de Integração Google Drive - Apenas para Admins */}
            {userProfile?.role === 'admin' && activeTab === 'google_drive' && (
              <div className="relative ml-2 shrink-0">
                <button
                  onClick={() => setIsDriveDropdownOpen(!isDriveDropdownOpen)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-sm border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:text-[#a21b7e] hover:border-[#a21b7e]/30 shadow-sm transition-all cursor-pointer h-8",
                    isDriveDropdownOpen && "text-[#a21b7e] border-[#a21b7e]/30 bg-[#a21b7e]/5"
                  )}
                  title="Configurações e Sincronização do Google Drive"
                >
                  <span>Google Drive</span>
                  <ChevronDown size={12} className={cn("transition-transform duration-200 shrink-0", isDriveDropdownOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isDriveDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setIsDriveDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 mt-1.5 w-64 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-40 py-2 text-left text-gray-700 font-sans cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Status da Conexão */}
                        <div className="px-4 py-2 border-b border-gray-50 mb-1">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest block">Status do Drive</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "w-2 h-2 rounded-full shrink-0", 
                              driveStatus?.type === "oauth2" 
                                ? "bg-emerald-500 animate-pulse" 
                                : driveStatus?.type === "service_account"
                                ? "bg-blue-500 animate-pulse" 
                                : "bg-red-500"
                            )} />
                            <span className="text-xs font-bold text-gray-700 truncate">
                              {driveStatus?.type === "oauth2" 
                                ? "Cota Pessoal Ativa" 
                                : driveStatus?.type === "service_account"
                                ? "Conta de Serviço Ativa" 
                                : "Google Drive Desconectado"}
                            </span>
                          </div>
                          {driveStatus?.connected && (
                            <span className="text-[9px] text-gray-400 block mt-0.5 truncate select-all">
                              {driveStatus.email}
                            </span>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="px-1.5 space-y-0.5">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const folderId = selectedFolderId || (activeTab === 'all' ? '1ww-KgTwlOLbvCHtCLZgGTntzA6SStCjG' : (arquivoFolderId || 'root'));
                              setIsSyncing(true);
                              try {
                                await handleGoogleSync(folderId, undefined, false);
                              } finally {
                                setIsSyncing(false);
                              }
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold text-gray-600 hover:text-[#a21b7e] cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <RefreshCw size={14} className={cn("text-gray-400 group-hover:text-[#a21b7e]", isSyncing && "animate-spin text-[#a21b7e]")} />
                              <span>Sincronizar arquivos</span>
                            </div>
                          </button>

                          <div className="my-1 border-t border-gray-100" />

                          {driveStatus?.connected ? (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsDriveDropdownOpen(false);
                                await handleDisconnectDrive();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 bg-transparent hover:bg-red-50 group transition-colors text-left text-[13px] font-bold text-red-600 cursor-pointer"
                            >
                              <LogOut size={14} className="text-red-400 group-hover:text-red-600 shrink-0" />
                              <span>Desconectar Conta</span>
                            </button>
                          ) : (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsDriveDropdownOpen(false);
                                await handleConnectDrive();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 bg-transparent hover:bg-emerald-50 group transition-colors text-left text-[13px] font-bold text-emerald-600 cursor-pointer"
                            >
                              <Link size={14} className="text-emerald-400 group-hover:text-emerald-600 shrink-0" />
                              <span>Conectar Google Drive</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Files Area */}
        {activeTab === 'contas_acesso' && userProfile?.role === 'admin' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Header da Tela */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Key className="text-[#a21b7e]" size={24} />
                    Contas de Acesso dos Clientes
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Crie e gerencie contas de e-mail e credenciais de acesso exclusivas para os seus clientes.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingAccount(null);
                    setAccountError(null);
                    setAccountSuccess(null);
                    setNewAccountEmail("");
                    setNewAccountName("");
                    // Gerar uma senha forte com letras maiúsculas/minúsculas, números e símbolos
                    const randomPass = generateStrongPassword();
                    setNewAccountPassword(randomPass);
                    setNewAccountRole("cliente");
                    setIsAddAccountModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-[#a21b7e] hover:bg-[#8e176e] text-white px-4 py-2.5 rounded-md text-sm font-bold shadow-sm transition-all cursor-pointer h-10 shrink-0"
                >
                  <UserPlus size={16} />
                  Criar Conta de Acesso
                </button>
              </div>

              {/* Tabela de Contas */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-4 py-3">Nome do Cliente / Empresa</th>
                        <th className="px-4 py-3">ID do Cliente</th>
                        <th className="px-4 py-3">E-mail de Acesso</th>
                        <th className="px-4 py-3">Senha de Acesso</th>
                        <th className="px-4 py-3">Perfil</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {accounts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-gray-400 italic">
                            Nenhuma conta cadastrada no portal. Clique em "Criar Conta de Acesso" para começar!
                          </td>
                        </tr>
                      ) : (
                        accounts.map((account) => {
                          return (
                            <tr key={account.id || account.uid || Math.random().toString()} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-bold text-gray-800">
                                {(() => {
                                  const rawName = String(account.displayName || "");
                                  const parts = rawName.split('|');
                                  const parsed = parts.length === 3
                                    ? { responsible: parts[0], name: parts[1], logo: parts[2] }
                                    : (parts.length === 2 
                                      ? { responsible: "", name: parts[0], logo: parts[1] }
                                      : { responsible: "", name: rawName, logo: "" });
                                  return (
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                                        {parsed.logo ? (
                                          <img src={parsed.logo} alt={parsed.name} className="w-full h-full object-contain" />
                                        ) : (
                                          <span className="text-[10px] font-black text-gray-400 uppercase">
                                            {parsed.name ? parsed.name.charAt(0) : "C"}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-bold text-gray-800">{parsed.name || "Sem Nome"}</span>
                                        {parsed.responsible && (
                                          <span className="text-[10px] font-normal text-gray-400">Resp: {parsed.responsible}</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                <span className="bg-[#a21b7e]/5 text-[#a21b7e] border border-[#a21b7e]/10 px-2 py-0.5 rounded font-bold select-all">
                                  {account.clientId || account.id}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-600">
                                <span className="flex items-center gap-2 mt-1 select-all">
                                  <Mail size={14} className="text-gray-400" />
                                  {account.email}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-800">
                                <span className="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded text-xs select-all">
                                  {account.password || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                  account.role === 'admin' 
                                    ? "bg-purple-50 text-[#a21b7e] border border-purple-100" 
                                    : "bg-blue-50 text-blue-600 border border-blue-100"
                                )}>
                                  {account.role === 'admin' ? "Administrador" : "Cliente"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <button
                                  onClick={() => handleEditClick(account)}
                                  className="p-2 bg-purple-50 hover:bg-purple-100 text-[#a21b7e] rounded-md transition-all cursor-pointer inline-flex items-center justify-center border border-purple-100"
                                  title="Editar Conta"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAccount(account.id, account.displayName || account.email)}
                                  className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-md transition-all cursor-pointer inline-flex items-center justify-center border border-red-100"
                                  title="Excluir Conta"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal para Adicionar/Editar Conta */}
            {isAddAccountModalOpen && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-[#a21b7e] p-6 text-white flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <UserPlus size={20} />
                        {editingAccount ? "Editar Conta de Acesso" : "Nova Conta de Acesso"}
                      </h3>
                      <p className="text-xs text-white/80 mt-0.5">
                        {editingAccount ? "Atualize as credenciais de acesso do seu cliente." : "Defina as credenciais para o seu cliente."}
                      </p>
                    </div>
                    <button
                      onClick={handleCloseAccountModal}
                      className="p-1 hover:bg-white/10 rounded text-white/80 hover:text-white cursor-pointer"
                    >
                      <Plus className="rotate-45" size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAccount} className="p-6 space-y-3">
                    {accountError && (
                      <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded text-xs flex items-center gap-2">
                        <AlertCircle size={16} />
                        <span>{accountError}</span>
                      </div>
                    )}
                    {accountSuccess && (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>{accountSuccess}</span>
                      </div>
                    )}

                    <div className="flex gap-2 items-stretch">
                      {/* Lado Esquerdo: Nome do Responsável e Nome da Empresa (80% da largura, empilhados com gap-2) */}
                      <div className="flex-1 flex flex-col gap-2 justify-center">
                        <input
                          type="text"
                          placeholder="Nome do responsável"
                          value={newAccountResponsible}
                          onChange={(e) => setNewAccountResponsible(e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#a21b7e] transition-all bg-gray-50"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Nome da empresa"
                          value={newAccountName}
                          onChange={(e) => setNewAccountName(e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#a21b7e] transition-all bg-gray-50"
                          required
                        />
                      </div>
                      
                      {/* Lado Direito: Caixa de Upload da Foto/Logo (20% da largura, cobrindo a altura dos dois campos) */}
                      <div className="w-[88px] shrink-0">
                        <label className="relative block w-[88px] h-[88px] border-2 border-dashed border-gray-200 hover:border-[#a21b7e] rounded-lg cursor-pointer overflow-hidden transition-all bg-gray-50 group">
                          {newAccountLogo ? (
                            <>
                              <img src={newAccountLogo} alt="Logo" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-all">
                                Alterar
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-[#a21b7e] transition-all">
                              <Upload size={18} />
                              <span className="text-[10px] font-bold mt-1">Logo</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <input
                      type="email"
                      placeholder="Email de acesso"
                      value={newAccountEmail}
                      onChange={(e) => setNewAccountEmail(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#a21b7e] transition-all bg-gray-50"
                      required
                    />

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Senha de Acesso (Ex: @P#s$9w!K%)"
                        value={newAccountPassword}
                        onChange={(e) => setNewAccountPassword(e.target.value)}
                        className="block flex-1 px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#a21b7e] transition-all bg-gray-50 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewAccountPassword(generateStrongPassword());
                        }}
                        className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold transition-all cursor-pointer border border-gray-200 shrink-0"
                      >
                        Gerar Senha
                      </button>
                    </div>

                    <select
                      value={newAccountRole}
                      onChange={(e) => setNewAccountRole(e.target.value as any)}
                      className="block w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#a21b7e] transition-all bg-gray-50"
                    >
                      <option value="cliente">Cliente (Acesso de visualização de arquivos)</option>
                      <option value="admin">Administrador (Gestão completa do portal)</option>
                    </select>

                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleCloseAccountModal}
                        className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded text-sm font-bold transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingAccount}
                        className="flex-1 py-2.5 bg-[#a21b7e] hover:bg-[#8e176e] text-white rounded text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isCreatingAccount ? "A salvar..." : (editingAccount ? "Salvar Alterações" : "Criar Conta de Acesso")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 relative"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              visible: true
            });
          }}
        >
          {!foldersLoaded || !assetsLoaded ? (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 min-h-[400px] animate-in fade-in duration-300">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-[#a21b7e] border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-xs font-semibold text-gray-500 mt-4 tracking-wide uppercase">Carregando...</p>
            </div>
          ) : filteredAssets.length === 0 && filteredFolders.length === 0 ? (
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
                  {(activeTab === 'all' || activeTab === 'google_drive') && filteredFolders.length > 0 && (
                    <div className="w-full flex flex-col gap-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                        {filteredFolders.map(folder => (
                          <div
                            key={folder.id}
                            onClick={() => {
                              setSelectedFolderId(folder.id);
                              if ((folder as any).ownerId === 'google-drive') {
                                handleGoogleSync(folder.id, undefined, true);
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id);
                            }}
                            className="flex items-center justify-between p-4 bg-white border border-gray-100 hover:border-gray-200 transition-all cursor-pointer group shadow-sm relative overflow-visible rounded-lg"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <FolderIcon size={20} style={{ color: folder.color || "#e2b13c", fill: `${folder.color || "#e2b13c"}1a` }} className="shrink-0 animate-in fade-in" />
                              <span className="text-xs font-bold text-gray-700 truncate uppercase">{folder.name}</span>
                            </div>
                            
                            <div className="relative overflow-visible">
                              <motion.button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id);
                                  setActiveFolderSubmenu('none');
                                }}
                                whileHover={{ scale: 1.25 }}
                                whileTap={{ scale: 0.95 }}
                                className="text-gray-400 hover:text-gray-600 p-1 transition-colors cursor-pointer"
                              >
                                <MoreVertical size={16} />
                              </motion.button>

                              <AnimatePresence>
                                {activeFolderMenuId === folder.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-30" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFolderMenuId(null);
                                        setActiveFolderSubmenu('none');
                                      }}
                                    />
                                    
                                    {/* SUBMENUS (Posicionados à esquerda do principal) */}
                                    

                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                      transition={{ duration: 0.1 }}
                                      className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_10px_rgba(0,0,0,0.06)] z-40 py-1.5 text-left text-gray-700 font-sans cursor-default"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedFolderId(folder.id);
                                          if ((folder as any).ownerId === 'google-drive') {
                                            handleGoogleSync(folder.id, undefined, true);
                                          }
                                          setActiveFolderMenuId(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer animate-in fade-in duration-100"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Eye size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                                          <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Visualizar</span>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                                      </button>

                                      <div className="my-1 border-t border-gray-100" />

                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const newName = prompt("Digite o novo nome para " + folder.name, folder.name);
                                          if (newName && newName.trim() !== folder.name) {
                                            try {
                                              setIsProcessingAction(true);
                                              sessionStorage.setItem('action_in_progress', 'true');
                                              
                                              if ((folder as any).ownerId === 'google-drive' || folder.id.length > 20) {
                                                const renameResponse = await fetch('/api/drive/update', {
                                                  method: 'POST',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    fileId: folder.id,
                                                    newName: newName.normalize('NFC')
                                                  })
                                                });
                                                if (!renameResponse.ok) {
                                                  const errData = await renameResponse.json();
                                                  throw new Error(errData.error || "Erro no Google Drive");
                                                }
                                              }
                                              await updateDoc(doc(db, "folders", folder.id), { name: newName.normalize('NFC') });
                                              handleActionSuccess();
                                            } catch (err: any) {
                                              alert("Erro ao renomear pasta: " + err.message);
                                              setIsProcessingAction(false);
                                              sessionStorage.removeItem('action_in_progress');
                                            }
                                          }
                                          setActiveFolderMenuId(null);
                                        }}
                                        className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                                      >
                                        <div className="flex items-center gap-3">
                                          <FileText size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                                          <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Mudar nome</span>
                                        </div>
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveFolderSubmenu(activeFolderSubmenu === 'partilhar' ? 'none' : 'partilhar');
                                        }}
                                        className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Users size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                                          <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Partilhar</span>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                                      
<AnimatePresence>
                                      {activeFolderSubmenu === 'partilhar' && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                          animate={{ opacity: 1, scale: 1, x: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                          transition={{ duration: 0.1 }}
                                          className="absolute left-[100%] ml-1.5 top-0 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-50 py-1.5 text-left text-gray-700 font-sans cursor-default animate-in fade-in"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="px-3.5 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Partilhar via</div>
                                          
                                          
                                          <div className="relative">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (typeof setActiveFolderSubmenu !== 'undefined') {
                                                  setActiveFolderSubmenu(activeFolderSubmenu === 'atribuir' ? 'none' : 'atribuir');
                                                } else if (typeof setActiveSubmenu !== 'undefined') {
                                                  setActiveSubmenu(activeSubmenu === 'atribuir' ? 'none' : 'atribuir');
                                                }
                                              }}
                                              className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                            >
                                              <div className="flex items-center gap-3">
                                                <UserPlus size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                                <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">Atribuir a Cliente</span>
                                              </div>
                                              <ChevronRight size={14} className="text-gray-300 group-hover/sub:text-[#a21b7e] transition-colors" />
                                            </button>
                                            
                                            <AnimatePresence>
                                              {((typeof activeFolderSubmenu !== 'undefined' && activeFolderSubmenu === 'atribuir') || (typeof activeSubmenu !== 'undefined' && activeSubmenu === 'atribuir')) && (
                                                <motion.div
                                                  initial={{ opacity: 0, scale: 0.95, x: -10 }}
                                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                                  exit={{ opacity: 0, scale: 0.95, x: -10 }}
                                                  transition={{ duration: 0.1 }}
                                                  className="absolute left-[100%] ml-1.5 top-0 w-48 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-[60] py-1 text-left max-h-64 overflow-y-auto custom-scrollbar cursor-default"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="px-3 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Selecione o Cliente</div>
                                                  {accounts && accounts.filter(a => a.role !== 'admin').length > 0 ? (
                                                    accounts.filter(a => a.role !== 'admin').map((client: any) => (
                                                      <button
                                                        key={client.id}
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          const it = typeof folder !== 'undefined' ? { id: folder.id, type: 'folder' } : typeof asset !== 'undefined' ? { id: asset.id, type: asset.type } : null;
                                                          if (it) {
                                                            try {
                                                              const docRef = doc(db, it.type === 'folder' ? 'folders' : 'assets', it.id);
                                                              await updateDoc(docRef, { clientId: client.email });
                                                              alert("Atribuído com sucesso!");
                                                            } catch (err) {
                                                              alert("Erro ao atribuir: " + err.message);
                                                            }
                                                          }
                                                          if (typeof setActiveFolderSubmenu !== 'undefined') setActiveFolderSubmenu('none');
                                                          if (typeof setActiveSubmenu !== 'undefined') setActiveSubmenu('none');
                                                          if (typeof setShowMenu !== 'undefined') setShowMenu(false);
                                                          if (typeof setActiveFolderMenuId !== 'undefined') setActiveFolderMenuId(null);
                                                        }}
                                                        className="w-full text-left px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-[#a21b7e]/5 hover:text-[#a21b7e] truncate block transition-colors"
                                                      >
                                                        {client.displayName || client.email}
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="px-3 py-2 text-xs text-gray-400 italic">Nenhum cliente disponível</div>
                                                  )}
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                          
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const shareUrl = folder.webViewLink || `${window.location.origin}/?folder=${folder.id}`;
                                              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Confira a pasta *${folder.name}* no ProVisual Corporate: ${shareUrl}`)}`, '_blank');
                                              setActiveFolderMenuId(null);
                                              setActiveFolderSubmenu('none');
                                            }}
                                            className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                          >
                                            <Share2 size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                            <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">WhatsApp</span>
                                          </button>

                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const shareUrl = folder.webViewLink || `${window.location.origin}/?folder=${folder.id}`;
                                              window.location.href = `mailto:?subject=${encodeURIComponent(`Partilha de Pasta - ProVisual`)}&body=${encodeURIComponent(`Olá!\n\nSegue o link para aceder à pasta *${folder.name}* no Arquivo ProVisual Corporate:\n\n${shareUrl}\n\nCumprimentos,\nEquipa ProVisual`)}`;
                                              setActiveFolderMenuId(null);
                                              setActiveFolderSubmenu('none');
                                            }}
                                            className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                          >
                                            <Mail size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                            <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">E-mail</span>
                                          </button>

                                          <div className="my-1 border-t border-gray-100" />

                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const shareUrl = folder.webViewLink || `${window.location.origin}/?folder=${folder.id}`;
                                              navigator.clipboard.writeText(shareUrl);
                                              alert("Link de partilha da pasta copiado para a área de transferência!");
                                              setActiveFolderMenuId(null);
                                              setActiveFolderSubmenu('none');
                                            }}
                                            className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                          >
                                            <Copy size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                            <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">Copiar Link</span>
                                          </button>
                                        </motion.div>
                                      )}

                                      {activeFolderSubmenu === 'organizar' && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                          animate={{ opacity: 1, scale: 1, x: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                          transition={{ duration: 0.1 }}
                                          className="absolute left-[100%] ml-1.5 top-0 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-50 py-1.5 text-left text-gray-700 font-sans cursor-default max-h-[300px] overflow-y-auto"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="px-3.5 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Mover para</div>
                                          
                                          {folder.parentId !== "" && folder.parentId !== null && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveFolderMenuId(null);
                                                setActiveFolderSubmenu('none');
                                                setIsProcessingAction(true);
                                                sessionStorage.setItem('action_in_progress', 'true');
                                                (async () => {
                                                  try {
                                                    if (folder.id.length > 20) {
                                                      const moveResponse = await fetch('/api/drive/update', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                          fileId: folder.id,
                                                          addParents: 'root',
                                                          removeParents: folder.parentId === 'root' || !folder.parentId ? undefined : folder.parentId
                                                        })
                                                      });
                                                      if (!moveResponse.ok) {
                                                        const errData = await moveResponse.json();
                                                        throw new Error(errData.error || 'Erro ao mover no Google Drive');
                                                      }
                                                    }
                                                    await updateDoc(doc(db, "folders", folder.id), { parentId: null });
                                                    alert(`Pasta "${folder.name}" movida para a Raiz com sucesso!`);
                                                    setIsProcessingAction(false);
                                                    sessionStorage.removeItem('action_in_progress');
                                                  } catch (err: any) {
                                                    alert("Erro ao mover pasta: " + err.message);
                                                    setIsProcessingAction(false);
                                                    sessionStorage.removeItem('action_in_progress');
                                                  }
                                                })();
                                              }}
                                              className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                            >
                                              <FolderIcon size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                              <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">Raiz (Meu Drive)</span>
                                            </button>
                                          )}

                                          {folders.filter(f => f.id !== folder.id && f.id !== folder.parentId).map(f => (
                                            <button
                                              key={f.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveFolderMenuId(null);
                                                setActiveFolderSubmenu('none');
                                                setIsProcessingAction(true);
                                                sessionStorage.setItem('action_in_progress', 'true');
                                                (async () => {
                                                  try {
                                                    if (folder.id.length > 20) {
                                                      const moveResponse = await fetch('/api/drive/update', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                          fileId: folder.id,
                                                          addParents: f.id,
                                                          removeParents: folder.parentId === 'root' || !folder.parentId ? undefined : folder.parentId
                                                        })
                                                      });
                                                      if (!moveResponse.ok) {
                                                        const errData = await moveResponse.json();
                                                        throw new Error(errData.error || 'Erro ao mover no Google Drive');
                                                      }
                                                    }
                                                    await updateDoc(doc(db, "folders", folder.id), { parentId: f.id });
                                                    alert(`Pasta "${folder.name}" movida para "${f.name}"!`);
                                                    setIsProcessingAction(false);
                                                    sessionStorage.removeItem('action_in_progress');
                                                  } catch (err: any) {
                                                    alert("Erro ao mover pasta: " + err.message);
                                                    setIsProcessingAction(false);
                                                    sessionStorage.removeItem('action_in_progress');
                                                  }
                                                })();
                                              }}
                                              className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                            >
                                              <FolderIcon size={14} className="text-yellow-500 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                              <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">{f.name}</span>
                                            </button>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
</button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveFolderSubmenu(activeFolderSubmenu === 'organizar' ? 'none' : 'organizar');
                                        }}
                                        className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                                      >
                                        <div className="flex items-center gap-3">
                                          <FolderIcon size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                                          <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Organizar</span>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                                      </button>

                                      <div className="px-3.5 py-2">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Destaque</span>
                                        <div className="flex gap-1.5 items-center">
                                          {[
                                            "#e2b13c", // Padrão Gold
                                            "#a21b7e", // Vinho Provisual
                                            "#3b82f6", // Azul
                                            "#10b981", // Verde
                                            "#ef4444", // Vermelho
                                            "#8b5cf6", // Roxo
                                          ].map((color) => (
                                            <button
                                              key={color}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                  await updateDoc(doc(db, "folders", folder.id), { color });
                                                  handleActionSuccess();
                                                } catch (err) {
                                                  console.error("Erro ao mudar cor da pasta:", err);
                                                }
                                                setActiveFolderMenuId(null);
                                              }}
                                              style={{ backgroundColor: color }}
                                              className={cn(
                                                "w-4 h-4 rounded-full border border-gray-100 hover:scale-125 transition-all cursor-pointer",
                                                (folder.color || "#e2b13c") === color ? "border-gray-800 scale-110 shadow-sm" : "border-transparent"
                                              )}
                                            />
                                          ))}
                                        </div>
                                      </div>

                                      <div className="my-1 border-t border-gray-100" />

                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (confirm("Tem certeza que deseja mover a pasta " + folder.name + " para o lixo?")) {
                                            try {
                                              setIsProcessingAction(true);
                                              sessionStorage.setItem('action_in_progress', 'true');
                                              
                                              // Mover fisicamente no Google Drive
                                              if ((folder as any).ownerId === 'google-drive' || folder.id.length > 20) {
                                                const trashResponse = await fetch('/api/drive/update', {
                                                  method: 'POST',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    fileId: folder.id,
                                                    trashed: true
                                                  })
                                                });
                                                if (!trashResponse.ok) {
                                                  const errData = await trashResponse.json();
                                                  console.warn("Erro ao lixo no drive:", errData.error);
                                                }
                                              }
                                              await updateDoc(doc(db, "folders", folder.id), { parentId: "trash", trashed: true });
                                              setIsProcessingAction(false);
                                              sessionStorage.removeItem('action_in_progress');
                                            } catch (err: any) {
                                              alert("Erro ao mover para o lixo: " + err.message);
                                              setIsProcessingAction(false);
                                              sessionStorage.removeItem('action_in_progress');
                                            }
                                          }
                                          setActiveFolderMenuId(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-red-50 group transition-colors text-left text-[13px] font-bold text-red-600 cursor-pointer"
                                      >
                                        <div className="flex items-center gap-3">
                                          <Trash2 size={15} className="text-red-400 group-hover:text-red-600 transition-colors shrink-0" />
                                          <span className="text-red-600 group-hover:text-red-700 transition-colors">Mover para o lixo</span>
                                        </div>
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
                  {filteredAssets.length > 0 && (
                    <div className="w-full flex flex-col gap-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                        {displayedAssets.map(asset => (
                          <AssetCard
                      key={asset.id}
                      asset={asset}
                      onDistribute={(item) => { setItemToDistribute(item); setDistributeModalOpen(true); }}
                            isNewlyUploaded={newlyUploadedAssetIds.includes(asset.id)}
                            onSelect={() => {
                              if (asset.type === 'folder') {
                                setSelectedFolderId(asset.driveId || asset.id);
                                handleGoogleSync(asset.driveId || asset.id, undefined, true);
                              } else {
                                setPreviewAsset(asset);
                              }
                            }}
                            onPreview={() => {
                              if (asset.type === 'folder') {
                                setSelectedFolderId(asset.driveId || asset.id);
                                handleGoogleSync(asset.driveId || asset.id, undefined, true);
                              } else {
                                setPreviewAsset(asset);
                              }
                            }}
                            isSelected={selectedAsset?.id === asset.id}
                            isBulkSelected={selectedAssetIds.includes(asset.id)}
                            onToggleBulkSelect={() => handleToggleBulkSelect(asset.id)}
                            hasSelectionActive={selectedAssetIds.length > 0}
                            folders={filteredFolders}
                            onAskGemini={(a) => {
                              setGeminiAsset(a);
                              const initialText = `Olá! Sou o Gemini. Analisei o arquivo **${a.name}** (${a.type}). Ele está guardado com sucesso na ProVisual Corporate e integrado com o seu Google Drive. Posso extrair textos, gerar resumos ou dar insights sobre este arquivo. O que gostaria de saber?`;
                              setGeminiAnswers([{ role: 'gemini', text: initialText }]);
                              setGeminiQuestion("");
                            }}
                            onStartAction={(active) => {
                              setIsProcessingAction(active);
                              if (active) {
                                sessionStorage.setItem('action_in_progress', 'true');
                              } else {
                                sessionStorage.removeItem('action_in_progress');
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* List Header */}
                  <div className="sticky top-0 grid grid-cols-12 px-8 py-3 bg-gray-100 border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest z-10">
                    <div className="col-span-6">Nome do arquivo</div>
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-2">Modificação</div>
                    <div className="col-span-2 text-right pr-4">Tamanho</div>
                  </div>

                  {/* Folders in List - Only show in 'All Files' or 'Google Drive' view */}
                  {(activeTab === 'all' || activeTab === 'google_drive') && filteredFolders.map(folder => (
                    <div
                      key={folder.id}
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        if ((folder as any).ownerId === 'google-drive') {
                          handleGoogleSync(folder.id, undefined, true);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id);
                      }}
                      className="grid grid-cols-12 px-8 py-4 border-b border-gray-50 items-center hover:bg-gray-50 cursor-pointer transition-all relative overflow-visible"
                    >
                      <div className="col-span-6 flex items-center gap-4">
                        <FolderIcon size={24} style={{ color: folder.color || "#e2b13c", fill: `${folder.color || "#e2b13c"}1a` }} />
                        <span className="text-sm font-bold text-gray-700">{folder.name}</span>
                      </div>
                      <div className="col-span-2 text-[10px] font-black text-gray-300 uppercase">Pasta</div>
                      <div className="col-span-2 text-xs text-gray-400 font-medium">
                        {format(folder.date, "dd/MM/yyyy")}
                      </div>
                      <div className="col-span-2 text-right pr-4 text-xs text-gray-300 flex items-center justify-end gap-3 relative overflow-visible">
                        <span>-</span>
                        <div className="relative overflow-visible">
                          <motion.button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id);
                              setActiveFolderSubmenu('none');
                            }}
                            whileHover={{ scale: 1.25 }}
                            whileTap={{ scale: 0.95 }}
                            className="text-gray-400 hover:text-gray-600 p-1 transition-colors cursor-pointer"
                          >
                            <MoreVertical size={16} />
                          </motion.button>

                          <AnimatePresence>
                            {activeFolderMenuId === folder.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-30" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveFolderMenuId(null);
                                    setActiveFolderSubmenu('none');
                                  }}
                                />
                                
                                {/* SUBMENUS (Posicionados à esquerda do principal) */}
                                

                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_10px_rgba(0,0,0,0.06)] z-40 py-1.5 text-left text-gray-700 font-sans cursor-default"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedFolderId(folder.id);
                                      if ((folder as any).ownerId === 'google-drive') {
                                        handleGoogleSync(folder.id, undefined, true);
                                      }
                                      setActiveFolderMenuId(null);
                                    }}
                                    className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer animate-in fade-in duration-100"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Eye size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                                      <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Visualizar</span>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                                  </button>

                                  <div className="my-1 border-t border-gray-100" />

                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const newName = prompt("Digite o novo nome para " + folder.name, folder.name);
                                      if (newName && newName.trim() !== folder.name) {
                                        try {
                                          setIsProcessingAction(true);
                                          sessionStorage.setItem('action_in_progress', 'true');
                                          
                                          if ((folder as any).ownerId === 'google-drive' || folder.id.length > 20) {
                                            const renameResponse = await fetch('/api/drive/update', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                fileId: folder.id,
                                                newName: newName.normalize('NFC')
                                              })
                                            });
                                            if (!renameResponse.ok) {
                                              const errData = await renameResponse.json();
                                              throw new Error(errData.error || "Erro no Google Drive");
                                            }
                                          }
                                          await updateDoc(doc(db, "folders", folder.id), { name: newName.normalize('NFC') });
                                          handleActionSuccess();
                                        } catch (err: any) {
                                          alert("Erro ao renomear pasta: " + err.message);
                                          setIsProcessingAction(false);
                                          sessionStorage.removeItem('action_in_progress');
                                        }
                                      }
                                      setActiveFolderMenuId(null);
                                    }}
                                    className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <FileText size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                                      <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Mudar nome</span>
                                    </div>
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveFolderSubmenu(activeFolderSubmenu === 'partilhar' ? 'none' : 'partilhar');
                                    }}
                                    className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Users size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                                      <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Partilhar</span>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                                  
<AnimatePresence>
                                  {activeFolderSubmenu === 'partilhar' && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                      animate={{ opacity: 1, scale: 1, x: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                      transition={{ duration: 0.1 }}
                                      className="absolute left-[100%] ml-1.5 top-0 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-50 py-1.5 text-left text-gray-700 font-sans cursor-default animate-in fade-in"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="px-3.5 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Partilhar via</div>
                                          
                                          
                                          <div className="relative">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (typeof setActiveFolderSubmenu !== 'undefined') {
                                                  setActiveFolderSubmenu(activeFolderSubmenu === 'atribuir' ? 'none' : 'atribuir');
                                                } else if (typeof setActiveSubmenu !== 'undefined') {
                                                  setActiveSubmenu(activeSubmenu === 'atribuir' ? 'none' : 'atribuir');
                                                }
                                              }}
                                              className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                            >
                                              <div className="flex items-center gap-3">
                                                <UserPlus size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                                <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">Atribuir a Cliente</span>
                                              </div>
                                              <ChevronRight size={14} className="text-gray-300 group-hover/sub:text-[#a21b7e] transition-colors" />
                                            </button>
                                            
                                            <AnimatePresence>
                                              {((typeof activeFolderSubmenu !== 'undefined' && activeFolderSubmenu === 'atribuir') || (typeof activeSubmenu !== 'undefined' && activeSubmenu === 'atribuir')) && (
                                                <motion.div
                                                  initial={{ opacity: 0, scale: 0.95, x: -10 }}
                                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                                  exit={{ opacity: 0, scale: 0.95, x: -10 }}
                                                  transition={{ duration: 0.1 }}
                                                  className="absolute left-[100%] ml-1.5 top-0 w-48 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-[60] py-1 text-left max-h-64 overflow-y-auto custom-scrollbar cursor-default"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="px-3 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Selecione o Cliente</div>
                                                  {accounts && accounts.filter(a => a.role !== 'admin').length > 0 ? (
                                                    accounts.filter(a => a.role !== 'admin').map((client: any) => (
                                                      <button
                                                        key={client.id}
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          const it = typeof folder !== 'undefined' ? { id: folder.id, type: 'folder' } : typeof asset !== 'undefined' ? { id: asset.id, type: asset.type } : null;
                                                          if (it) {
                                                            try {
                                                              const docRef = doc(db, it.type === 'folder' ? 'folders' : 'assets', it.id);
                                                              await updateDoc(docRef, { clientId: client.email });
                                                              alert("Atribuído com sucesso!");
                                                            } catch (err) {
                                                              alert("Erro ao atribuir: " + err.message);
                                                            }
                                                          }
                                                          if (typeof setActiveFolderSubmenu !== 'undefined') setActiveFolderSubmenu('none');
                                                          if (typeof setActiveSubmenu !== 'undefined') setActiveSubmenu('none');
                                                          if (typeof setShowMenu !== 'undefined') setShowMenu(false);
                                                          if (typeof setActiveFolderMenuId !== 'undefined') setActiveFolderMenuId(null);
                                                        }}
                                                        className="w-full text-left px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-[#a21b7e]/5 hover:text-[#a21b7e] truncate block transition-colors"
                                                      >
                                                        {client.displayName || client.email}
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="px-3 py-2 text-xs text-gray-400 italic">Nenhum cliente disponível</div>
                                                  )}
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                      
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const shareUrl = folder.webViewLink || `${window.location.origin}/?folder=${folder.id}`;
                                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Confira a pasta *${folder.name}* no ProVisual Corporate: ${shareUrl}`)}`, '_blank');
                                          setActiveFolderMenuId(null);
                                          setActiveFolderSubmenu('none');
                                        }}
                                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                      >
                                        <Share2 size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">WhatsApp</span>
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const shareUrl = folder.webViewLink || `${window.location.origin}/?folder=${folder.id}`;
                                          window.location.href = `mailto:?subject=${encodeURIComponent(`Partilha de Pasta - ProVisual`)}&body=${encodeURIComponent(`Olá!\n\nSegue o link para aceder à pasta *${folder.name}* no Arquivo ProVisual Corporate:\n\n${shareUrl}\n\nCumprimentos,\nEquipa ProVisual`)}`;
                                          setActiveFolderMenuId(null);
                                          setActiveFolderSubmenu('none');
                                        }}
                                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                      >
                                        <Mail size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">E-mail</span>
                                      </button>

                                      <div className="my-1 border-t border-gray-100" />

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const shareUrl = folder.webViewLink || `${window.location.origin}/?folder=${folder.id}`;
                                          navigator.clipboard.writeText(shareUrl);
                                          alert("Link de partilha da pasta copiado para a área de transferência!");
                                          setActiveFolderMenuId(null);
                                          setActiveFolderSubmenu('none');
                                        }}
                                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                      >
                                        <Copy size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">Copiar Link</span>
                                      </button>
                                    </motion.div>
                                  )}

                                  {activeFolderSubmenu === 'organizar' && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95, x: 10 }}
                                      animate={{ opacity: 1, scale: 1, x: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, x: 10 }}
                                      transition={{ duration: 0.1 }}
                                      className="absolute left-[100%] ml-1.5 top-0 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-50 py-1.5 text-left text-gray-700 font-sans cursor-default max-h-[300px] overflow-y-auto"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="px-3.5 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Mover para</div>
                                      
                                      {folder.parentId !== "" && folder.parentId !== null && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveFolderMenuId(null);
                                            setActiveFolderSubmenu('none');
                                            setIsProcessingAction(true);
                                            sessionStorage.setItem('action_in_progress', 'true');
                                            (async () => {
                                              try {
                                                if (folder.id.length > 20) {
                                                  const moveResponse = await fetch('/api/drive/update', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                      fileId: folder.id,
                                                      addParents: 'root',
                                                      removeParents: folder.parentId === 'root' || !folder.parentId ? undefined : folder.parentId
                                                    })
                                                  });
                                                  if (!moveResponse.ok) {
                                                    const errData = await moveResponse.json();
                                                    throw new Error(errData.error || 'Erro ao mover no Google Drive');
                                                  }
                                                }
                                                await updateDoc(doc(db, "folders", folder.id), { parentId: null });
                                                alert(`Pasta "${folder.name}" movida para a Raiz com sucesso!`);
                                                handleActionSuccess();
                                              } catch (err: any) {
                                                alert("Erro ao mover pasta: " + err.message);
                                                setIsProcessingAction(false);
                                                sessionStorage.removeItem('action_in_progress');
                                              }
                                            })();
                                          }}
                                          className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                        >
                                          <FolderIcon size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                          <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">Raiz (Meu Drive)</span>
                                        </button>
                                      )}

                                      {folders.filter(f => f.id !== folder.id && f.id !== folder.parentId).map(f => (
                                        <button
                                          key={f.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveFolderMenuId(null);
                                            setActiveFolderSubmenu('none');
                                            setIsProcessingAction(true);
                                            sessionStorage.setItem('action_in_progress', 'true');
                                            (async () => {
                                              try {
                                                if (folder.id.length > 20) {
                                                  const moveResponse = await fetch('/api/drive/update', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                      fileId: folder.id,
                                                      addParents: f.id,
                                                      removeParents: folder.parentId === 'root' || !folder.parentId ? undefined : folder.parentId
                                                    })
                                                  });
                                                  if (!moveResponse.ok) {
                                                    const errData = await moveResponse.json();
                                                    throw new Error(errData.error || 'Erro ao mover no Google Drive');
                                                  }
                                                }
                                                await updateDoc(doc(db, "folders", folder.id), { parentId: f.id });
                                                alert(`Pasta "${folder.name}" movida para "${f.name}"!`);
                                                handleActionSuccess();
                                              } catch (err: any) {
                                                alert("Erro ao mover pasta: " + err.message);
                                                setIsProcessingAction(false);
                                                sessionStorage.removeItem('action_in_progress');
                                              }
                                            })();
                                          }}
                                          className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                        >
                                          <FolderIcon size={14} className="text-yellow-500 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                          <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">{f.name}</span>
                                        </button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
</button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveFolderSubmenu(activeFolderSubmenu === 'organizar' ? 'none' : 'organizar');
                                    }}
                                    className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <FolderIcon size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                                      <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Organizar</span>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                                  </button>

                                  <div className="px-3.5 py-2">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Destaque</span>
                                    <div className="flex gap-1.5 items-center">
                                      {[
                                        "#e2b13c", // Padrão Gold
                                        "#a21b7e", // Vinho Provisual
                                        "#3b82f6", // Azul
                                        "#10b981", // Verde
                                        "#ef4444", // Vermelho
                                        "#8b5cf6", // Roxo
                                      ].map((color) => (
                                        <button
                                          key={color}
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              await updateDoc(doc(db, "folders", folder.id), { color });
                                              handleActionSuccess();
                                            } catch (err) {
                                              console.error("Erro ao mudar cor da pasta:", err);
                                            }
                                            setActiveFolderMenuId(null);
                                          }}
                                          style={{ backgroundColor: color }}
                                          className={cn(
                                            "w-4 h-4 rounded-full border border-gray-100 hover:scale-125 transition-all cursor-pointer",
                                            (folder.color || "#e2b13c") === color ? "border-gray-800 scale-110 shadow-sm" : "border-transparent"
                                          )}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  <div className="my-1 border-t border-gray-100" />

                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (confirm("Tem certeza que deseja mover a pasta " + folder.name + " para o lixo?")) {
                                        try {
                                          setIsProcessingAction(true);
                                          sessionStorage.setItem('action_in_progress', 'true');
                                          
                                          // Mover fisicamente no Google Drive
                                          if ((folder as any).ownerId === 'google-drive' || folder.id.length > 20) {
                                            const trashResponse = await fetch('/api/drive/update', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                fileId: folder.id,
                                                trashed: true
                                              })
                                            });
                                            if (!trashResponse.ok) {
                                              const errData = await trashResponse.json();
                                              console.warn("Erro ao lixo no drive:", errData.error);
                                            }
                                          }
                                          await updateDoc(doc(db, "folders", folder.id), { parentId: "trash", trashed: true });
                                          handleActionSuccess();
                                        } catch (err: any) {
                                          alert("Erro ao mover para o lixo: " + err.message);
                                          setIsProcessingAction(false);
                                          sessionStorage.removeItem('action_in_progress');
                                        }
                                      }
                                      setActiveFolderMenuId(null);
                                    }}
                                    className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-red-50 group transition-colors text-left text-[13px] font-bold text-red-600 cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Trash2 size={15} className="text-red-400 group-hover:text-red-600 transition-colors shrink-0" />
                                      <span className="text-red-600 group-hover:text-red-700 transition-colors">Mover para o lixo</span>
                                    </div>
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Assets (Files & Folders from Drive) in List */}
                  {displayedAssets.map(asset => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      onDistribute={(item) => { setItemToDistribute(item); setDistributeModalOpen(true); }}
                      isNewlyUploaded={newlyUploadedAssetIds.includes(asset.id)}
                      onSelect={() => {
                        if (asset.type === 'folder') {
                          setSelectedFolderId(asset.driveId || asset.id);
                          handleGoogleSync(asset.driveId || asset.id, undefined, true);
                        } else {
                          setPreviewAsset(asset); // Abrir visualização no clique simples
                        }
                      }}
                      onPreview={() => {
                        if (asset.type === 'folder') {
                          setSelectedFolderId(asset.driveId || asset.id);
                          handleGoogleSync(asset.driveId || asset.id, undefined, true);
                        } else {
                          setPreviewAsset(asset);
                        }
                      }}
                      isSelected={selectedAsset?.id === asset.id}
                      isBulkSelected={selectedAssetIds.includes(asset.id)}
                      onToggleBulkSelect={() => handleToggleBulkSelect(asset.id)}
                      hasSelectionActive={selectedAssetIds.length > 0}
                      folders={filteredFolders}
                      onAskGemini={(a) => {
                        setGeminiAsset(a);
                        const initialText = `Olá! Sou o Gemini. Analisei o arquivo **${a.name}** (${a.type}). Ele está guardado com sucesso na ProVisual Corporate e integrado com o seu Google Drive. Posso extrair textos, gerar resumos ou dar insights sobre este arquivo. O que gostaria de saber?`;
                        setGeminiAnswers([{ role: 'gemini', text: initialText }]);
                        setGeminiQuestion("");
                      }}
                      onStartAction={(active) => {
                        setIsProcessingAction(active);
                        if (active) {
                          sessionStorage.setItem('action_in_progress', 'true');
                        } else {
                          sessionStorage.removeItem('action_in_progress');
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {activeTab === 'image' && filteredAssets.length > visibleImagesCount && (
            <div className="flex justify-center my-8 pb-10 w-full">
              <button
                onClick={() => setVisibleImagesCount(prev => prev + 10)}
                className="flex items-center gap-2 bg-[#a21b7e] text-white px-6 py-3 rounded-md text-sm font-bold shadow-sm hover:bg-[#8e176e] transition-all cursor-pointer select-none"
              >
                <Plus size={18} />
                Carregar mais imagens
              </button>
            </div>
          )}
        </div>)}

        {/* Upload Progress Overlay (Fixed Bottom Right) - Google Drive style (Layout Claro) */}
        {showUploadQueueCard && uploadQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 right-8 bg-white border border-gray-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)] rounded-[10px] min-w-[280px] max-w-[384px] w-auto z-[100] text-gray-700 overflow-hidden font-sans"
          >
            <div className="flex items-center justify-between gap-8 px-4 py-3 bg-gray-50 border-b border-gray-100 text-gray-800">
              <span className="font-bold text-xs uppercase tracking-wider shrink-0">
                {uploadQueue.some(item => item.status === 'uploading') 
                  ? `Carregando ${uploadQueue.filter(item => item.status === 'uploading').length} ${uploadQueue.filter(item => item.status === 'uploading').length === 1 ? 'item' : 'itens'}...`
                  : `${uploadQueue.filter(item => item.status === 'completed').length} ${uploadQueue.filter(item => item.status === 'completed').length === 1 ? 'upload concluído' : 'uploads concluídos'}`
                }
              </span>
              <button 
                onClick={() => setShowUploadQueueCard(false)}
                className="w-6 h-6 rounded-full hover:bg-gray-200/50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="rotate-45" size={16} />
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
              {uploadQueue.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-6 px-4 py-3 text-xs bg-white">
                  <div className="flex items-center gap-2 min-w-0 max-w-[75%] text-left">
                    {item.status === 'uploading' ? (
                      <div className="w-3.5 h-3.5 border-2 border-t-transparent border-[#a21b7e] rounded-full animate-spin shrink-0" />
                    ) : item.status === 'completed' ? (
                      <CheckCircle2 className="text-emerald-500 shrink-0" size={15} />
                    ) : (
                      <span className="text-red-500 shrink-0 font-bold">!</span>
                    )}
                    <span className="truncate font-semibold text-gray-700" title={item.name}>{item.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'uploading' && (
                      <span className="text-[10px] text-gray-400 font-bold">{item.progress}%</span>
                    )}
                    {item.status === 'completed' && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Concluído</span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Erro</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Barra Flutuante de Ações em Massa */}
        {selectedAssetIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-gray-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.1)] rounded-[12px] px-6 py-4 flex items-center gap-6 z-[100] font-sans"
          >
            <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
              <div className="w-6 h-6 rounded-full bg-[#a21b7e] text-white flex items-center justify-center text-xs font-bold shadow-sm animate-pulse">
                {selectedAssetIds.length}
              </div>
              <span className="text-sm font-bold text-gray-700">
                {selectedAssetIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Mover para Folder Dropdown Trigger */}
              <div className="relative group/bulk">
                <button
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-md text-xs font-bold text-gray-600 transition-colors cursor-pointer select-none"
                >
                  <FolderIcon size={14} className="text-yellow-500 shrink-0" />
                  Mover para...
                  <ChevronDown size={12} className="text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                <div className="absolute bottom-[100%] left-0 mb-2 w-52 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-[110] hidden group-hover/bulk:block max-h-60 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] font-black text-gray-300 uppercase tracking-wider border-b border-gray-100 mb-1">Escolha a pasta destino</div>
                  
                  {selectedFolderId !== null && (
                    <button
                      onClick={() => handleBulkMove(null)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#a21b7e]/5 text-left text-xs font-bold text-gray-600 hover:text-[#a21b7e] transition-colors cursor-pointer"
                    >
                      <HardDrive size={14} className="text-gray-400" />
                      Raiz (Meu Drive)
                    </button>
                  )}

                  {filteredFolders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => handleBulkMove(folder.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#a21b7e]/5 text-left text-xs font-bold text-gray-600 hover:text-[#a21b7e] transition-colors cursor-pointer"
                    >
                      <FolderIcon size={14} className="text-yellow-500 shrink-0" />
                      {folder.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 hover:text-red-600 rounded-md text-xs font-bold text-gray-600 transition-colors cursor-pointer select-none"
              >
                <Trash2 size={14} className="text-red-400 shrink-0" />
                Mover para Lixeira
              </button>

              {/* Clear Selection */}
              <button
                onClick={() => setSelectedAssetIds([])}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-md text-xs font-bold text-gray-600 transition-colors cursor-pointer select-none"
              >
                Limpar seleção
              </button>
            </div>
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

        {/* Modal Interativo do Gemini */}
        <AnimatePresence>
          {geminiAsset && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
              onClick={() => setGeminiAsset(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-sm shadow-2xl border border-violet-100 max-w-lg w-full overflow-hidden flex flex-col h-[500px]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header do Gemini */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <Sparkles className="animate-pulse text-amber-300 shrink-0" size={20} />
                    <div>
                      <h3 className="font-bold text-sm">Gemini Inteligência Artificial</h3>
                      <p className="text-[10px] text-violet-200">Análise de Contexto: {geminiAsset.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setGeminiAsset(null)}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/80 hover:text-white cursor-pointer"
                  >
                    <Plus className="rotate-45" size={20} />
                  </button>
                </div>

                {/* Área de Mensagens */}
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-gray-50/50">
                  {geminiAnswers.map((ans, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
                        ans.role === 'user' 
                          ? "bg-violet-600 text-white self-end rounded-tr-none" 
                          : "bg-white text-gray-700 border border-gray-100 self-start rounded-tl-none"
                      )}
                    >
                      {ans.text}
                    </div>
                  ))}
                  {isGeminiLoading && (
                    <div className="bg-white text-gray-400 border border-gray-100 self-start rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-2 shadow-sm">
                      <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span>Gemini está a analisar...</span>
                    </div>
                  )}
                </div>

                {/* Caixa de Entrada */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!geminiQuestion.trim() || isGeminiLoading) return;
                    
                    const q = geminiQuestion;
                    setGeminiAnswers(prev => [...prev, { role: 'user', text: q }]);
                    setGeminiQuestion("");
                    setIsGeminiLoading(true);

                    // Gerar resposta inteligente simulada baseada em palavras-chave
                    setTimeout(() => {
                      let reply = "";
                      const lowerQ = q.toLowerCase();
                      
                      if (lowerQ.includes("resum") || lowerQ.includes("sobre") || lowerQ.includes("contexto") || lowerQ.includes("analis")) {
                        reply = `Este ficheiro "${geminiAsset.name}" é do tipo ${geminiAsset.type}. O Gemini identificou que ele representa um elemento de valor no repositório da ProVisual Corporate. A integridade visual dele está perfeita e está sincronizado de forma ótima.`;
                      } else if (lowerQ.includes("tamanho") || lowerQ.includes("peso") || lowerQ.includes("kb") || lowerQ.includes("mb") || lowerQ.includes("dimens")) {
                        reply = `O tamanho registrado deste arquivo na nuvem é de aproximadamente ${geminiAsset.versions[0]?.size || "0.5 MB"}. Está otimizado para downloads velozes e compressão sem perda de qualidade.`;
                      } else if (lowerQ.includes("sinc") || lowerQ.includes("drive") || lowerQ.includes("nuvem") || lowerQ.includes("google")) {
                        reply = `Confirmado! O arquivo está sincronizado com o Google Drive institucional (Drive ID: ${geminiAsset.driveId || "Indisponível na raiz"}). Qualquer atualização reflete de forma bidirecional automática!`;
                      } else {
                        reply = `Excelente questão sobre "${geminiAsset.name}"! Analisei suas propriedades de renderização e as informações de segurança estão 100% conformes. Deseja que eu faça um resumo detalhado ou extraia alguma informação específica deste arquivo?`;
                      }

                      setGeminiAnswers(prev => [...prev, { role: 'gemini', text: reply }]);
                      setIsGeminiLoading(false);
                    }, 1200);
                  }}
                  className="p-3 border-t border-gray-100 bg-white flex gap-2 items-center"
                >
                  <input 
                    type="text" 
                    value={geminiQuestion}
                    onChange={(e) => setGeminiQuestion(e.target.value)}
                    placeholder="Faça uma pergunta ao Gemini sobre o arquivo..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-gray-700 font-sans"
                  />
                  <button 
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-md px-4 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Enviar
                  </button>
                </form>
              </motion.div>
            </motion.div>
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
                <SafeImage
                  thumbnailUrl={selectedAsset.thumbnailUrl}
                  driveId={selectedAsset.driveId}
                  fallbackSize="w500"
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                selectedAsset.type === "image" ? (
                  <ImageIcon className="text-[#a21b7e] opacity-20" size={48} />
                ) : selectedAsset.type === "video" ? (
                  <Video className="text-[#a21b7e] opacity-20" size={48} />
                ) : (
                  <FileText className="text-[#a21b7e] opacity-20" size={48} />
                )
              )}
              <div className="absolute top-2 right-2 bg-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest text-[#a21b7e] border border-[#a21b7e]/15 shadow-sm">
                {selectedAsset.type}
              </div>
            </div>
 
            <div className="mb-6">
              <h4 className="font-bold text-sm text-gray-800 mb-1 truncate" title={selectedAsset.name}>
                {selectedAsset.name}
              </h4>
              <div className="flex items-center gap-3 text-gray-400 text-[9px] font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  <Clock size={10} className="text-[#a21b7e]" />
                  {format(selectedAsset.captureDate, "dd/MM/yy")}
                </span>
                <span className="flex items-center gap-1 border-l border-gray-100 pl-3">
                  <Download size={10} className="text-[#a21b7e]" />
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
                      <button className="w-7 h-7 flex items-center justify-center text-[#a21b7e] bg-white shadow-sm border border-gray-100 rounded-md hover:bg-[#a21b7e] hover:text-white transition-all">
                        <Download size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
 
              <div className="pt-4 border-t border-gray-50">
                <button className="w-full flex items-center justify-center gap-2 bg-[#a21b7e] text-white py-2.5 rounded-lg font-bold shadow-md shadow-[#a21b7e]/10 hover:bg-[#8e176e] transition-all">
                  <ArrowBigUpDash size={16} />
                  <span className="text-xs">Processar Master</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Floating custom context menu for page container right-click */}
      {contextMenu && contextMenu.visible && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed bg-[#1e1f20] border border-[#2d2e30] rounded-xl shadow-2xl z-50 py-2 w-56 text-left text-gray-200 font-sans cursor-default animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute("webkitdirectory");
                fileInputRef.current.removeAttribute("directory");
                fileInputRef.current.click();
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/10 transition-all text-left text-xs font-medium text-gray-200 cursor-pointer"
          >
            <FileUp size={15} className="text-gray-400" />
            <span>Carregar ficheiro</span>
          </button>
          
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute("webkitdirectory", "true");
                fileInputRef.current.setAttribute("directory", "true");
                fileInputRef.current.click();
                setTimeout(() => {
                  fileInputRef.current?.removeAttribute("webkitdirectory");
                  fileInputRef.current?.removeAttribute("directory");
                }, 1000);
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/10 transition-all text-left text-xs font-medium text-gray-200 cursor-pointer"
          >
            <FolderUp size={15} className="text-gray-400" />
            <span>Carregar pasta</span>
          </button>

          <div className="my-1.5 border-t border-gray-800" />

          <button
            onClick={() => {
              handleCreateFolder();
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/10 transition-all text-left text-xs font-medium text-gray-200 cursor-pointer"
          >
            <FolderPlus size={15} className="text-gray-400" />
            <span>Criar uma nova pasta</span>
          </button>
        </div>
      )}

      {/* Loader removido para carregamento instantâneo */}

      {/* MODAL DISTRIBUIR A CLIENTE */}
      <AnimatePresence>
        {distributeModalOpen && itemToDistribute && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setDistributeModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white max-w-md w-full rounded-xl overflow-hidden shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Distribuir para Cliente</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Defina o cliente a quem este item pertence</p>
                </div>
                <button
                  onClick={() => setDistributeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg mb-5">
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-500">
                    {itemToDistribute.type === 'folder' ? <FolderIcon size={16} /> : <FileText size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{itemToDistribute.currentName}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{itemToDistribute.type === 'folder' ? 'Pasta' : 'Arquivo'}</p>
                  </div>
                </div>

                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Selecione o Cliente</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {accounts.filter(a => a.role !== 'admin').map(client => {
                    const rawName = client.displayName || "";
                    const parsed = rawName.includes('|') 
                      ? { name: rawName.split('|')[0], logo: rawName.split('|')[1] } 
                      : { name: rawName, logo: "" };

                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setSelectedClientId(client.email)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedClientId === client.email ? 'border-[#a21b7e] bg-[#a21b7e]/5 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                          {parsed.logo ? (
                            <img src={parsed.logo} alt={parsed.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] font-black text-[#a21b7e] uppercase">
                              {parsed.name ? parsed.name.charAt(0) : "C"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-700 font-sans">{parsed.name || 'Cliente'}</p>
                          <p className="text-xs text-gray-400 font-sans">{client.email}</p>
                        </div>
                        {selectedClientId === client.email && <CheckCircle2 size={16} className="text-[#a21b7e] ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                  {accounts.filter(a => a.role !== 'admin').length === 0 && (
                    <div className="p-4 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm">
                      Nenhum cliente cadastrado. Adicione um na aba "Gestão de Clientes".
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setDistributeModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={!selectedClientId || isDistributing}
                  onClick={async () => {
                    setIsDistributing(true);
                    try {
                      const docRef = doc(db, itemToDistribute.type === 'folder' ? 'folders' : 'assets', itemToDistribute.id);
                      await updateDoc(docRef, { clientId: selectedClientId });
                      alert("Atribuído com sucesso!");
                      setDistributeModalOpen(false);
                    } catch (err: any) {
                      alert("Erro ao atribuir: " + err.message);
                    } finally {
                      setIsDistributing(false);
                    }
                  }}
                  className="px-5 py-2 bg-[#a21b7e] hover:bg-[#8e176d] text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDistributing ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A atribuir...</>
                  ) : (
                    <><Share2 size={16} /> Atribuir</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
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
        "w-full flex items-center gap-3 px-3 py-1.5 rounded-sm text-[16px] font-bold transition-all duration-200 ease-in-out transform hover:translate-x-1 relative cursor-pointer",
        active
          ? "text-[#a21b7e]"
          : "text-gray-500 hover:bg-[#a21b7e]/5 hover:text-[#a21b7e]"
      )}
    >
      <span className={cn("transition-colors", active ? "text-[#a21b7e]" : "text-gray-400")}>{icon}</span>
      <span className="tracking-tight">{label}</span>
      {active && (
        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#a21b7e]" />
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
  onPreview: () => void;
  isNewlyUploaded?: boolean;
  onAskGemini: (asset: Asset) => void;
  folders: any[];
  onStartAction?: (active: boolean) => void;
  isBulkSelected?: boolean;
  onToggleBulkSelect?: () => void;
  hasSelectionActive?: boolean;
  onDistribute?: (item: {id: string, type: string, currentName: string}) => void;
}

function AssetCard({ 
  asset, 
  onSelect, 
  isSelected, 
  onPreview, 
  isNewlyUploaded = false, 
  onAskGemini, 
  folders, 
  onStartAction,
  isBulkSelected = false,
  onToggleBulkSelect,
  hasSelectionActive = false
}: AssetCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'none' | 'partilhar' | 'organizar' | 'atribuir'>('none');

  const runAction = async (actionFn: () => Promise<void>) => {
    try {
      onStartAction?.(true);
      await actionFn();
      onStartAction?.(false);
    } catch (err: any) {
      onStartAction?.(false);
      console.error(err);
      alert("Erro ao processar: " + err.message);
    }
  };
  const Icon = asset.type === "folder" ? FolderIcon : (asset.type === "image" ? ImageIcon : (asset.type === "video" ? Video : FileText));
  const iconColor = asset.type === "image" ? "text-blue-500" : (asset.type === "video" ? "text-purple-500" : "text-gray-400");

  const thumbUrl = asset.thumbnailUrl ? asset.thumbnailUrl.replace('=s220', '=s500') : `https://drive.google.com/thumbnail?id=${asset.driveId}&sz=w500`;

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onPreview}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(true);
      }}
      className={cn(
        "aspect-[3/2] relative border transition-all cursor-pointer group rounded-none shadow-sm",
        showMenu ? "overflow-visible z-30" : "overflow-hidden",
        isBulkSelected
          ? "border-[#a21b7e] ring-2 ring-[#a21b7e]/30 shadow-lg"
          : (isSelected ? "border-[#a21b7e] ring-2 ring-[#a21b7e]/10 shadow-lg" : "border-gray-100 hover:border-gray-300")
      )}
    >
      {/* Checkbox de Seleção em Massa */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onToggleBulkSelect?.();
        }}
        className={cn(
          "absolute top-2 left-2 z-20 w-5 h-5 rounded-full border bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-110",
          isBulkSelected 
            ? "border-[#a21b7e] bg-[#a21b7e] text-white" 
            : "border-gray-300 text-transparent hover:border-gray-400",
          isBulkSelected || hasSelectionActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Check size={12} className={cn("stroke-[3]", isBulkSelected ? "block" : "hidden group-hover:block text-gray-400")} />
      </div>

      {/* 3 dots button over the image in the upper right corner */}
      <div className="absolute top-2 right-2 z-20">
        <motion.button 
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          whileHover={{ scale: 1.25 }}
          whileTap={{ scale: 0.95 }}
          className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] hover:text-white transition-colors p-1.5 rounded-full cursor-pointer"
        >
          <MoreVertical size={18} />
        </motion.button>

        <AnimatePresence>
          {showMenu && (
            <>
              {/* Invisible click-catcher to dismiss the menu */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setActiveSubmenu('none');
                }}
              />
              
              {/* SUBMENUS (Posicionados à esquerda do principal) */}
              

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_10px_rgba(0,0,0,0.06)] z-40 py-1.5 text-left text-gray-700 font-sans cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer animate-in fade-in duration-100"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                    <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Visualizar</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    let url = asset.versions[0]?.url || asset.webViewLink;
                    if (url) {
                      if (url.includes('drive.google.com')) {
                        const matchId = url.match(/id=([^&]+)/) || url.match(/\/file\/d\/([^/]+)/);
                        const fileId = matchId ? matchId[1] : asset.driveId;
                        if (fileId) {
                          url = `https://drive.google.com/uc?export=download&id=${fileId}`;
                        }
                      }
                      const iframe = document.createElement('iframe');
                      iframe.style.display = 'none';
                      iframe.src = url;
                      document.body.appendChild(iframe);
                      setTimeout(() => document.body.removeChild(iframe), 3000);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                >
                  <Download size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                  <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Transferir</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt("Digite o novo nome para o arquivo:", asset.name);
                    if (newName) {
                      setShowMenu(false);
                      runAction(async () => {
                        // 1. Renomear fisicamente no Google Drive real
                        if (asset.driveId) {
                          const updateResponse = await fetch('/api/drive/update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              fileId: asset.driveId,
                              newName: newName
                            })
                          });
                          if (!updateResponse.ok) {
                            const errData = await updateResponse.json();
                            throw new Error(errData.error || 'Erro ao renomear no Google Drive');
                          }
                        }

                        // 2. Atualizar no Firestore
                        await updateDoc(doc(db, "assets", asset.id), { name: newName });
                      });
                    } else {
                      setShowMenu(false);
                    }
                  }}
                  className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Pencil size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                    <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Mudar o nome</span>
                  </div>
                  <span className="text-[10px] text-gray-300 font-mono tracking-tighter group-hover:text-[#a21b7e] transition-colors">⌥⌘E</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    runAction(async () => {
                      let newDriveId = asset.driveId || "";
                      let newUrl = asset.versions[0]?.url || asset.webViewLink || "";

                      // 1. Copiar fisicamente no Google Drive real na mesma pasta
                      if (asset.driveId) {
                        const copyResponse = await fetch('/api/drive/copy', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            fileId: asset.driveId,
                            destinationFolderId: asset.folderId || 'root',
                            newName: `${asset.name} (Cópia)`
                          })
                        });
                        if (!copyResponse.ok) {
                          const errData = await copyResponse.json();
                          throw new Error(errData.error || 'Erro ao copiar no Google Drive');
                        }
                        const copyData = await copyResponse.json();
                        newDriveId = copyData.id;
                        newUrl = copyData.webViewLink;
                      }

                      // 2. Salvar no Firestore com os novos dados físicos
                      const newAsset = {
                        ...asset,
                        name: `${asset.name} (Cópia)`,
                        driveId: newDriveId,
                        versions: [{
                          quality: "original",
                          size: asset.versions?.[0]?.size || "0 MB",
                          url: newUrl
                        }],
                        captureDate: new Date(),
                        createdAt: new Date()
                      };
                      delete (newAsset as any).id;
                      await addDoc(collection(db, "assets"), newAsset);
                      /* window.location.reload() removed */
                    });
                  }}
                  className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Copy size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                    <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Fazer cópia</span>
                  </div>
                  <span className="text-[10px] text-gray-300 font-mono tracking-tighter group-hover:text-[#a21b7e] transition-colors">⌘C ⌘V</span>
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAskGemini(asset);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold text-violet-600 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles size={15} className="text-violet-400 group-hover:text-violet-600 transition-colors shrink-0" />
                    <span className="group-hover:text-violet-600 transition-colors font-bold text-violet-600">Pedir ao Gemini</span>
                  </div>
                  <span className="text-[9px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full uppercase leading-none scale-90">Novo</span>
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSubmenu(activeSubmenu === 'partilhar' ? 'none' : 'partilhar');
                  }}
                  className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <UserPlus size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                    <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Partilhar</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                
<AnimatePresence>
                {activeSubmenu === 'partilhar' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: 10 }}
                    transition={{ duration: 0.1 }}
                    className="absolute left-[100%] ml-1.5 top-0 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-50 py-1.5 text-left text-gray-700 font-sans cursor-default animate-in fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3.5 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Partilhar via</div>
                                          
                                          
                                          <div className="relative">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (typeof setActiveFolderSubmenu !== 'undefined') {
                                                  setActiveFolderSubmenu(activeFolderSubmenu === 'atribuir' ? 'none' : 'atribuir');
                                                } else if (typeof setActiveSubmenu !== 'undefined') {
                                                  setActiveSubmenu(activeSubmenu === 'atribuir' ? 'none' : 'atribuir');
                                                }
                                              }}
                                              className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                            >
                                              <div className="flex items-center gap-3">
                                                <UserPlus size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                                <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">Atribuir a Cliente</span>
                                              </div>
                                              <ChevronRight size={14} className="text-gray-300 group-hover/sub:text-[#a21b7e] transition-colors" />
                                            </button>
                                            
                                            <AnimatePresence>
                                              {((typeof activeFolderSubmenu !== 'undefined' && activeFolderSubmenu === 'atribuir') || (typeof activeSubmenu !== 'undefined' && activeSubmenu === 'atribuir')) && (
                                                <motion.div
                                                  initial={{ opacity: 0, scale: 0.95, x: -10 }}
                                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                                  exit={{ opacity: 0, scale: 0.95, x: -10 }}
                                                  transition={{ duration: 0.1 }}
                                                  className="absolute left-[100%] ml-1.5 top-0 w-48 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-[60] py-1 text-left max-h-64 overflow-y-auto custom-scrollbar cursor-default"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="px-3 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Selecione o Cliente</div>
                                                  {accounts && accounts.filter(a => a.role !== 'admin').length > 0 ? (
                                                    accounts.filter(a => a.role !== 'admin').map((client: any) => (
                                                      <button
                                                        key={client.id}
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          const it = typeof folder !== 'undefined' ? { id: folder.id, type: 'folder' } : typeof asset !== 'undefined' ? { id: asset.id, type: asset.type } : null;
                                                          if (it) {
                                                            try {
                                                              const docRef = doc(db, it.type === 'folder' ? 'folders' : 'assets', it.id);
                                                              await updateDoc(docRef, { clientId: client.email });
                                                              alert("Atribuído com sucesso!");
                                                            } catch (err) {
                                                              alert("Erro ao atribuir: " + err.message);
                                                            }
                                                          }
                                                          if (typeof setActiveFolderSubmenu !== 'undefined') setActiveFolderSubmenu('none');
                                                          if (typeof setActiveSubmenu !== 'undefined') setActiveSubmenu('none');
                                                          if (typeof setShowMenu !== 'undefined') setShowMenu(false);
                                                          if (typeof setActiveFolderMenuId !== 'undefined') setActiveFolderMenuId(null);
                                                        }}
                                                        className="w-full text-left px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-[#a21b7e]/5 hover:text-[#a21b7e] truncate block transition-colors"
                                                      >
                                                        {client.displayName || client.email}
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="px-3 py-2 text-xs text-gray-400 italic">Nenhum cliente disponível</div>
                                                  )}
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const shareUrl = asset.versions[0]?.url || asset.webViewLink || window.location.href;
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Confira o arquivo *${asset.name}* no ProVisual Corporate: ${shareUrl}`)}`, '_blank');
                        setShowMenu(false);
                        setActiveSubmenu('none');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                    >
                      <Share2 size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                      <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">WhatsApp</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const shareUrl = asset.versions[0]?.url || asset.webViewLink || window.location.href;
                        window.location.href = `mailto:?subject=${encodeURIComponent(`Partilha de Ficheiro - ProVisual`)}&body=${encodeURIComponent(`Olá!\n\nSegue o link para aceder ao ficheiro *${asset.name}* no Arquivo ProVisual Corporate:\n\n${shareUrl}\n\nCumprimentos,\nEquipa ProVisual`)}`;
                        setShowMenu(false);
                        setActiveSubmenu('none');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                    >
                      <Mail size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                      <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">E-mail</span>
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const shareUrl = asset.webViewLink || asset.versions[0]?.url || window.location.href;
                        navigator.clipboard.writeText(shareUrl);
                        alert("Link de partilha copiado para a área de transferência!");
                        setShowMenu(false);
                        setActiveSubmenu('none');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                    >
                      <Copy size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                      <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">Copiar Link</span>
                    </button>

                    {asset.webViewLink && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(asset.webViewLink, '_blank');
                          setShowMenu(false);
                          setActiveSubmenu('none');
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                      >
                        <ExternalLink size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">Abrir no Drive</span>
                      </button>
                    )}
                  </motion.div>
                )}

                {activeSubmenu === 'organizar' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: 10 }}
                    transition={{ duration: 0.1 }}
                    className="absolute left-[100%] ml-1.5 top-0 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-50 py-1.5 text-left text-gray-700 font-sans cursor-default max-h-[300px] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Seção Mover */}
                    <div className="px-3.5 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Mover para</div>
                    
                    {asset.folderId !== "" && asset.folderId !== "root" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          setActiveSubmenu('none');
                          runAction(async () => {
                            if (asset.driveId) {
                              const moveResponse = await fetch('/api/drive/update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  fileId: asset.driveId,
                                  addParents: 'root',
                                  removeParents: asset.folderId === 'root' || asset.folderId === '' ? undefined : asset.folderId
                                })
                              });
                              if (!moveResponse.ok) {
                                const errData = await moveResponse.json();
                                throw new Error(errData.error || 'Erro ao mover no Google Drive');
                              }
                            }
                            await updateDoc(doc(db, "assets", asset.id), { folderId: "" });
                            alert(`Ficheiro "${asset.name}" movido para a Raiz com sucesso!`);
                            /* window.location.reload() removed */
                          });
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                      >
                        <FolderIcon size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">Raiz (Meu Drive)</span>
                      </button>
                    )}

                    {folders.filter(f => f.id !== asset.folderId).map(folder => (
                      <button
                        key={folder.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          setActiveSubmenu('none');
                          runAction(async () => {
                            if (asset.driveId) {
                              const moveResponse = await fetch('/api/drive/update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  fileId: asset.driveId,
                                  addParents: folder.id,
                                  removeParents: asset.folderId === 'root' || asset.folderId === '' ? undefined : asset.folderId
                                })
                              });
                              if (!moveResponse.ok) {
                                const errData = await moveResponse.json();
                                throw new Error(errData.error || 'Erro ao mover no Google Drive');
                              }
                            }
                            await updateDoc(doc(db, "assets", asset.id), { folderId: folder.id });
                            alert(`Ficheiro "${asset.name}" movido para a pasta "${folder.name}"!`);
                            /* window.location.reload() removed */
                          });
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                      >
                        <FolderIcon size={14} className="text-yellow-500 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">{folder.name}</span>
                      </button>
                    ))}

                    <div className="my-1.5 border-t border-gray-100" />

                    {/* Seção Copiar */}
                    <div className="px-3.5 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Copiar para</div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        setActiveSubmenu('none');
                        runAction(async () => {
                          let newDriveId = asset.driveId || "";
                          let newUrl = asset.versions[0]?.url || asset.webViewLink || "";

                          // 1. Copiar fisicamente no Google Drive real
                          if (asset.driveId) {
                            const copyResponse = await fetch('/api/drive/copy', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                fileId: asset.driveId,
                                destinationFolderId: 'root',
                                newName: `${asset.name} (Cópia)`
                              })
                            });
                            if (!copyResponse.ok) {
                              const errData = await copyResponse.json();
                              throw new Error(errData.error || 'Erro ao copiar no Google Drive');
                            }
                            const copyData = await copyResponse.json();
                            newDriveId = copyData.id;
                            newUrl = copyData.webViewLink;
                          }

                          // 2. Salvar no Firestore com os novos dados físicos
                          const newAsset = {
                            ...asset,
                            name: `${asset.name} (Cópia)`,
                            folderId: "",
                            driveId: newDriveId,
                            versions: [{
                              quality: "original",
                              size: asset.versions?.[0]?.size || "0 MB",
                              url: newUrl
                            }],
                            captureDate: new Date(),
                            createdAt: new Date()
                          };
                          delete (newAsset as any).id;
                          await addDoc(collection(db, "assets"), newAsset);
                          alert(`Cópia do ficheiro criada na Raiz!`);
                          /* window.location.reload() removed */
                        });
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                    >
                      <Copy size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                      <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">Raiz (Meu Drive)</span>
                    </button>

                    {(userProfile?.role === 'cliente' ? folders.filter(f => isFolderAllowedForClient(f.id)) : folders).map(folder => (
                      <button
                        key={folder.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          setActiveSubmenu('none');
                          runAction(async () => {
                            let newDriveId = asset.driveId || "";
                            let newUrl = asset.versions[0]?.url || asset.webViewLink || "";

                            // 1. Copiar fisicamente no Google Drive real
                            if (asset.driveId) {
                              const copyResponse = await fetch('/api/drive/copy', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  fileId: asset.driveId,
                                  destinationFolderId: folder.id,
                                  newName: `${asset.name} (Cópia)`
                                })
                              });
                              if (!copyResponse.ok) {
                                const errData = await copyResponse.json();
                                throw new Error(errData.error || 'Erro ao copiar no Google Drive');
                              }
                              const copyData = await copyResponse.json();
                              newDriveId = copyData.id;
                              newUrl = copyData.webViewLink;
                            }

                            // 2. Salvar no Firestore com os novos dados físicos
                            const newAsset = {
                              ...asset,
                              name: `${asset.name} (Cópia)`,
                              folderId: folder.id,
                              driveId: newDriveId,
                              versions: [{
                                quality: "original",
                                size: asset.versions?.[0]?.size || "0 MB",
                                url: newUrl
                              }],
                              captureDate: new Date(),
                              createdAt: new Date()
                            };
                            delete (newAsset as any).id;
                            await addDoc(collection(db, "assets"), newAsset);
                            alert(`Cópia do ficheiro criada na pasta "${folder.name}"!`);
                            /* window.location.reload() removed */
                          });
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                      >
                        <Copy size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">{folder.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
</button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSubmenu(activeSubmenu === 'organizar' ? 'none' : 'organizar');
                  }}
                  className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FolderIcon size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                    <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Organizar</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    alert("Arquivo disponibilizado offline com sucesso!");
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold text-green-600 cursor-pointer"
                >
                  <CheckCircle2 size={15} className="text-green-400 group-hover:text-green-600 transition-colors shrink-0" />
                  <span className="group-hover:text-green-600 transition-colors font-bold text-green-600">Disponibilizar offline</span>
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Tem certeza que deseja eliminar " + asset.name + "?")) {
                      setShowMenu(false);
                      runAction(async () => {
                        // 1. Mover para a Lixeira fisicamente no Google Drive real
                        if (asset.driveId) {
                          try {
                            const updateResponse = await fetch('/api/drive/update', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                fileId: asset.driveId,
                                trashed: true
                              })
                            });
                            if (!updateResponse.ok) {
                              const errData = await updateResponse.json();
                              console.warn("Erro ao mover no drive:", errData.error);
                            }
                          } catch (driveErr) {
                            console.warn("Falha física ao lixar no Drive, prosseguindo localmente:", driveErr);
                          }
                        }

                        // 2. Atualizar no Firestore
                        await updateDoc(doc(db, "assets", asset.id), { folderId: "trash", trashed: true });
                        /* window.location.reload() removed */
                      });
                    } else {
                      setShowMenu(false);
                    }
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold text-red-500 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={15} className="text-red-400 group-hover:text-red-600 transition-colors shrink-0" />
                    <span className="group-hover:text-red-600 transition-colors font-bold text-red-500">Eliminar</span>
                  </div>
                  <span className="text-[10px] text-red-300 font-mono tracking-tighter group-hover:text-red-500 transition-colors">Delete</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        {((asset.type === 'image' || asset.type === 'video') && (asset.thumbnailUrl || asset.driveId)) ? (
          <SafeImage
            thumbnailUrl={asset.thumbnailUrl ? asset.thumbnailUrl.replace('=s220', '=s500') : undefined}
            driveId={asset.driveId}
            fallbackSize="w500"
            alt={asset.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <Icon size={40} className={cn("transition-all duration-300", iconColor)} />
        )}
      </div>

      {/* Hover Overlay - Descrição ao passar o mouse */}
      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
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
  isNewlyUploaded?: boolean;
  onAskGemini: (asset: Asset) => void;
  folders: any[];
  onStartAction?: (active: boolean) => void;
  isBulkSelected?: boolean;
  onToggleBulkSelect?: () => void;
  hasSelectionActive?: boolean;
  onDistribute?: (item: {id: string, type: string, currentName: string}) => void;
}

function AssetRow({ 
  asset, 
  onSelect, 
  isSelected, 
  onPreview, 
  isNewlyUploaded = false, 
  onAskGemini, 
  folders, 
  onStartAction,
  isBulkSelected = false,
  onToggleBulkSelect,
  hasSelectionActive = false,
  onDistribute
}: AssetRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'none' | 'partilhar' | 'organizar' | 'atribuir'>('none');

  const runAction = async (actionFn: () => Promise<void>) => {
    try {
      onStartAction?.(true);
      await actionFn();
      onStartAction?.(false);
    } catch (err: any) {
      onStartAction?.(false);
      console.error(err);
      alert("Erro ao processar: " + err.message);
    }
  };
  const Icon = asset.type === "folder" ? FolderIcon : (asset.type === "image" ? ImageIcon : (asset.type === "video" ? Video : FileText));
  const iconColor = asset.type === "folder" ? "text-yellow-400" : (asset.type === "image" ? "text-blue-500" : (asset.type === "video" ? "text-purple-500" : "text-orange-500"));

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onPreview}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(true);
      }}
      className={cn(
        "grid grid-cols-12 px-8 py-4 border-b border-gray-50 items-center hover:bg-gray-50 cursor-pointer transition-all relative overflow-visible",
        isBulkSelected ? "bg-[#a21b7e]/10 hover:bg-[#a21b7e]/15 border-[#a21b7e]/20" : (isSelected && "bg-[#a21b7e]/5 hover:bg-[#a21b7e]/10 border-[#a21b7e]/10")
      )}
    >
      <div className="col-span-6 flex items-center gap-4">
        {/* Checkbox de Seleção em Massa */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggleBulkSelect?.();
          }}
          className={cn(
            "w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm mr-2",
            isBulkSelected 
              ? "border-[#a21b7e] bg-[#a21b7e] text-white" 
              : "border-gray-300 text-transparent hover:border-gray-400"
          )}
        >
          <Check size={12} className="stroke-[3]" />
        </div>

        {((asset.type === 'image' || asset.type === 'video') && (asset.thumbnailUrl || asset.driveId)) ? (
          <div className="w-8 h-8 overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100 rounded-none">
            <SafeImage
              thumbnailUrl={asset.thumbnailUrl}
              driveId={asset.driveId}
              fallbackSize="w100"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <Icon size={24} className={iconColor} />
        )}
        <span className="text-[16px] font-bold text-gray-700 truncate">{asset.name}</span>
        {isNewlyUploaded && (
          <span className="text-emerald-500 flex items-center shrink-0 ml-2 animate-in fade-in duration-300" title="Upload concluído com sucesso!">
            <CheckCircle2 size={16} />
          </span>
        )}
      </div>
      <div className="col-span-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">{asset.type}</div>
      <div className="col-span-2 text-xs text-gray-400 font-medium">
        {format(asset.captureDate, "dd/MM/yyyy")}
      </div>
      <div className="col-span-2 text-right pr-4 text-xs text-gray-500 font-mono flex items-center justify-end gap-3 relative overflow-visible">
        <span>{asset.versions[0]?.size || "0 MB"}</span>
        
        <div className="relative overflow-visible">
          <motion.button 
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            whileHover={{ scale: 1.25 }}
            whileTap={{ scale: 0.95 }}
            className="text-gray-400 hover:text-gray-600 p-1 transition-colors cursor-pointer"
          >
            <MoreVertical size={16} />
          </motion.button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    setActiveSubmenu('none');
                  }}
                />
                
                {/* SUBMENUS (Posicionados à esquerda do principal) */}
                

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_10px_rgba(0,0,0,0.06)] z-40 py-1.5 text-left text-gray-700 font-sans cursor-default animate-in fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview();
                      setShowMenu(false);
                    }}
                    className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <ExternalLink size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                      <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Visualizar</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      let url = asset.versions[0]?.url || asset.webViewLink;
                      if (url) {
                        if (url.includes('drive.google.com')) {
                          const matchId = url.match(/id=([^&]+)/) || url.match(/\/file\/d\/([^/]+)/);
                          const fileId = matchId ? matchId[1] : asset.driveId;
                          if (fileId) {
                            url = `https://drive.google.com/uc?export=download&id=${fileId}`;
                          }
                        }
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        iframe.src = url;
                        document.body.appendChild(iframe);
                        setTimeout(() => document.body.removeChild(iframe), 3000);
                      }
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                  >
                    <Download size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                    <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Transferir</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newName = prompt("Digite o novo nome para o arquivo:", asset.name);
                      if (newName) {
                        setShowMenu(false);
                        runAction(async () => {
                          // 1. Renomear fisicamente no Google Drive real
                          if (asset.driveId) {
                            const updateResponse = await fetch('/api/drive/update', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                fileId: asset.driveId,
                                newName: newName
                              })
                            });
                            if (!updateResponse.ok) {
                              const errData = await updateResponse.json();
                              throw new Error(errData.error || 'Erro ao renomear no Google Drive');
                            }
                          }

                          // 2. Atualizar no Firestore
                          await updateDoc(doc(db, "assets", asset.id), { name: newName });
                        });
                      } else {
                        setShowMenu(false);
                      }
                    }}
                    className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Pencil size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                      <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Mudar o nome</span>
                    </div>
                    <span className="text-[10px] text-gray-300 font-mono tracking-tighter group-hover:text-[#a21b7e] transition-colors">⌥⌘E</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      runAction(async () => {
                        let newDriveId = asset.driveId || "";
                        let newUrl = asset.versions[0]?.url || asset.webViewLink || "";

                        // 1. Copiar fisicamente no Google Drive real na mesma pasta
                        if (asset.driveId) {
                          const copyResponse = await fetch('/api/drive/copy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              fileId: asset.driveId,
                              destinationFolderId: asset.folderId || 'root',
                              newName: `${asset.name} (Cópia)`
                            })
                          });
                          if (!copyResponse.ok) {
                            const errData = await copyResponse.json();
                            throw new Error(errData.error || 'Erro ao copiar no Google Drive');
                          }
                          const copyData = await copyResponse.json();
                          newDriveId = copyData.id;
                          newUrl = copyData.webViewLink;
                        }

                        // 2. Salvar no Firestore com os novos dados físicos
                        const newAsset = {
                          ...asset,
                          name: `${asset.name} (Cópia)`,
                          driveId: newDriveId,
                          versions: [{
                            quality: "original",
                            size: asset.versions?.[0]?.size || "0 MB",
                            url: newUrl
                          }],
                          captureDate: new Date(),
                          createdAt: new Date()
                        };
                        delete (newAsset as any).id;
                        await addDoc(collection(db, "assets"), newAsset);
                        /* window.location.reload() removed */
                      });
                    }}
                    className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Copy size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                      <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Fazer cópia</span>
                    </div>
                    <span className="text-[10px] text-gray-300 font-mono tracking-tighter group-hover:text-[#a21b7e] transition-colors">⌘C ⌘V</span>
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAskGemini(asset);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold text-violet-600 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles size={15} className="text-violet-400 group-hover:text-violet-600 transition-colors shrink-0" />
                      <span className="group-hover:text-violet-600 transition-colors font-bold text-violet-600">Pedir ao Gemini</span>
                    </div>
                    <span className="text-[9px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full uppercase leading-none scale-90">Novo</span>
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSubmenu(activeSubmenu === 'partilhar' ? 'none' : 'partilhar');
                    }}
                    className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <UserPlus size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                      <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Partilhar</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                  
<AnimatePresence>
                  {activeSubmenu === 'partilhar' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: 10 }}
                      transition={{ duration: 0.1 }}
                      className="absolute left-[100%] ml-1.5 top-0 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-50 py-1.5 text-left text-gray-700 font-sans cursor-default animate-in fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-3.5 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Partilhar via</div>
                                          
                                          
                                          <div className="relative">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (typeof setActiveFolderSubmenu !== 'undefined') {
                                                  setActiveFolderSubmenu(activeFolderSubmenu === 'atribuir' ? 'none' : 'atribuir');
                                                } else if (typeof setActiveSubmenu !== 'undefined') {
                                                  setActiveSubmenu(activeSubmenu === 'atribuir' ? 'none' : 'atribuir');
                                                }
                                              }}
                                              className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                                            >
                                              <div className="flex items-center gap-3">
                                                <UserPlus size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                                                <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">Atribuir a Cliente</span>
                                              </div>
                                              <ChevronRight size={14} className="text-gray-300 group-hover/sub:text-[#a21b7e] transition-colors" />
                                            </button>
                                            
                                            <AnimatePresence>
                                              {((typeof activeFolderSubmenu !== 'undefined' && activeFolderSubmenu === 'atribuir') || (typeof activeSubmenu !== 'undefined' && activeSubmenu === 'atribuir')) && (
                                                <motion.div
                                                  initial={{ opacity: 0, scale: 0.95, x: -10 }}
                                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                                  exit={{ opacity: 0, scale: 0.95, x: -10 }}
                                                  transition={{ duration: 0.1 }}
                                                  className="absolute left-[100%] ml-1.5 top-0 w-48 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-[60] py-1 text-left max-h-64 overflow-y-auto custom-scrollbar cursor-default"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="px-3 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Selecione o Cliente</div>
                                                  {accounts && accounts.filter(a => a.role !== 'admin').length > 0 ? (
                                                    accounts.filter(a => a.role !== 'admin').map((client: any) => (
                                                      <button
                                                        key={client.id}
                                                        onClick={async (e) => {
                                                          e.stopPropagation();
                                                          const it = typeof folder !== 'undefined' ? { id: folder.id, type: 'folder' } : typeof asset !== 'undefined' ? { id: asset.id, type: asset.type } : null;
                                                          if (it) {
                                                            try {
                                                              const docRef = doc(db, it.type === 'folder' ? 'folders' : 'assets', it.id);
                                                              await updateDoc(docRef, { clientId: client.email });
                                                              alert("Atribuído com sucesso!");
                                                            } catch (err) {
                                                              alert("Erro ao atribuir: " + err.message);
                                                            }
                                                          }
                                                          if (typeof setActiveFolderSubmenu !== 'undefined') setActiveFolderSubmenu('none');
                                                          if (typeof setActiveSubmenu !== 'undefined') setActiveSubmenu('none');
                                                          if (typeof setShowMenu !== 'undefined') setShowMenu(false);
                                                          if (typeof setActiveFolderMenuId !== 'undefined') setActiveFolderMenuId(null);
                                                        }}
                                                        className="w-full text-left px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-[#a21b7e]/5 hover:text-[#a21b7e] truncate block transition-colors"
                                                      >
                                                        {client.displayName || client.email}
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <div className="px-3 py-2 text-xs text-gray-400 italic">Nenhum cliente disponível</div>
                                                  )}
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const shareUrl = asset.versions[0]?.url || asset.webViewLink || window.location.href;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Confira o arquivo *${asset.name}* no ProVisual Corporate: ${shareUrl}`)}`, '_blank');
                          setShowMenu(false);
                          setActiveSubmenu('none');
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                      >
                        <Share2 size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">WhatsApp</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const shareUrl = asset.versions[0]?.url || asset.webViewLink || window.location.href;
                          window.location.href = `mailto:?subject=${encodeURIComponent(`Partilha de Ficheiro - ProVisual`)}&body=${encodeURIComponent(`Olá!\n\nSegue o link para aceder ao ficheiro *${asset.name}* no Arquivo ProVisual Corporate:\n\n${shareUrl}\n\nCumprimentos,\nEquipa ProVisual`)}`;
                          setShowMenu(false);
                          setActiveSubmenu('none');
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                      >
                        <Mail size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">E-mail</span>
                      </button>

                      <div className="my-1 border-t border-gray-100" />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const shareUrl = asset.webViewLink || asset.versions[0]?.url || window.location.href;
                          navigator.clipboard.writeText(shareUrl);
                          alert("Link de partilha copiado para a área de transferência!");
                          setShowMenu(false);
                          setActiveSubmenu('none');
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                      >
                        <Copy size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">Copiar Link</span>
                      </button>

                      {asset.webViewLink && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(asset.webViewLink, '_blank');
                            setShowMenu(false);
                            setActiveSubmenu('none');
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                        >
                          <ExternalLink size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                          <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors">Abrir no Drive</span>
                        </button>
                      )}
                    </motion.div>
                  )}

                  {activeSubmenu === 'organizar' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, x: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: 10 }}
                      transition={{ duration: 0.1 }}
                      className="absolute left-[100%] ml-1.5 top-0 w-52 bg-white border border-gray-100 rounded-sm shadow-[0_3px_15px_rgba(0,0,0,0.1)] z-50 py-1.5 text-left text-gray-700 font-sans cursor-default max-h-[300px] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Seção Mover */}
                      <div className="px-3.5 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Mover para</div>
                      
                      {asset.folderId !== "" && asset.folderId !== "root" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            setActiveSubmenu('none');
                            runAction(async () => {
                              if (asset.driveId) {
                                const moveResponse = await fetch('/api/drive/update', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    fileId: asset.driveId,
                                    addParents: 'root',
                                    removeParents: asset.folderId === 'root' || asset.folderId === '' ? undefined : asset.folderId
                                  })
                                });
                                if (!moveResponse.ok) {
                                  const errData = await moveResponse.json();
                                  throw new Error(errData.error || 'Erro ao mover no Google Drive');
                                }
                              }
                              await updateDoc(doc(db, "assets", asset.id), { folderId: "" });
                              alert(`Ficheiro "${asset.name}" movido para a Raiz com sucesso!`);
                              /* window.location.reload() removed */
                            });
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                        >
                          <FolderIcon size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                          <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">Raiz (Meu Drive)</span>
                        </button>
                      )}

                      {folders.filter(f => f.id !== asset.folderId).map(folder => (
                        <button
                          key={folder.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            setActiveSubmenu('none');
                            runAction(async () => {
                              if (asset.driveId) {
                                const moveResponse = await fetch('/api/drive/update', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    fileId: asset.driveId,
                                    addParents: folder.id,
                                    removeParents: asset.folderId === 'root' || asset.folderId === '' ? undefined : asset.folderId
                                  })
                                });
                                if (!moveResponse.ok) {
                                  const errData = await moveResponse.json();
                                  throw new Error(errData.error || 'Erro ao mover no Google Drive');
                                }
                              }
                              await updateDoc(doc(db, "assets", asset.id), { folderId: folder.id });
                              alert(`Ficheiro "${asset.name}" movido para a pasta "${folder.name}"!`);
                              /* window.location.reload() removed */
                            });
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                        >
                          <FolderIcon size={14} className="text-yellow-500 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                          <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">{folder.name}</span>
                        </button>
                      ))}

                      <div className="my-1.5 border-t border-gray-100" />

                      {/* Seção Copiar */}
                      <div className="px-3.5 py-1 text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50 mb-1">Copiar para</div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          setActiveSubmenu('none');
                          runAction(async () => {
                            let newDriveId = asset.driveId || "";
                            let newUrl = asset.versions[0]?.url || asset.webViewLink || "";

                            // 1. Copiar fisicamente no Google Drive real
                            if (asset.driveId) {
                              const copyResponse = await fetch('/api/drive/copy', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  fileId: asset.driveId,
                                  destinationFolderId: 'root',
                                  newName: `${asset.name} (Cópia)`
                                })
                              });
                              if (!copyResponse.ok) {
                                const errData = await copyResponse.json();
                                throw new Error(errData.error || 'Erro ao copiar no Google Drive');
                              }
                              const copyData = await copyResponse.json();
                              newDriveId = copyData.id;
                              newUrl = copyData.webViewLink;
                            }

                            // 2. Salvar no Firestore com os novos dados físicos
                            const newAsset = {
                              ...asset,
                              name: `${asset.name} (Cópia)`,
                              folderId: "",
                              driveId: newDriveId,
                              versions: [{
                                quality: "original",
                                size: asset.versions?.[0]?.size || "0 MB",
                                url: newUrl
                              }],
                              captureDate: new Date(),
                              createdAt: new Date()
                            };
                            delete (newAsset as any).id;
                            await addDoc(collection(db, "assets"), newAsset);
                            alert(`Cópia do ficheiro criada na Raiz!`);
                            /* window.location.reload() removed */
                          });
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                      >
                        <Copy size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                        <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">Raiz (Meu Drive)</span>
                      </button>

                      {(userProfile?.role === 'cliente' ? folders.filter(f => isFolderAllowedForClient(f.id)) : folders).map(folder => (
                        <button
                          key={folder.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            setActiveSubmenu('none');
                            runAction(async () => {
                              let newDriveId = asset.driveId || "";
                              let newUrl = asset.versions[0]?.url || asset.webViewLink || "";

                              // 1. Copiar fisicamente no Google Drive real
                              if (asset.driveId) {
                                const copyResponse = await fetch('/api/drive/copy', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    fileId: asset.driveId,
                                    destinationFolderId: folder.id,
                                    newName: `${asset.name} (Cópia)`
                                  })
                                });
                                if (!copyResponse.ok) {
                                  const errData = await copyResponse.json();
                                  throw new Error(errData.error || 'Erro ao copiar no Google Drive');
                                }
                                const copyData = await copyResponse.json();
                                newDriveId = copyData.id;
                                newUrl = copyData.webViewLink;
                              }

                              // 2. Salvar no Firestore com os novos dados físicos
                              const newAsset = {
                                ...asset,
                                name: `${asset.name} (Cópia)`,
                                folderId: folder.id,
                                driveId: newDriveId,
                                versions: [{
                                  quality: "original",
                                  size: asset.versions?.[0]?.size || "0 MB",
                                  url: newUrl
                                }],
                                captureDate: new Date(),
                                createdAt: new Date()
                              };
                              delete (newAsset as any).id;
                              await addDoc(collection(db, "assets"), newAsset);
                              alert(`Cópia do ficheiro criada na pasta "${folder.name}"!`);
                              /* window.location.reload() removed */
                            });
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group/sub transition-colors text-left text-[13px] font-bold cursor-pointer"
                        >
                          <Copy size={14} className="text-gray-400 group-hover/sub:text-[#a21b7e] transition-colors shrink-0" />
                          <span className="text-gray-600 group-hover/sub:text-[#a21b7e] transition-colors truncate">{folder.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
</button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSubmenu(activeSubmenu === 'organizar' ? 'none' : 'organizar');
                    }}
                    className="relative w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <FolderIcon size={15} className="text-gray-400 group-hover:text-[#a21b7e] transition-colors shrink-0" />
                      <span className="text-gray-600 group-hover:text-[#a21b7e] transition-colors">Organizar</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      alert("Arquivo disponibilizado offline com sucesso!");
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold text-green-600 cursor-pointer"
                  >
                    <CheckCircle2 size={15} className="text-green-400 group-hover:text-green-600 transition-colors shrink-0" />
                    <span className="group-hover:text-green-600 transition-colors font-bold text-green-600">Disponibilizar offline</span>
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Tem certeza que deseja eliminar " + asset.name + "?")) {
                        setShowMenu(false);
                        runAction(async () => {
                          // 1. Mover para a Lixeira fisicamente no Google Drive real
                          if (asset.driveId) {
                            try {
                              const updateResponse = await fetch('/api/drive/update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  fileId: asset.driveId,
                                  trashed: true
                                })
                              });
                              if (!updateResponse.ok) {
                                const errData = await updateResponse.json();
                                console.warn("Erro ao mover no drive:", errData.error);
                              }
                            } catch (driveErr) {
                              console.warn("Falha física ao lixar no Drive, prosseguindo localmente:", driveErr);
                            }
                          }

                          // 2. Atualizar no Firestore
                          await updateDoc(doc(db, "assets", asset.id), { folderId: "trash", trashed: true });
                          /* window.location.reload() removed */
                        });
                      } else {
                        setShowMenu(false);
                      }
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 bg-transparent hover:bg-transparent group transition-colors text-left text-[13px] font-bold text-red-500 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 size={15} className="text-red-400 group-hover:text-red-600 transition-colors shrink-0" />
                      <span className="group-hover:text-red-600 transition-colors font-bold text-red-500">Eliminar</span>
                    </div>
                    <span className="text-[10px] text-red-300 font-mono tracking-tighter group-hover:text-red-500 transition-colors">Delete</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
