'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  User, 
  Mail, 
  Shield, 
  Sparkles, 
  Calendar, 
  Lock, 
  Settings, 
  Database,
  Award,
  CheckCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import PredictionsPage from '../predictions/page';

export default function ProfilePage() {
  const { user, profile, isMock, toggleMockRole } = useAuth();
  
  if (!profile) return null;

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
        </div>

        {/* Development Evaluator Helper Card */}
        <div className="sya-glass p-6 border-t-8 border-sya-blue flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold font-serif border-b border-gray-200 dark:border-gray-800 pb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sya-blue" />
              Mock Evaluador
            </h2>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Esta sección te permite alternar tu rol entre <strong>Empleado (User)</strong> y <strong>Administrador (Admin)</strong> en tiempo real para evaluar las distintas vistas del sistema de forma simple.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-400">Mock Mode:</span>
              <span className={isMock ? 'text-green-500' : 'text-sya-orange'}>
                {isMock ? 'Habilitado (Offline)' : 'Deshabilitado (Real)'}
              </span>
            </div>
            
            {isMock ? (
              <button
                onClick={toggleMockRole}
                className="w-full py-3.5 sya-button-primary text-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Cambiar a {profile.role === 'USER' ? 'Admin' : 'Empleado'}</span>
              </button>
            ) : (
              <div className="text-[10px] text-gray-400 font-medium leading-relaxed bg-sya-orange/5 p-3 rounded-xl border border-sya-orange/20 flex gap-2">
                <Database className="w-4 h-4 text-sya-orange shrink-0 mt-0.5" />
                <span>Estás conectado a Supabase en tiempo real. Para habilitar mock toggle, vacía la URL de Supabase en `.env.local`.</span>
              </div>
            )}
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
