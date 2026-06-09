'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  LogOut,
  Key,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import PredictionsPage from '../predictions/page';

export default function ProfilePage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');
  
  if (!profile) return null;

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus('loading');
    setPasswordError('');
    try {
      const res = await fetch('/api/users/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordStatus('success');
        setCurrentPassword('');
        setNewPassword('');
        setTimeout(() => setPasswordStatus('idle'), 3000);
      } else {
        setPasswordStatus('error');
        setPasswordError(data.error || 'Error al cambiar contraseña');
      }
    } catch (err) {
      setPasswordStatus('error');
      setPasswordError('Error de red');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-wide border-l-6 border-sya-orange pl-3">
          Mi Perfil
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Administrá tus datos y visualizá tu desempeño en el PRODE.
        </p>
      </div>

      {/* Profile Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="sya-glass p-6 md:col-span-2 space-y-6">
          <h2 className="text-lg font-extrabold font-serif border-b border-gray-200 dark:border-gray-800 pb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-sya-orange" />
            Datos Personales
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase block">Nombre de Usuario</span>
              <div className="flex items-center gap-2 py-2 px-3 bg-gray-500/5 rounded-xl border border-gray-200 dark:border-gray-800 font-semibold text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span>{profile.name}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase block">Correo Institucional</span>
              <div className="flex items-center gap-2 py-2 px-3 bg-gray-500/5 rounded-xl border border-gray-200 dark:border-gray-800 font-semibold text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{profile.email}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase block">Rol de Sistema</span>
              <div className="flex items-center gap-2 py-2 px-3 bg-gray-500/5 rounded-xl border border-gray-200 dark:border-gray-800 font-semibold text-sm">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className={`capitalize ${profile.role === 'ADMIN' ? 'text-sya-orange font-extrabold' : ''}`}>
                  {profile.role === 'ADMIN' ? 'Administrador' : 'Empleado (Usuario)'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-400 uppercase block">Miembro desde</span>
              <div className="flex items-center gap-2 py-2 px-3 bg-gray-500/5 rounded-xl border border-gray-200 dark:border-gray-800 font-semibold text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{new Date(profile.createdAt).toLocaleDateString('es-AR')}</span>
              </div>
            </div>

          </div>

          {/* Change Password Form */}
          <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-6">
            <h3 className="text-md font-extrabold font-serif mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-sya-orange" />
              Cambiar Contraseña
            </h3>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Contraseña Actual</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full py-2 px-3 bg-gray-500/5 rounded-xl border border-gray-200 dark:border-gray-800 font-semibold text-sm focus:ring-2 focus:ring-sya-orange focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full py-2 px-3 bg-gray-500/5 rounded-xl border border-gray-200 dark:border-gray-800 font-semibold text-sm focus:ring-2 focus:ring-sya-orange focus:outline-none"
                  required
                  minLength={6}
                />
              </div>
              
              {passwordStatus === 'error' && (
                <div className="text-red-500 text-xs font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {passwordError}
                </div>
              )}

              {passwordStatus === 'success' && (
                <div className="text-green-500 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Contraseña actualizada con éxito
                </div>
              )}

              <button 
                type="submit"
                disabled={passwordStatus === 'loading'}
                className="py-2 px-4 bg-gray-800 dark:bg-white text-white dark:text-black font-bold text-xs rounded-xl hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {passwordStatus === 'loading' ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>

        {/* Action Card */}
        <div className="sya-glass p-6 border-t-8 border-red-500 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold font-serif border-b border-gray-200 dark:border-gray-800 pb-3 flex items-center gap-2 text-red-500">
              <LogOut className="w-5 h-5" />
              Sesión
            </h2>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Cerrar tu sesión terminará tu acceso actual. Necesitarás iniciar sesión nuevamente para hacer pronósticos o ver la tabla.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleLogout}
              className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

      </div>

      {/* Embedded Mis Pronósticos Ledger List */}
      <section className="mt-12">
        <PredictionsPage />
      </section>

    </div>
  );
}
