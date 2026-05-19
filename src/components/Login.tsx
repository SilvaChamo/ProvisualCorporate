import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users2, Eye, EyeOff, HelpCircle, Phone, Mail, MessageSquare, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";
import { supabase, db } from "../lib/supabase";

import { doc, setDoc, getDoc, serverTimestamp, collection, query, where } from "../lib/supabase";
import logoHorizontal from "../Logo/logo_horizontal_clean.png";
import simboloImg from "../Logo/Simbolo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSupport, setShowSupport] = useState(false);

  // Auto-prover a conta master de administrador no Firestore no primeiro carregamento
  useEffect(() => {
    const provisionAdmin = async () => {
      try {
        const adminDocRef = doc(db, "users", "admin_master_silva");
        const adminDoc = await getDoc(adminDocRef);
        
        // Se não existir, ou se quisermos atualizar para garantir as credenciais corretas
        if (!adminDoc.exists() || adminDoc.data()?.email !== "silva.chamo@gmail.com") {
          await setDoc(adminDocRef, {
            email: "silva.chamo@gmail.com",
            displayName: "Silva Chamo (Admin Master)",
            password: "Administrador#01?*",
            role: "admin",
            adminToken: "Silva_Chamo_Master_Admin_2026",
            createdAt: serverTimestamp()
          });
          console.log("Conta Master de Administrador provisionada com sucesso!");
        }
      } catch (err) {
        console.warn("Erro ao auto-provisionar administrador master:", err);
      }
    };
    provisionAdmin();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        // Create user profile in Firestore with adminToken field
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: "admin", // Definido como administrador ao cadastrar
          createdAt: serverTimestamp(),
          adminToken: "Silva_Chamo_Master_Admin_2026"
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.warn("Firebase Auth falhou, verificando credenciais locais no Firestore:", err.code);
      
      // Permitir login via Firestore em qualquer ambiente (desenvolvimento ou produção)
      // para suportar contas corporativas e de clientes criadas diretamente no painel.
      try {
        // Buscamos se existe uma conta criada no Firestore com este email (busca case-insensitive)
        const searchEmail = email.trim().toLowerCase();
        const { data, error: dbErr } = await supabase.from('user_profiles').select('*').eq('email', searchEmail);
        if (dbErr) throw dbErr;

        if (data && data.length > 0) {
          const userData = data[0];
          const userDoc = { id: userData.id };
          
          if (userData.password === password) {
            // Credencial coincide perfeitamente!
            const simulatedUser = {
              uid: userDoc.id,
              email: userData.email,
              displayName: userData.displayName || userData.email.split("@")[0],
              role: userData.role || "cliente"
            };
            localStorage.setItem("provisual_local_admin", JSON.stringify(simulatedUser));
            window.location.href = simulatedUser.role === "admin" ? "/dashboard" : "/cliente";
            return;
          } else {
            setError("Senha de acesso incorreta para esta conta.");
            setIsLoading(false);
            return;
          }
        } else {
          setError("Esta conta de e-mail não está cadastrada na plataforma.");
          setIsLoading(false);
          return;
        }
      } catch (dbErr: any) {
        console.error("Erro ao verificar credenciais locais:", dbErr);
        setError(`Erro ao validar credenciais no banco: ${dbErr.message || dbErr}`);
        setIsLoading(false);
        return;
      }
    }
  };



  return (
    <div className="flex min-h-screen font-sans bg-white">
      {/* Left side - Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#a21b7e] flex-col items-center justify-center text-white px-12 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center z-10"
        >
          <div className="relative inline-block mx-auto mb-8">
            <div className="w-32 h-32 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm mx-auto shadow-2xl p-4">
              <img src={simboloImg} alt="ProVisual Simbolo" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-4 tracking-tight">ProVisual</h1>
          <p className="text-xl font-medium max-w-md mx-auto leading-relaxed mb-12">
            Bem-vindo ao portal corporativo de ativos visuais da Pro Visual Corporate.
          </p>
        </motion.div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#fafafa]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="border border-gray-200 p-8 md:p-10 rounded-2xl bg-white shadow-md transition-all duration-300">
            {!showSupport ? (
              <form onSubmit={handleEmailAuth} className="space-y-6 animate-fade-in">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 text-xs font-bold border border-red-100">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="bg-green-50 text-green-600 p-3 text-xs font-bold border border-green-100 mb-4">
                    {successMessage}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 ml-1" htmlFor="email">
                    EMAIL
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full h-12 bg-gray-50 border border-gray-100 px-4 text-sm text-gray-800 focus:border-[#a21b7e] placeholder:text-gray-300/70 placeholder:font-light transition-all outline-none rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2 ml-1" htmlFor="password">
                    {isSignUp ? "CRIAR SENHA" : "SENHA DE ACESSO"}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-12 bg-gray-50 border border-gray-100 px-4 text-sm text-gray-800 focus:border-[#a21b7e] placeholder:text-gray-300/70 placeholder:font-light transition-all outline-none rounded-lg"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "w-full h-14 bg-[#a21b7e] text-white text-sm font-bold shadow-lg shadow-[#a21b7e]/20 hover:bg-[#8e176e] active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest mt-8 rounded-lg",
                    isLoading && "opacity-80"
                  )}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    isSignUp ? "Registrar agora" : "Entrar no Console"
                  )}
                </button>

                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowSupport(true)}
                    className="w-full h-12 border border-gray-100 bg-white text-gray-400 hover:text-[#a21b7e] hover:border-[#a21b7e]/20 text-[10px] font-bold uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 rounded-lg mt-3"
                  >
                    <HelpCircle size={14} className="shrink-0 animate-pulse" />
                    <span>Suporte Técnico</span>
                  </button>
                )}
              </form>
            ) : (
              <div className="animate-fade-in flex flex-col items-center">
                {/* Header Icon */}
                <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center text-[#a21b7e] mb-4">
                  <HelpCircle size={28} />
                </div>

                <h3 className="text-base font-bold text-gray-800 tracking-tight text-center">Suporte ProVisual</h3>
                <p className="text-[11px] text-gray-400 mt-1.5 mb-6 text-center leading-relaxed px-2">
                  Precisa de ajuda com credenciais ou assistência corporativa? Entre em contato conosco pelos canais abaixo:
                </p>

                <div className="w-full space-y-3">
                  {/* WhatsApp Support */}
                  <a
                    href="https://wa.me/258843131130"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-3.5 border border-gray-200/70 bg-[#fafafa]/40 rounded-xl hover:bg-white hover:border-[#a21b7e]/25 hover:shadow-sm active:scale-[0.98] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-50/80 text-emerald-600 flex items-center justify-center shrink-0">
                        <MessageSquare size={16} />
                      </div>
                      <div className="leading-tight text-left">
                        <div className="text-xs font-bold text-gray-800">WhatsApp Oficial</div>
                        <div className="text-[10px] text-gray-400 font-medium mt-0.5">+258 84 313 1130</div>
                      </div>
                    </div>
                    <ExternalLink size={11} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                  </a>

                  {/* Email Support */}
                  <a
                    href="mailto:suporte@provisualcorporate.co.mz"
                    className="w-full flex items-center justify-between p-3.5 border border-gray-200/70 bg-[#fafafa]/40 rounded-xl hover:bg-white hover:border-[#a21b7e]/25 hover:shadow-sm active:scale-[0.98] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50/80 text-blue-600 flex items-center justify-center shrink-0">
                        <Mail size={16} />
                      </div>
                      <div className="leading-tight text-left">
                        <div className="text-xs font-bold text-gray-800">E-mail de Suporte</div>
                        <div className="text-[10px] text-gray-400 font-medium mt-0.5">suporte@provisualcorporate.co.mz</div>
                      </div>
                    </div>
                    <ExternalLink size={11} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                  </a>

                  {/* Phone Contact */}
                  <a
                    href="tel:+258843131130"
                    className="w-full flex items-center justify-between p-3.5 border border-gray-200/70 bg-[#fafafa]/40 rounded-xl hover:bg-white hover:border-[#a21b7e]/25 hover:shadow-sm active:scale-[0.98] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-50/80 text-[#a21b7e] flex items-center justify-center shrink-0">
                        <Phone size={16} />
                      </div>
                      <div className="leading-tight text-left">
                        <div className="text-xs font-bold text-gray-800">Telefone Corporativo</div>
                        <div className="text-[10px] text-gray-400 font-medium mt-0.5">+258 84 313 1130</div>
                      </div>
                    </div>
                    <ExternalLink size={11} className="text-gray-300 group-hover:text-[#a21b7e] transition-colors" />
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSupport(false)}
                  className="mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-[#a21b7e] transition-colors active:scale-[0.98]"
                >
                  Voltar ao Login
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
