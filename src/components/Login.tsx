import React, { useState } from "react";
import { motion } from "motion/react";
import { Users2, Eye, EyeOff, Globe } from "lucide-react";
import { cn } from "../lib/utils";
import { auth, db } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Create profile if doesn't exist
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          displayName: user.displayName,
          role: "cliente", // Default role
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      setError("Falha na autenticação com Google. Tente novamente.");
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
        
        // Create user profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: "cliente", // Default role
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está em uso.");
      } else if (err.code === "auth/weak-password") {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else {
        setError("Credenciais inválidas ou erro no servidor.");
      }
      console.error(err);
    } finally {
      setIsLoading(false);
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
      <div className="hidden lg:flex lg:w-1/2 bg-[#a21b7e] flex-col items-center justify-center text-white px-12 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center z-10"
        >
          <h1 className="text-6xl font-bold mb-4 tracking-tight">ProVisual</h1>
          <p className="text-xl font-medium max-w-md mx-auto leading-relaxed mb-12">
            Bem-vindo ao portal corporativo de ativos visuais de alta qualidade.
          </p>
          
          <div className="relative inline-block">
            <div className="w-28 h-28 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm mx-auto shadow-2xl">
              <Users2 className="w-14 h-14 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-2">
              {isSignUp ? "Criar Conta" : "Acesso do Cliente"}
            </h2>
            <p className="text-gray-400 text-sm font-medium">
              {isSignUp ? "Registre-se para começar." : "Insira as credenciais enviadas por email."}
            </p>
          </div>

          <div className="border border-gray-200 p-[25px] rounded-lg bg-white shadow-sm">
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
              <Globe className="w-4 h-4 text-[#a21b7e]" />
              <span>Google Enterprise</span>
            </button>
          </div>

          <div className="mt-8 text-center space-y-4">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#a21b7e] text-xs font-bold uppercase tracking-widest hover:underline block w-full rounded-lg"
            >
              {isSignUp ? "Voltar ao Login" : "Acessar como Administrador (Demo)"}
            </button>
            
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
