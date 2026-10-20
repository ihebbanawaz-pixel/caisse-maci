import React, { useState } from 'react';
import { Warehouse as WarehouseIcon, Plus, Edit3, MapPin, Phone, User, Package, Search } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { Warehouse } from '../../types';
import { formatTND } from '../../utils/formatters';

export const Warehouses: React.FC = () => {
  const { warehouses, products, balances, addWarehouse, updateWarehouse } = useStock();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(['admin']);

  const [activeWarehouseId, setActiveWarehouseId] = useState<string>(warehouses[0]?.id || '');
  const [productSearch, setProductSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: 'Tunis',
    manager: '',
    phone: '',
    isActive: true
  });
  const [error, setError] = useState('');

  const activeWarehouse = warehouses.find(w => w.id === activeWarehouseId) || warehouses[0];

  // Soldes pour l'entrepôt sélectionné
  const warehouseBalances = balances.filter(b => b.warehouseId === activeWarehouse?.id);

  // Valorisation de cet entrepôt
  const warehouseValuation = warehouseBalances.reduce((sum, b) => {
    const p = products.find(prod => prod.id === b.productId);
    return sum + (b.physicalQuantity * (p?.purchasePrice || 0));
  }, 0);

  const totalPhysicalUnits = warehouseBalances.reduce((sum, b) => sum + b.physicalQuantity, 0);

  const filteredBalances = warehouseBalances.filter(b => {
    const p = products.find(prod => prod.id === b.productId);
    if (!p) return false;
    if (productSearch) {
      const q = productSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      address: '',
      city: 'Tunis',
      manager: '',
      phone: '',
      isActive: true
    });
    setEditingWh(null);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (w: Warehouse) => {
    setFormData({
      code: w.code,
      name: w.name,
      address: w.address,
      city: w.city,
      manager: w.manager,
      phone: w.phone || '',
      isActive: w.isActive
    });
    setEditingWh(w);
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      setError('Le code et le nom du dépôt sont requis.');
      return;
    }

    if (editingWh) {
      updateWarehouse(editingWh.id, {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        manager: formData.manager.trim(),
        phone: formData.phone.trim(),
        isActive: formData.isActive
      });
    } else {
      addWarehouse({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        manager: formData.manager.trim(),
        phone: formData.phone.trim(),
        isActive: formData.isActive
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Gestion des Entrepôts & Dépôts</h2>
          <p className="text-xs text-slate-400">Cartographie des sites de stockage et soldes physiques par emplacement</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Ajouter un Entrepôt
          </button>
        )}
      </div>

      {/* Cartes des Entrepôts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map(w => {
          const isSelected = activeWarehouse?.id === w.id;
          const wBal = balances.filter(b => b.warehouseId === w.id);
          const wUnits = wBal.reduce((s, b) => s + b.physicalQuantity, 0);

          return (
            <div
              key={w.id}
              onClick={() => setActiveWarehouseId(w.id)}
              className={`bg-white p-4 rounded-xl border cursor-pointer transition relative ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {w.code}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  w.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {w.isActive ? 'Opérationnel' : 'Inactif'}
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 mt-2">{w.name}</h3>
              
              <div className="space-y-1 text-xs text-slate-500 mt-2">
                <p className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {w.address}, {w.city}
                </p>
                <p className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Resp: {w.manager}
                </p>
                {w.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {w.phone}
                  </p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">Stock physique :</span>
                <span className="font-bold text-slate-900">{wUnits.toLocaleString('fr-TN')} unités</span>
              </div>

              {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenEdit(w); }}
                  className="absolute top-4 right-14 text-slate-400 hover:text-blue-600 p-1"
                  title="Modifier l'entrepôt"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Détails du stock dans le dépôt sélectionné */}
      {activeWarehouse && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  État des stocks : {activeWarehouse.name} ({activeWarehouse.code})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Valorisation : <strong className="text-slate-900 font-bold">{formatTND(warehouseValuation)}</strong> • Total physique : <strong className="text-slate-900 font-bold">{totalPhysicalUnits.toLocaleString('fr-TN')} unités</strong>
              </p>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Filtrer un article..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Réf. SKU</th>
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3 text-center">Stock Physique</th>
                  <th className="py-2.5 px-3 text-center">Réservé Client</th>
                  <th className="py-2.5 px-3 text-center">Disponible Réel</th>
                  <th className="py-2.5 px-3 text-right">Valeur Stock</th>
                  <th className="py-2.5 px-3">Emplacement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Aucun article stocké dans ce dépôt.
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map(b => {
                    const p = products.find(prod => prod.id === b.productId);
                    if (!p) return null;
                    const val = b.physicalQuantity * p.purchasePrice;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{p.sku}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{p.name}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">{b.physicalQuantity} {p.unit}</td>
                        <td className="py-2 px-3 text-center font-bold text-amber-600">{b.reservedQuantity}</td>
                        <td className="py-2 px-3 text-center font-black text-emerald-600">{b.availableQuantity} {p.unit}</td>
                        <td className="py-2 px-3 text-right font-medium text-slate-800">{formatTND(val)}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{b.location || 'Dépôt principal'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Entrepôt */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">
                {editingWh ? 'Modifier le dépôt' : 'Ajouter un nouveau site de stockage'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              {error && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg font-semibold">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code Dépôt *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: DEP-SOUSSE"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ville *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ex: Sousse, Bizerte..."
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom du Dépôt / Entrepôt *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Dépôt Central Sahel"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse physique</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Zone Industrielle..."
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Responsable du Site</label>
                  <input
                    type="text"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    placeholder="Nom du magasinier chef"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+216 71..."
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-2xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
