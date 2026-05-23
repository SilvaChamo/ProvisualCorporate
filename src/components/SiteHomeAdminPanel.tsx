import React, { useRef, useState } from "react";
import { Globe, Images, Key, Video } from "lucide-react";
import { cn } from "../lib/utils";
import AlbumsAdminTab from "./admin/AlbumsAdminTab";
import VideosAdminTab from "./admin/VideosAdminTab";
import AccessAccountsAdmin from "./admin/AccessAccountsAdmin";
import UnsavedChangesDialog from "./admin/UnsavedChangesDialog";
import type { AdminEditorHandle } from "./admin/AdminEditorHandle";

type HomeAdminTab = "albuns" | "videos" | "contas";

const TABS: { id: HomeAdminTab; label: string; icon: React.ReactNode }[] = [
  { id: "albuns", label: "Álbuns", icon: <Images size={16} /> },
  { id: "videos", label: "Vídeos", icon: <Video size={16} /> },
  { id: "contas", label: "Contas de Acesso", icon: <Key size={16} /> },
];

export default function SiteHomeAdminPanel() {
  const [activeTab, setActiveTab] = useState<HomeAdminTab>("albuns");
  const [pendingTab, setPendingTab] = useState<HomeAdminTab | null>(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [unsavedSaving, setUnsavedSaving] = useState(false);
  const editorRef = useRef<AdminEditorHandle | null>(null);

  const requestTabChange = (tab: HomeAdminTab) => {
    if (tab === activeTab) return;

    const editor = editorRef.current;
    if (editor?.isEditing()) {
      setPendingTab(tab);
      setUnsavedOpen(true);
      return;
    }

    setActiveTab(tab);
  };

  const closeUnsavedDialog = () => {
    if (unsavedSaving) return;
    setUnsavedOpen(false);
    setPendingTab(null);
  };

  const continueEditing = () => {
    closeUnsavedDialog();
  };

  const leaveWithoutSaving = () => {
    editorRef.current?.discard();
    if (pendingTab) setActiveTab(pendingTab);
    setUnsavedOpen(false);
    setPendingTab(null);
  };

  const saveAndSwitch = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    setUnsavedSaving(true);
    try {
      const saved = await editor.save();
      if (!saved) return;
      if (pendingTab) setActiveTab(pendingTab);
      setUnsavedOpen(false);
      setPendingTab(null);
    } finally {
      setUnsavedSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Globe className="text-[#a21b7e] shrink-0" size={24} />
                Gestão do Site
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Álbuns de fotos, vídeos do YouTube e contas de acesso dos clientes.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-1 shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => requestTabChange(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap",
                    activeTab === tab.id
                      ? "text-[#a21b7e]"
                      : "text-gray-500 hover:text-gray-700",
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-[420px]">
          {activeTab === "albuns" && <AlbumsAdminTab ref={editorRef} />}
          {activeTab === "videos" && <VideosAdminTab ref={editorRef} />}
          {activeTab === "contas" && <AccessAccountsAdmin />}
        </div>
      </div>

      <UnsavedChangesDialog
        open={unsavedOpen}
        saving={unsavedSaving}
        onCancel={continueEditing}
        onDiscard={leaveWithoutSaving}
        onSave={saveAndSwitch}
      />
    </div>
  );
}
