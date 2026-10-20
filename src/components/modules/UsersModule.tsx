import React, { useState } from 'react';
import { ShieldCheck, Plus, UserCheck, Shield, Lock, Eye, KeyRound, Check, X } from 'lucide-react';
import { useAuth, SYSTEM_ROLES } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { formatDate } from '../../utils/formatters';

export const UsersModule: React.FC = () => {
  const { currentUser, usersList, updateUserRole, addUser, switchUser, hasPermission } = useAuth();
  const isAdmin = hasPermission(['admin']);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('warehouseman');

  const permissionsMatrix = [
    { feature: 'Consulter le Tableau de bord et les Stocks', admin: true, manager: true, wh: true, buyer: true, sales: true, viewer: true },
    { feature: 'Créer / Modifier un Produit ou une Catégorie', admin: true, manager: true, wh: false, buyer: false, sales: false, viewer: false },
    { feature: 'Enregistrer une Entrée de Stock (Réception)', admin: true, manager: true, wh: true, buyer: false, sales: false, viewer: false },
    { feature: 'Enregistrer une Sortie de Stock (Déstockage)', admin: true, manager: true, wh: true, buyer: false, sales: true, viewer: false },
    { feature: 'Effectuer un Transfert Inter-Entrepôts', admin: true, manager: true, wh: true, buyer: false, sales: false, viewer: false },
    { feature: 'Créer et Valider les Inventaires Physiques', admin: true, manager: true, wh: false, buyer: false, sales: false, viewer: false },
    { feature: 'Gérer les Fournisseurs & Commandes d\'Achats', admin: true, manager: true, wh: false, buyer: true, sales: false, viewer: false },
    { feature: 'Gérer les Clients & Commandes de Ventes', admin: true, manager: true, wh: false, buyer: false, sales: true, viewer: false },
    { feature: 'Consulter les 14 Rapports et Exporter', admin: true, manager: true, wh: false, buyer: false, sales: false, viewer: false },
    { feature: 'Gérer les Utilisateurs, Rôles et Paramètres', admin: true, manager: false, wh: false, buyer: false, sales: false, viewer: false },
  ];

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    addUser({
      email: newEmail.trim(),
      displayName: newName.trim(),
      role: newRole,
      active: true
    });

    setIsAddOpen(false);
    setNewEmail('');
    setNewName('');
    alert("Utilisateur créé avec succès !");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Contrôle d'Accès & Rôles (RBAC)</h2>
          <p className="text-xs text-slate-400">Gestion des privilèges utilisateurs et matrice des permissions métiers</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Nouvel Utilisateur
          </button>
        )}
      </div>

      {/* Liste des Utilisateurs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Comptes utilisateurs enregistrés</h3>
          <span className="text-xs text-slate-400">Cliquez sur un profil pour l'endosser et tester ses droits</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Utilisateur</th>
                <th className="py-2.5 px-4">Adresse E-mail</th>
                <th className="py-2.5 px-4">Rôle Métier</th>
                <th className="py-2.5 px-4">Statut</th>
                <th className="py-2.5 px-4">Date de Création</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                return (
                  <tr key={u.id} className={isCurrent ? 'bg-blue-50/60 font-semibold' : 'hover:bg-slate-50'}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                          {u.displayName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{u.displayName}</span>
                          {isCurrent && (
                            <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                              <UserCheck className="w-3 h-3" /> Connecté actuellement
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      {isAdmin ? (
                        <select
                          value={u.role}
                          onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                          className="text-xs p-1 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                        >
                          {SYSTEM_ROLES.map(r => (
                            <option key={r.role} value={r.role}>{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 uppercase">
                          {u.role.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Actif
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => switchUser(u.id)}
                        className={`px-3 py-1 rounded text-xs font-bold transition ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isCurrent ? 'Actif' : 'Endosser ce rôle'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matrice des Rôles & Permissions */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Matrice Officielle des Permissions</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sécurisation à double niveau : contrôle de navigation dans l'interface et validation côté Firestore / API
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase font-bold text-[10px] border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Fonctionnalité / Module</th>
                <th className="py-2.5 px-2 text-center">Admin</th>
                <th className="py-2.5 px-2 text-center">Resp. Stock</th>
                <th className="py-2.5 px-2 text-center">Magasinier</th>
                <th className="py-2.5 px-2 text-center">Acheteur</th>
                <th className="py-2.5 px-2 text-center">Commercial</th>
                <th className="py-2.5 px-2 text-center">Lecteur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-800">{row.feature}</td>
                  <td className="py-2 px-2 text-center">{row.admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2 px-2 text-center">{row.manager ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2 px-2 text-center">{row.wh ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2 px-2 text-center">{row.buyer ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2 px-2 text-center">{row.sales ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="py-2 px-2 text-center">{row.viewer ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Création Utilisateur */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Ajouter un utilisateur</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Anis Mejri"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse E-mail *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="anis.mejri@maghreb-distribution.tn"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rôle Attribué *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  {SYSTEM_ROLES.map(r => (
                    <option key={r.role} value={r.role}>{r.label} — {r.description}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-2xs"
                >
                  Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
