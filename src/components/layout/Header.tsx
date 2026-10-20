import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  UserCheck, 
  ChevronDown,
  X,
  ExternalLink,
  Receipt
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth, SYSTEM_ROLES } from '../../context/AuthContext';
import { GlobalSearchModal } from '../modules/GlobalSearchModal';
import { UserRole } from '../../types';

interface HeaderProps {
  currentView: string;
  onNavigate: (viewId: string, filterTerm?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const { warehouses, selectedWarehouseId, setSelectedWarehouseId, alerts, markAlertRead } = useStock();
  const { currentUser, switchUser, usersList, updateUserRole } = useAuth();
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const unreadAlerts = alerts.filter(a => !a.read);

  const getPageTitle = (view: string): { title: string; subtitle: string } => {
    switch (view) {
      case 'dashboard': return { title: 'Tableau de bord', subtitle: 'Indicateurs clés et valorisation en temps réel' };
      case 'pos': return { title: 'Caisse & Point de Vente (POS)', subtitle: 'Encaissement comptoir direct, impression tickets 80mm et factures officielles' };
      case 'products': return { title: 'Catalogue des Produits', subtitle: 'Gestion des articles, prix, références SKU et fiches détails' };
      case 'categories': return { title: 'Catégories & Unités', subtitle: 'Classification du catalogue et unités de mesure' };
      case 'warehouses': return { title: 'Stocks & Entrepôts', subtitle: 'Soldes physiques, réservés et disponibles par dépôt' };
      case 'stock_in': return { title: 'Entrées de Stock', subtitle: 'Réceptions fournisseurs, retours et recalcul du CMP' };
      case 'stock_out': return { title: 'Sorties de Stock', subtitle: 'Déstockage vente ou interne avec contrôle anti-négatif' };
      case 'transfers': return { title: 'Transferts Inter-Entrepôts', subtitle: 'Mouvements régulés de marchandises d\'un site à un autre' };
      case 'inventory': return { title: 'Inventaires Physiques', subtitle: 'Sessions de comptage et régularisation des écarts' };
      case 'suppliers': return { title: 'Répertoire Fournisseurs', subtitle: 'Fiches coordonnées et historique des achats' };
      case 'customers': return { title: 'Répertoire Clients', subtitle: 'Fiches commerciales et historique des commandes' };
      case 'purchases': return { title: 'Achats & Commandes Fournisseurs', subtitle: 'Bons de commande et réceptions d\'approvisionnement' };
      case 'sales': return { title: 'Ventes & Commandes Clients', subtitle: 'Réservation de stock et expéditions de commandes' };
      case 'history': return { title: 'Journal des Mouvements', subtitle: 'Traçabilité inaltérable de tous les flux de stock' };
      case 'reports': return { title: 'Rapports & Statistiques', subtitle: '14 analyses complètes, exports Excel et états imprimables' };
      case 'users': return { title: 'Utilisateurs & Permissions', subtitle: 'Gestion des accès selon les 6 rôles métiers' };
      case 'settings': return { title: 'Paramètres du Système', subtitle: 'Données entreprise, devise TND, TVA et injecteur de démo' };
      default: return { title: 'Stock Pro', subtitle: 'Application de gestion de stock' };
    }
  };

  const { title, subtitle } = getPageTitle(currentView);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Page Title & Context */}
        <div className="flex items-center gap-6 min-w-0">
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight leading-tight">{title}</h1>
            <p className="text-[11px] text-slate-400 font-medium truncate hidden sm:block">{subtitle}</p>
          </div>

          {/* Sélecteur d'entrepôt rapide */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200 transition">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Tous les entrepôts ({warehouses.length})</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Raccourci Caisse Rapide */}
          <button
            onClick={() => onNavigate('pos')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
              currentView === 'pos'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}
            title="Ouvrir le terminal de caisse enregistreuse"
          >
            <Receipt className={`w-3.5 h-3.5 ${currentView === 'pos' ? 'text-white' : 'text-emerald-600'}`} />
            <span>Caisse POS</span>
          </button>

          {/* Bouton Recherche Universelle */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg text-xs text-slate-500 font-medium transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Recherche globale...</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-300 rounded shadow-2xs">
              Ctrl K
            </kbd>
          </button>

          {/* Cloche d'Alertes */}
          <div className="relative">
            <button
              onClick={() => setShowAlertMenu(!showAlertMenu)}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"
              title="Centre d'alertes"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white animate-pulse"></span>
              )}
            </button>

            {showAlertMenu && (
              <div className="absolute right-0 mt-2 w-84 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in">
                <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase text-slate-700">Alertes de Stock</span>
                    <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded-full">
                      {unreadAlerts.length}
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowAlertMenu(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      Aucune alerte de stock. Tous les niveaux sont conformes.
                    </div>
                  ) : (
                    alerts.slice(0, 10).map((al) => (
                      <div 
                        key={al.id} 
                        className={`p-3 rounded-lg flex items-start gap-3 text-xs transition ${al.read ? 'opacity-60 bg-white' : 'bg-rose-50/30'}`}
                      >
                        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${al.severity === 'danger' ? 'text-rose-600' : 'text-amber-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 leading-tight">{al.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{al.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {al.productId && (
                              <button
                                onClick={() => {
                                  markAlertRead(al.id);
                                  setShowAlertMenu(false);
                                  onNavigate('products');
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Voir le produit <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            {!al.read && (
                              <button
                                onClick={() => markAlertRead(al.id)}
                                className="text-[10px] font-medium text-slate-500 hover:text-slate-800 ml-auto"
                              >
                                Marquer comme lu
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          {/* Switcher rapide de profil utilisateur & Rôle RBAC */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {currentUser?.displayName?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-bold text-slate-800 leading-none">
                  {currentUser?.displayName?.split(' ')[0]}
                </span>
                <span className="text-[10px] font-semibold text-blue-600 uppercase">
                  {currentUser?.role?.replace('_', ' ')}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in">
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Changer d'utilisateur / Tester un rôle RBAC
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
                  {usersList.map((user) => {
                    const isCurrent = currentUser?.id === user.id;
                    return (
                      <div
                        key={user.id}
                        onClick={() => {
                          switchUser(user.id);
                          setShowRoleMenu(false);
                        }}
                        className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition text-xs ${
                          isCurrent ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-bold">{user.displayName}</p>
                          <span className="text-[10px] text-slate-500 uppercase">{user.role.replace('_', ' ')}</span>
                        </div>
                        {isCurrent && <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal de recherche globale */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
};
