'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, signUp, isMock } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password || (isSignUp && !name)) {
      setError('Por favor, completa todos los campos.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const res = await signUp(name, email, password);
        if (!res.success) {
          setError(res.error || 'Hubo un error al registrarse.');
        } else {
          router.push('/');
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Credenciales inválidas.');
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillMockUser = () => {
    setEmail('lucas@solucionesya.com.ar');
    setPassword('lucas123');
    setName('Lucas');
  };

  const handleFillMockAdmin = () => {
    setEmail('lucas.admin@solucionesya.com.ar');
    setPassword('admin123');
    setName('Lucas Admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-[#0B0F19] px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 sya-glass p-8 sm:p-10 relative overflow-hidden animate-slide-up sya-card-accent">
        
        {/* Decorative corner element */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-sya-orange/10 rounded-bl-full flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-sya-orange animate-pulse" />
        </div>

        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-sya-orange flex items-center justify-center text-white font-extrabold text-2xl shadow-lg mb-4">
            SY
          </div>
          <h2 className="text-3xl font-extrabold font-serif bg-gradient-to-r from-sya-orange to-sya-orange-hover bg-clip-text text-transparent">
            PRODE YA 2026
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
            Mundial de Pronósticos de Soluciones YA
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-2xl flex items-center gap-2.5 text-sm font-semibold animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-2xl space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Nombre Completo</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sya-orange/50 focus:border-sya-orange font-medium text-sm transition-all"
                    placeholder="Ej. Lucas González"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Correo Electrónico</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sya-orange/50 focus:border-sya-orange font-medium text-sm transition-all"
                  placeholder="nombre@solucionesya.com.ar"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sya-orange/50 focus:border-sya-orange font-medium text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 sya-button-primary text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isSignUp ? (
                'Registrarse'
              ) : (
                'Ingresar'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-sya-blue hover:underline font-bold transition-all"
          >
            {isSignUp ? '¿Ya tenés una cuenta? Iniciar Sesión' : '¿No tenés cuenta? Registrate'}
          </button>
        </div>

        {/* Mock helpers container for quick evaluations */}
        {isMock && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center space-y-3">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Evaluación (Mock Mode Activo)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleFillMockUser}
                className="py-2 px-3 text-xs bg-sya-orange/10 hover:bg-sya-orange/20 text-sya-orange font-semibold rounded-xl transition-colors"
              >
                Completar como Empleado
              </button>
              <button
                onClick={handleFillMockAdmin}
                className="py-2 px-3 text-xs bg-sya-blue/10 hover:bg-sya-blue/20 text-sya-blue font-semibold rounded-xl transition-colors"
              >
                Completar como Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
