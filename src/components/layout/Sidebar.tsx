import React from 'react';
import { 
  LayoutDashboard, 
  Receipt,
  Package, 
  Tags, 
  Warehouse, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Repeat, 
  ClipboardCheck, 
  Truck, 
  Users, 
  ShoppingBag, 
  ShoppingCart, 
  History, 
  BarChart3, 
  ShieldCheck, 
  Settings,
  LogOut,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStock } from '../../context/StockContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { currentUser, logout, hasPermission } = useAuth();
  const { alerts, purchaseOrders, salesOrders, settings } = useStock();

  const pendingPO = purchaseOrders.filter(p => p.status === 'confirmed').length;
  const pendingSO = salesOrders.filter(s => s.status === 'confirmed').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'danger' && !a.read).length;

  const menuSections = [
    {
      title: 'Principal & Comptoir',
      items: [
        { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin', 'stock_manager', 'warehouseman', 'buyer', 'sales', 'viewer'], badge: null },
        { id: 'pos', label: 'Caisse & Point de Vente', icon: Receipt, roles: ['admin', 'stock_manager', 'sales', 'warehouseman'], badge: 'POS', badgeColor: 'bg-emerald-500 text-white' },
      ]
    },
    {
      title: 'Catalogue & Dépôts',
      items: [
        { id: 'products', label: 'Produits & Articles', icon: Package, roles: ['admin', 'stock_manager', 'warehouseman', 'buyer', 'sales', 'viewer'], badge: criticalAlerts > 0 ? `${criticalAlerts}` : null, badgeColor: 'bg-rose-500' },
        { id: 'categories', label: 'Catégories & Unités', icon: Tags, roles: ['admin', 'stock_manager'], badge: null },
        { id: 'warehouses', label: 'Stocks & Entrepôts', icon: Warehouse, roles: ['admin', 'stock_manager', 'warehouseman'], badge: null },
      ]
    },
    {
      title: 'Mouvements & Flux',
      items: [
        { id: 'stock_in', label: 'Entrées de stock', icon: ArrowDownLeft, roles: ['admin', 'stock_manager', 'warehouseman'], badge: null },
        { id: 'stock_out', label: 'Sorties de stock', icon: ArrowUpRight, roles: ['admin', 'stock_manager', 'warehouseman', 'sales'], badge: null },
        { id: 'transfers', label: 'Transferts inter-dépôts', icon: Repeat, roles: ['admin', 'stock_manager', 'warehouseman'], badge: null },
        { id: 'inventory', label: 'Inventaires physiques', icon: ClipboardCheck, roles: ['admin', 'stock_manager'], badge: null },
      ]
    },
    {
      title: 'Partenaires & Commandes',
      items: [
        { id: 'suppliers', label: 'Fournisseurs', icon: Truck, roles: ['admin', 'stock_manager', 'buyer'], badge: null },
        { id: 'customers', label: 'Clients', icon: Users, roles: ['admin', 'stock_manager', 'sales'], badge: null },
        { id: 'purchases', label: 'Achats & Commandes', icon: ShoppingBag, roles: ['admin', 'stock_manager', 'buyer'], badge: pendingPO > 0 ? `${pendingPO}` : null, badgeColor: 'bg-amber-500' },
        { id: 'sales', label: 'Ventes & Commandes', icon: ShoppingCart, roles: ['admin', 'stock_manager', 'sales'], badge: pendingSO > 0 ? `${pendingSO}` : null, badgeColor: 'bg-blue-500' },
      ]
    },
    {
      title: 'Analyses & Administration',
      items: [
        { id: 'history', label: 'Journal des mouvements', icon: History, roles: ['admin', 'stock_manager', 'warehouseman', 'viewer'], badge: null },
        { id: 'reports', label: 'Rapports & Statistiques', icon: BarChart3, roles: ['admin', 'stock_manager'], badge: '14' },
        { id: 'users', label: 'Utilisateurs & Rôles', icon: ShieldCheck, roles: ['admin'], badge: null },
        { id: 'settings', label: 'Paramètres système', icon: Settings, roles: ['admin'], badge: null },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 gap-3 border-b border-slate-800/80 bg-slate-950/80">
        {settings.companyLogo ? (
          <div className="h-10 max-w-[130px] flex items-center justify-start bg-slate-900/60 p-1 rounded-lg border border-slate-800/60">
            <img src={settings.companyLogo} alt="Logo" className="max-h-8 max-w-full object-contain" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20 shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-white text-base tracking-wider truncate">STOCK PRO</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-1.5 py-0.2 rounded border border-blue-500/30">TN</span>
          </div>
          <span className="block text-[10px] text-slate-400 font-medium truncate">
            {settings.companyName || "Gestion d'Entreprise"}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {menuSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => hasPermission(item.roles as any));
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {section.title}
              </span>
              {visibleItems.map(item => {
                const isActive = currentView === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${(item as any).badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-xs font-bold text-white truncate">{currentUser?.displayName || 'Invité'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                {currentUser?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Se déconnecter"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
