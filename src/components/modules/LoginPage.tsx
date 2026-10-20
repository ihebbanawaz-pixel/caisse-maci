import React, { useState } from 'react';
import { Layers, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth, PRESET_USERS, SYSTEM_ROLES } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    login(email.trim(), selectedRole);
  };

  const handleSelectPreset = (presetEmail: string, role: UserRole) => {
    login(presetEmail, role);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in">
        {/* En-tête de marque */}
        <div className="bg-slate-950 p-6 text-center text-white border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-wider">STOCK PRO</h1>
          <p className="text-xs text-blue-400 font-medium mt-0.5">Système Professionnel de Gestion de Stock</p>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Identifiant E-mail d'Entreprise</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom.prenom@entreprise.tn"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rôle Métier d'Accès</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
              >
                {SYSTEM_ROLES.map(r => (
                  <option key={r.role} value={r.role}>{r.label} — {r.description}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
            >
              <span>Se Connecter à Stock Pro</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Profils Démo Préconfigurés */}
          <div className="border-t border-slate-100 pt-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
              Accès Rapide par Rôle (Démonstration)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_USERS.slice(0, 4).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectPreset(user.email, user.role)}
                  className="p-2 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl transition text-xs group"
                >
                  <p className="font-bold text-slate-800 truncate text-[11px] group-hover:text-blue-700">
                    {user.displayName.split(' ')[0]} {user.displayName.split(' ')[1]}
                  </p>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mt-0.5">
                    {user.role.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400">
          Sécurité renforcée • Localisation Tunisie (TND) • Firebase Cloud Firestore
        </div>
      </div>
    </div>
  );
};
