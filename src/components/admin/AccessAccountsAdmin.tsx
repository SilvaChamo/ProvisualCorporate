import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Pencil,
  Search,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  db,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "../../lib/supabase";
import { fetchAdminAccounts } from "../../lib/siteGalleryApi";

function generateStrongPassword() {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const nums = "0123456789";
  const syms = "@#!$%&*";
  let pass = "";
  pass += chars[Math.floor(Math.random() * chars.length)];
  pass += caps[Math.floor(Math.random() * caps.length)];
  pass += nums[Math.floor(Math.random() * nums.length)];
  pass += syms[Math.floor(Math.random() * syms.length)];
  const allChars = chars + caps + nums + syms;
  for (let i = 0; i < 6; i++) {
    pass += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return pass.split("").sort(() => 0.5 - Math.random()).join("");
}

function parseAccountDisplay(displayName: string) {
  const rawName = String(displayName || "");
  const parts = rawName.split("|");
  if (parts.length === 3) {
    return { responsible: parts[0], name: parts[1], logo: parts[2] };
  }
  if (parts.length === 2) {
    return { responsible: "", name: parts[0], logo: parts[1] };
  }
  return { responsible: "", name: rawName, logo: "" };
}

export default function AccessAccountsAdmin({
  onToolbarChange,
}: {
  onToolbarChange?: (actions: React.ReactNode) => void;
}) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formMode, setFormMode] = useState<"hidden" | "add" | "edit">("hidden");
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountResponsible, setNewAccountResponsible] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountLogo, setNewAccountLogo] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [newAccountRole, setNewAccountRole] = useState<"admin" | "cliente">("cliente");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const reloadAccounts = useCallback(async () => {
    try {
      const accountsList = await fetchAdminAccounts();
      setAccounts(accountsList);
      setAccountsLoaded(true);
      setAccountError(null);
    } catch (error: unknown) {
      console.error("Accounts read error:", error);
      setAccountError(
        error instanceof Error ? error.message : "Erro ao carregar contas de acesso.",
      );
      setAccountsLoaded(true);
    }
  }, []);

  useEffect(() => {
    reloadAccounts();
  }, [reloadAccounts]);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter((account) => {
      const name = String(account.displayName || "").toLowerCase();
      const email = String(account.email || "").toLowerCase();
      const clientId = String(account.clientId || account.id || "").toLowerCase();
      return name.includes(q) || email.includes(q) || clientId.includes(q);
    });
  }, [accounts, searchQuery]);

  const resetForm = () => {
    setFormMode("hidden");
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

  const openAddForm = () => {
    resetForm();
    setNewAccountPassword(generateStrongPassword());
    setFormMode("add");
  };

  useEffect(() => {
    if (!onToolbarChange) return;
    if (formMode !== "hidden") {
      onToolbarChange(null);
      return;
    }
    onToolbarChange(
      <button
        type="button"
        onClick={openAddForm}
        className="flex flex-1 md:flex-none items-center justify-center gap-2 bg-[#a21b7e] hover:bg-[#8e176e] text-white px-4 py-2 rounded-sm text-sm font-bold shadow-sm transition-all cursor-pointer h-10"
      >
        <UserPlus size={16} />
        Criar Conta de Acesso
      </button>,
    );
    return () => onToolbarChange(null);
  }, [formMode, onToolbarChange]);

  const openEditForm = (account: any) => {
    setEditingAccount(account);
    setNewAccountEmail(account.email);
    const parsed = parseAccountDisplay(account.displayName);
    setNewAccountResponsible(parsed.responsible);
    setNewAccountName(parsed.name);
    setNewAccountLogo(parsed.logo);
    setNewAccountPassword(account.password || "");
    setNewAccountRole(account.role || "cliente");
    setAccountError(null);
    setAccountSuccess(null);
    setFormMode("edit");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          setNewAccountLogo(canvas.toDataURL("image/jpeg", 0.7));
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
        await setDoc(
          doc(db, "users", editingAccount.id),
          {
            email: newAccountEmail.trim().toLowerCase(),
            displayName: displayNameValue,
            password: newAccountPassword,
            role: newAccountRole,
            adminToken: "Silva_Chamo_Master_Admin_2026",
          },
          { merge: true },
        );
        setAccountSuccess("Conta de acesso editada com sucesso!");
      } else {
        const emailExists = accounts.some(
          (acc) => acc.email?.toLowerCase() === newAccountEmail.trim().toLowerCase(),
        );
        if (emailExists) {
          setAccountError("Este e-mail já está cadastrado.");
          setIsCreatingAccount(false);
          return;
        }

        const generatedUid = "client_" + Math.random().toString(36).substring(2, 11);
        await setDoc(doc(db, "users", generatedUid), {
          email: newAccountEmail.trim().toLowerCase(),
          displayName: displayNameValue,
          password: newAccountPassword,
          role: newAccountRole,
          clientId: generatedUid,
          createdAt: serverTimestamp(),
          adminToken: "Silva_Chamo_Master_Admin_2026",
        });
        setAccountSuccess("Conta de acesso criada com sucesso!");
      }

      setTimeout(async () => {
        resetForm();
        await reloadAccounts();
      }, 1200);
    } catch (err: any) {
      console.error("Erro ao salvar conta:", err);
      setAccountError(`Erro no banco de dados ao salvar a conta: ${err.message || err}`);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir a conta de "${accountName}"?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", accountId));
      await reloadAccounts();
    } catch (err) {
      console.error("Erro ao excluir conta:", err);
      alert("Erro ao excluir conta.");
    }
  };

  return (
    <div className="space-y-6 min-h-[420px]">
      {accountError && formMode === "hidden" && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{accountError}</span>
        </div>
      )}

      {accounts.length > 10 && formMode === "hidden" && (
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar contas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a21b7e]"
          />
        </div>
      )}

      {formMode !== "hidden" ? (
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4">
            {formMode === "edit" ? "Editar Conta de Acesso" : "Nova Conta de Acesso"}
          </h3>
          <form onSubmit={handleSaveAccount} className="space-y-3">
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
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
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
                placeholder="Senha de Acesso"
                value={newAccountPassword}
                onChange={(e) => setNewAccountPassword(e.target.value)}
                className="block flex-1 px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#a21b7e] transition-all bg-gray-50 font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setNewAccountPassword(generateStrongPassword())}
                className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-bold transition-all cursor-pointer border border-gray-200 shrink-0"
              >
                Gerar Senha
              </button>
            </div>

            <select
              value={newAccountRole}
              onChange={(e) => setNewAccountRole(e.target.value as "admin" | "cliente")}
              className="block w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#a21b7e] transition-all bg-gray-50"
            >
              <option value="cliente">Cliente (Acesso de visualização de arquivos)</option>
              <option value="admin">Administrador (Gestão completa do portal)</option>
            </select>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 bg-transparent hover:border-gray-400 rounded-sm text-sm font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreatingAccount}
                className="flex-1 py-2.5 border border-[#a21b7e] text-[#a21b7e] bg-transparent hover:text-[#8e176e] hover:border-[#8e176e] rounded-sm text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isCreatingAccount ? "A salvar..." : formMode === "edit" ? "Salvar Alterações" : "Criar Conta de Acesso"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-4 py-3 whitespace-nowrap">Nome do Cliente / Empresa</th>
                <th className="px-4 py-3 whitespace-nowrap">ID do Cliente</th>
                <th className="px-4 py-3 whitespace-nowrap">E-mail de Acesso</th>
                <th className="px-4 py-3 whitespace-nowrap">Senha de Acesso</th>
                <th className="px-4 py-3 whitespace-nowrap">Perfil</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm bg-white">
              {!accountsLoaded ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin text-[#a21b7e]" />
                      A carregar contas...
                    </span>
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 italic">
                    {searchQuery
                      ? "Nenhuma conta corresponde à sua pesquisa."
                      : 'Nenhuma conta cadastrada. Clique em "Criar Conta de Acesso" para começar!'}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => {
                  const parsed = parseAccountDisplay(account.displayName);
                  return (
                    <tr key={account.id || account.uid} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-800">
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
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            account.role === "admin"
                              ? "bg-purple-50 text-[#a21b7e] border border-purple-100"
                              : "bg-blue-50 text-blue-600 border border-blue-100",
                          )}
                        >
                          {account.role === "admin" ? "Administrador" : "Cliente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(account)}
                            className="p-2 text-gray-400 hover:text-[#a21b7e] hover:bg-[#a21b7e]/5 rounded transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteAccount(account.id, parsed.name || account.email)
                            }
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
  );
}
