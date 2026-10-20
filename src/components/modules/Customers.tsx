import React, { useState } from 'react';
import { Users, Plus, Search, Edit3, Eye, Phone, Mail, MapPin, ShoppingCart } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { Customer } from '../../types';
import { formatTND, formatDate } from '../../utils/formatters';

export const Customers: React.FC<{ initialSearch?: string }> = ({ initialSearch = '' }) => {
  const { customers, salesOrders, addCustomer, updateCustomer } = useStock();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(['admin', 'stock_manager', 'sales']);

  const [search, setSearch] = useState(initialSearch);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    notes: '',
    status: 'active' as 'active' | 'archived'
  });
  const [error, setError] = useState('');

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.contactName.toLowerCase().includes(search.toLowerCase())
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
      notes: '',
      status: 'active'
    });
    setEditingCustomer(null);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setFormData({
      code: c.code,
      name: c.name,
      contactName: c.contactName,
      phone: c.phone,
      email: c.email,
      address: c.address,
      taxId: c.taxId || '',
      notes: c.notes || '',
      status: c.status
    });
    setEditingCustomer(c);
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      setError('Le code client et le nom sont requis.');
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        contactName: formData.contactName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        taxId: formData.taxId.trim(),
        notes: formData.notes.trim()
      });
    } else {
      addCustomer({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        contactName: formData.contactName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        taxId: formData.taxId.trim(),
        notes: formData.notes.trim(),
        status: 'active'
      });
    }
    setIsModalOpen(false);
  };

  const getCustomerStats = (customerId: string) => {
    const orders = salesOrders.filter(so => so.customerId === customerId);
    const totalAmount = orders.reduce((sum, so) => sum + so.totalAmount, 0);
    return { count: orders.length, totalAmount };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Répertoire des Clients</h2>
          <p className="text-xs text-slate-400">Gestion des comptes clients, adresses de livraison et historique commercial</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Nouveau Client
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par raison sociale, code, contact..."
          className="w-full text-xs bg-transparent focus:outline-none"
        />
      </div>

      {/* Cartes Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(c => {
          const stats = getCustomerStats(c.id);
          return (
            <div key={c.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-400 transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {c.code}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Actif
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-2">{c.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Contact : <strong>{c.contactName}</strong></p>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <p className="flex items-center gap-2 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.phone}
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.email}
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.address}
                  </p>
                </div>

                <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs flex justify-between">
                  <span className="text-slate-500">Chiffre d'affaires :</span>
                  <strong className="text-slate-900">{formatTND(stats.totalAmount)}</strong>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-[11px] text-slate-400">{stats.count} commande(s)</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingCustomer(c)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 rounded"
                    title="Voir les commandes"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(c)}
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

      {/* Modal Client (Ajout / Modification) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">
                {editingCustomer ? 'Modifier la fiche client' : 'Nouveau client'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              {error && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg font-semibold">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code Client *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: CLI-STEG"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Identifiant Fiscal / MF</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="Ex: 0000018/P/P/000"
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
                  placeholder="Ex: Entreprise Travaux Publics"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Commercial</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="Nom du responsable achats"
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@client.com.tn"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse de livraison</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ville, code postal, rue..."
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

      {/* Modal Fiche Client */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <span className="font-mono text-xs bg-indigo-500 px-2 py-0.5 rounded font-bold">{viewingCustomer.code}</span>
                <h3 className="text-sm font-bold mt-1">{viewingCustomer.name}</h3>
              </div>
              <button onClick={() => setViewingCustomer(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p><strong>Contact :</strong> {viewingCustomer.contactName}</p>
                <p><strong>Téléphone :</strong> {viewingCustomer.phone}</p>
                <p><strong>E-mail :</strong> {viewingCustomer.email}</p>
                <p><strong>Matricule Fiscal :</strong> {viewingCustomer.taxId || 'Non renseigné'}</p>
                <p className="col-span-2"><strong>Adresse :</strong> {viewingCustomer.address}</p>
              </div>

              {/* Commandes clients liées */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
                  Commandes de vente enregistrées
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">N° Commande</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Montant Total</th>
                        <th className="py-2.5 px-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesOrders.filter(so => so.customerId === viewingCustomer.id).map(so => (
                        <tr key={so.id}>
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">{so.orderNumber}</td>
                          <td className="py-2 px-3 text-slate-500">{formatDate(so.createdAt)}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{formatTND(so.totalAmount)}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800">
                              {so.status}
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
                onClick={() => setViewingCustomer(null)}
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
