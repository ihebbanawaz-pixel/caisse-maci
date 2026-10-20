import React, { useState, useMemo } from 'react';
import { Search, X, Package, Truck, Users, ShoppingBag, ShoppingCart, History, ArrowRight } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { formatTND, formatDate } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (viewId: string, filterTerm?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const { products, suppliers, customers, purchaseOrders, salesOrders, movements } = useStock();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const matchedProducts = products.filter(p => 
      p.sku.toLowerCase().includes(q) || 
      p.name.toLowerCase().includes(q) || 
      (p.barcode && p.barcode.toLowerCase().includes(q))
    ).slice(0, 4);

    const matchedSuppliers = suppliers.filter(s =>
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.contactName.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedCustomers = customers.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedPO = purchaseOrders.filter(po =>
      po.orderNumber.toLowerCase().includes(q) ||
      po.supplierName.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedSO = salesOrders.filter(so =>
      so.orderNumber.toLowerCase().includes(q) ||
      so.customerName.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedMovements = movements.filter(m =>
      m.movementNumber.toLowerCase().includes(q) ||
      (m.documentRef && m.documentRef.toLowerCase().includes(q)) ||
      m.items.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    ).slice(0, 4);

    const totalCount = 
      matchedProducts.length + 
      matchedSuppliers.length + 
      matchedCustomers.length + 
      matchedPO.length + 
      matchedSO.length + 
      matchedMovements.length;

    return {
      products: matchedProducts,
      suppliers: matchedSuppliers,
      customers: matchedCustomers,
      purchaseOrders: matchedPO,
      salesOrders: matchedSO,
      movements: matchedMovements,
      totalCount
    };
  }, [query, products, suppliers, customers, purchaseOrders, salesOrders, movements]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par référence, SKU, code-barres, fournisseur, BL, client..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-2 py-1 rounded bg-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-300"
          >
            Échap
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {!query.trim() && (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-600">Recherche Universelle Stock Pro</p>
              <p className="text-xs text-slate-400 mt-1">Saisissez un mot-clé pour explorer l'ensemble de votre base de données.</p>
            </div>
          )}

          {results && results.totalCount === 0 && (
            <div className="py-10 text-center text-slate-500">
              <p className="text-sm font-semibold">Aucun résultat trouvé pour "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Vérifiez l'orthographe ou tentez une recherche plus large.</p>
            </div>
          )}

          {/* Produits */}
          {results && results.products.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>Produits ({results.products.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.products.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onNavigate('products', p.sku);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-between cursor-pointer transition group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                          {p.sku}
                        </span>
                        <span className="font-semibold text-xs text-slate-800">{p.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Prix vente : {formatTND(p.sellingPrice)} | Coût CMP : {formatTND(p.purchasePrice)}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mouvements */}
          {results && results.movements.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mouvements de stock ({results.movements.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.movements.map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      onNavigate('history', m.movementNumber);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 flex items-center justify-between cursor-pointer transition group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                          {m.movementNumber}
                        </span>
                        <span className="text-xs text-slate-700 font-medium">
                          {m.type.startsWith('ENTRY') ? 'Entrée' : m.type.startsWith('EXIT') ? 'Sortie' : 'Transfert'}
                          {m.documentRef ? ` (${m.documentRef})` : ''}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {formatDate(m.date)} • Valeur: {formatTND(m.totalValue)}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fournisseurs & Clients */}
          {results && (results.suppliers.length > 0 || results.customers.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.suppliers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Fournisseurs</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.suppliers.map(s => (
                      <div
                        key={s.id}
                        onClick={() => {
                          onNavigate('suppliers', s.name);
                          onClose();
                        }}
                        className="p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 cursor-pointer text-xs"
                      >
                        <p className="font-bold text-slate-800">{s.name}</p>
                        <p className="text-[10px] text-slate-500">{s.contactName} • {s.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.customers.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Clients</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.customers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onNavigate('customers', c.name);
                          onClose();
                        }}
                        className="p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer text-xs"
                      >
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.contactName} • {c.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Commandes Achats & Ventes */}
          {results && (results.purchaseOrders.length > 0 || results.salesOrders.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.purchaseOrders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Commandes Achats</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.purchaseOrders.map(po => (
                      <div
                        key={po.id}
                        onClick={() => {
                          onNavigate('purchases', po.orderNumber);
                          onClose();
                        }}
                        className="p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 cursor-pointer text-xs"
                      >
                        <p className="font-bold text-slate-800">{po.orderNumber}</p>
                        <p className="text-[10px] text-slate-500">{po.supplierName} • {formatTND(po.totalAmount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.salesOrders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                    <span>Commandes Ventes</span>
                  </div>
                  <div className="space-y-1.5">
                    {results.salesOrders.map(so => (
                      <div
                        key={so.id}
                        onClick={() => {
                          onNavigate('sales', so.orderNumber);
                          onClose();
                        }}
                        className="p-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer text-xs"
                      >
                        <p className="font-bold text-slate-800">{so.orderNumber}</p>
                        <p className="text-[10px] text-slate-500">{so.customerName} • {formatTND(so.totalAmount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-right">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
