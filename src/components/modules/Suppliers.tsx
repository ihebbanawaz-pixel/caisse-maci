import React, { useState } from 'react';
import { Truck, Plus, Search, Edit3, Archive, Eye, Phone, Mail, MapPin, X, ShoppingBag } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { Supplier } from '../../types';
import { formatTND, formatDate } from '../../utils/formatters';

export const Suppliers: React.FC<{ initialSearch?: string }> = ({ initialSearch = '' }) => {
  const { suppliers, products, purchaseOrders, addSupplier, updateSupplier } = useStock();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(['admin', 'stock_manager', 'buyer']);

  const [search, setSearch] = useState(initialSearch);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    paymentTerms: '30 jours',
    notes: '',
    status: 'active' as 'active' | 'archived'
  });
  const [error, setError] = useState('');

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      taxId: '',
      paymentTerms: '30 jours',
      notes: '',
      status: 'active'
    });
    setEditingSupplier(null);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setFormData({
      code: s.code,
      name: s.name,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      address: s.address,
      taxId: s.taxId || '',
      paymentTerms: s.paymentTerms || '30 jours',
      notes: s.notes || '',
      status: s.status
    });
    setEditingSupplier(s);
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      setError('Le code et la raison sociale sont obligatoires.');
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        contactName: formData.contactName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        taxId: formData.taxId.trim(),
        paymentTerms: formData.paymentTerms,
        notes: formData.notes.trim()
      });
    } else {
      addSupplier({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        contactName: formData.contactName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        taxId: formData.taxId.trim(),
        paymentTerms: formData.paymentTerms,
        notes: formData.notes.trim(),
        status: 'active'
      });
    }
    setIsModalOpen(false);
  };

  // Calcul du montant cumulé des commandes pour un fournisseur
  const getSupplierStats = (supId: string) => {
    const orders = purchaseOrders.filter(po => po.supplierId === supId);
    const totalAmount = orders.reduce((sum, po) => sum + po.totalAmount, 0);
    const prodCount = products.filter(p => p.primarySupplierId === supId).length;
    return { ordersCount: orders.length, totalAmount, prodCount };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Répertoire des Fournisseurs</h2>
          <p className="text-xs text-slate-400">Gestion des partenaires d'approvisionnement, coordonnées et encours</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Nouveau Fournisseur
          </button>
        )}
      </div>

      {/* Recherche */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, code fournisseur, contact..."
          className="w-full text-xs bg-transparent focus:outline-none"
        />
      </div>

      {/* Cartes Fournisseurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map(s => {
          const stats = getSupplierStats(s.id);
          return (
            <div key={s.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {s.code}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Actif
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-2">{s.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Contact : <strong>{s.contactName}</strong></p>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <p className="flex items-center gap-2 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {s.phone}
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {s.email}
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {s.address}
                  </p>
                </div>

                <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs flex justify-between">
                  <span className="text-slate-500">Total commandes :</span>
                  <strong className="text-slate-800">{formatTND(stats.totalAmount)}</strong>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-[11px] text-slate-400">{stats.prodCount} article(s) lié(s)</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingSupplier(s)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded"
                    title="Voir l'historique"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 rounded"
                      title="Modifier"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Fournisseur (Ajout / Édition) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">
                {editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              {error && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg font-semibold">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code Fournisseur *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: FRN-TOTAL"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Identifiant Fiscal / MF</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="Ex: 0012457/A/P/000"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Société Maghrébine de Plastique"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Principal</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Nom du commercial"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@fournisseur.tn"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Conditions de règlement</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    placeholder="30 jours fin de mois"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Zone Industrielle..."
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
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

      {/* Modal Fiche Détails Fournisseur */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <span className="font-mono text-xs bg-blue-500 px-2 py-0.5 rounded font-bold">{viewingSupplier.code}</span>
                <h3 className="text-sm font-bold mt-1">{viewingSupplier.name}</h3>
              </div>
              <button onClick={() => setViewingSupplier(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p><strong>Contact :</strong> {viewingSupplier.contactName}</p>
                <p><strong>Téléphone :</strong> {viewingSupplier.phone}</p>
                <p><strong>E-mail :</strong> {viewingSupplier.email}</p>
                <p><strong>Conditions :</strong> {viewingSupplier.paymentTerms}</p>
                <p className="col-span-2"><strong>Adresse :</strong> {viewingSupplier.address}</p>
              </div>

              {/* Commandes d'achats liées */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                  Historique des commandes d'achat
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">N° Commande</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Montant</th>
                        <th className="py-2.5 px-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseOrders.filter(po => po.supplierId === viewingSupplier.id).map(po => (
                        <tr key={po.id}>
                          <td className="py-2 px-3 font-mono font-bold text-blue-700">{po.orderNumber}</td>
                          <td className="py-2 px-3 text-slate-500">{formatDate(po.createdAt)}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{formatTND(po.totalAmount)}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setViewingSupplier(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
