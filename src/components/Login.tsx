import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users2, Eye, EyeOff, Globe } from "lucide-react";
import { cn } from "../lib/utils";
import { auth, db } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
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

  // Auto-prover a conta master de administrador no Firestore no primeiro carregamento
  useEffect(() => {
    const isDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isDevelopment) {
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
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Create profile if doesn't exist
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          displayName: user.displayName,
          role: "admin", // Definido como administrador ao logar
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.warn("Google Auth falhou:", err.code);
      
      if (err.code === "auth/unauthorized-domain") {
        setError("Este domínio (localhost) não está autorizado para login com Google no seu Console do Firebase. Adicione 'localhost' nas configurações de autenticação do Firebase ou acesse com seu e-mail e senha.");
      } else {
        setError(`Falha na autenticação com Google: ${err.message || "Tente novamente."}`);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
      
      const isDevelopment = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      
      if (isDevelopment) {
        try {
          // Buscamos se existe uma conta criada no Firestore com este email (busca case-insensitive)
          const searchEmail = email.trim().toLowerCase();
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", searchEmail));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.password === password) {
              // Credencial local coincide perfeitamente!
              const simulatedUser = {
                uid: userDoc.id,
                email: userData.email,
                displayName: userData.displayName || userData.email.split("@")[0],
                role: userData.role || "cliente"
              };
              localStorage.setItem("provisual_local_admin", JSON.stringify(simulatedUser));
              window.location.href = "/dashboard";
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
      
      // Caso não esteja em desenvolvimento ou ocorra outra falha
      setError("Credenciais de acesso inválidas. A porta está fechada para usuários não autorizados.");
      setIsLoading(false);
      return;
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Por favor, digite seu e-mail primeiro para recuperar a senha.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    } catch (err: any) {
      setError("Erro ao enviar e-mail. Verifique se o endereço está correto.");
    } finally {
      setIsLoading(false);
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
          <div className="border border-gray-200 p-8 md:p-10 rounded-lg bg-white shadow-md">
            <form onSubmit={handleEmailAuth} className="space-y-6">
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
                  className="w-full h-12 bg-gray-50 border border-gray-100 px-4 text-sm text-gray-800 focus:border-[#a21b7e] transition-all outline-none rounded-lg"
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
                    className="w-full h-12 bg-gray-50 border border-gray-100 px-4 text-sm text-gray-800 focus:border-[#a21b7e] transition-all outline-none rounded-lg"
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
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-bold text-gray-300">
                <span className="bg-white px-2">Ou acessar com</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-12 border border-gray-200 bg-white text-gray-600 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98] rounded-lg"
            >
              <svg className="w-4 h-4 shrink-0 animate-bounce-short" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Acessar com o Google</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            {!isSignUp && (
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:text-[#a21b7e] transition-colors"
              >
                Esqueceu sua senha?
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
