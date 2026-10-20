import React, { useState } from 'react';
import { ShoppingCart, Plus, Search, Eye, CheckCircle2, ArrowUpRight, X, Printer, AlertCircle, FileText } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { SalesOrder, OrderItem } from '../../types';
import { formatTND, formatDate } from '../../utils/formatters';
import { printDocument, printOfficialInvoice } from '../../utils/exportUtils';

export const Sales: React.FC<{ initialSearch?: string }> = ({ initialSearch = '' }) => {
  const { 
    salesOrders, 
    customers, 
    warehouses, 
    products, 
    balances,
    settings,
    createSalesOrder, 
    confirmSalesOrder, 
    deliverSalesOrder, 
    cancelSalesOrder 
  } = useStock();

  const { currentUser, hasPermission } = useAuth();
  const canSell = hasPermission(['admin', 'stock_manager', 'sales']);

  const [search, setSearch] = useState(initialSearch);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Formulaire Création Commande Vente
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([
    { productId: products[0]?.id || '', quantity: 5, unitPrice: products[0]?.sellingPrice || 0 }
  ]);

  const filteredOrders = salesOrders.filter(so =>
    so.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    so.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddItem = () => {
    if (products.length === 0) return;
    setItems([...items, { productId: products[0].id, quantity: 1, unitPrice: products[0].sellingPrice }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = val;
    if (field === 'productId') {
      const p = products.find(prod => prod.id === val);
      if (p) updated[idx].unitPrice = p.sellingPrice;
    }
    setItems(updated);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cust = customers.find(c => c.id === customerId);
    const wh = warehouses.find(w => w.id === warehouseId);

    if (!cust || !wh) {
      setErrorMessage("Client ou entrepôt invalide.");
      return;
    }

    const orderItems: OrderItem[] = items.map(it => {
      const p = products.find(prod => prod.id === it.productId)!;
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        quantityOrdered: Number(it.quantity),
        quantityProcessed: 0,
        unitPrice: Number(it.unitPrice),
        total: Number(it.quantity) * Number(it.unitPrice)
      };
    });

    const totalAmount = orderItems.reduce((sum, it) => sum + it.total, 0);

    createSalesOrder({
      customerId,
      customerName: cust.name,
      warehouseId,
      warehouseName: wh.name,
      deliveryDate: deliveryDate || new Date().toISOString().slice(0, 10),
      items: orderItems,
      status: 'draft',
      totalAmount,
      notes
    });

    setIsCreateOpen(false);
    alert("Commande client créée à l'état de brouillon. Cliquez sur 'Confirmer' pour réserver les stocks.");
  };

  const handleConfirm = (orderId: string) => {
    const res = confirmSalesOrder(orderId);
    if (res.success) {
      alert("Commande confirmée ! Les quantités requises ont été réservées en stock.");
    } else {
      alert(res.error || "Impossible de réserver le stock pour cette commande.");
    }
  };

  const handleDeliver = (orderId: string) => {
    if (!confirm("Valider l'expédition et la sortie de stock définitive pour cette commande client ?")) return;

    const res = deliverSalesOrder(
      orderId,
      currentUser?.id || 'ANON',
      currentUser?.displayName || 'Commercial'
    );

    if (res.success) {
      alert("Livraison enregistrée avec succès ! Le déstockage physique a été comptabilisé.");
    } else {
      alert(res.error || "Échec lors de la livraison.");
    }
  };

  const handleCancel = (orderId: string) => {
    if (confirm("Confirmez-vous l'annulation de la commande ? Les réservations actives seront immédiatement libérées.")) {
      cancelSalesOrder(orderId);
    }
  };

  const handlePrintDeliverySlip = (so: SalesOrder) => {
    const lines = so.items.map(it => `
      <tr>
        <td>${it.sku}</td>
        <td>${it.productName}</td>
        <td style="text-align: center; font-weight: bold;">${it.quantityOrdered}</td>
        <td style="text-align: right;">${formatTND(it.unitPrice)}</td>
        <td style="text-align: right; font-weight: bold;">${formatTND(it.total)}</td>
      </tr>
    `).join('');

    const content = `
      <div style="margin-bottom: 20px;">
        <p><strong>Bon de Livraison / Commande N° :</strong> ${so.orderNumber}</p>
        <p><strong>Client Destinataire :</strong> ${so.customerName}</p>
        <p><strong>Entrepôt d'Expédition :</strong> ${so.warehouseName}</p>
        <p><strong>Date prévue :</strong> ${formatDate(so.deliveryDate)}</p>
        <p><strong>Statut :</strong> ${so.status.toUpperCase()}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Réf. SKU</th>
            <th>Article</th>
            <th style="text-align: center;">Quantité Commandée</th>
            <th style="text-align: right;">Prix Unitaire</th>
            <th style="text-align: right;">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${lines}
        </tbody>
      </table>
      <div style="text-align: right; margin-top: 20px; font-size: 14px; font-weight: bold;">
        Total Commande : ${formatTND(so.totalAmount)}
      </div>
      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div>Visa Magasinier Expéditeur :<br/><br/>______________________</div>
        <div>Accusé de Réception Client :<br/><br/>______________________</div>
      </div>
    `;
    printDocument(`Bon de Livraison ${so.orderNumber}`, content);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Ventes & Commandes Clients</h2>
          <p className="text-xs text-slate-400">Prise de commandes, réservations de stock et sorties de livraison traçables</p>
        </div>

        {canSell && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Nouvelle Commande Client
          </button>
        )}
      </div>

      {/* Barre de Recherche */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par N° commande, client..."
          className="w-full text-xs bg-transparent focus:outline-none"
        />
      </div>

      {/* Liste des Commandes Clients */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">N° Commande</th>
                <th className="py-2.5 px-4">Client</th>
                <th className="py-2.5 px-4">Entrepôt</th>
                <th className="py-2.5 px-4">Date Livraison</th>
                <th className="py-2.5 px-4 text-right">Total (TND)</th>
                <th className="py-2.5 px-4 text-center">Statut</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    Aucune commande client enregistrée.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(so => (
                  <tr key={so.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{so.orderNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{so.customerName}</td>
                    <td className="py-3 px-4 text-slate-600">{so.warehouseName}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(so.deliveryDate)}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">{formatTND(so.totalAmount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        so.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        so.status === 'confirmed' ? 'bg-amber-100 text-amber-800' :
                        so.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {so.status === 'delivered' ? 'Livrée' :
                         so.status === 'confirmed' ? 'Confirmée (Réservée)' :
                         so.status === 'cancelled' ? 'Annulée' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      {so.status === 'draft' && canSell && (
                        <button
                          onClick={() => handleConfirm(so.id)}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold shadow-2xs"
                        >
                          Confirmer & Réserver
                        </button>
                      )}

                      {so.status === 'confirmed' && canSell && (
                        <button
                          onClick={() => handleDeliver(so.id)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-2xs inline-flex items-center gap-1"
                        >
                          <ArrowUpRight className="w-3 h-3" /> Expédier / Livrer
                        </button>
                      )}

                      {(so.status === 'draft' || so.status === 'confirmed') && canSell && (
                        <button
                          onClick={() => handleCancel(so.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded text-xs font-semibold"
                        >
                          Annuler
                        </button>
                      )}

                      <button
                        onClick={() => handlePrintDeliverySlip(so)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                        title="Imprimer Bon de Livraison (BL)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => printOfficialInvoice(so, settings)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
                        title="Imprimer Facture Officielle A4"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Création Commande Vente */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Saisir une nouvelle commande client</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 overflow-y-auto space-y-4">
              {errorMessage && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg font-semibold">{errorMessage}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client *</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Entrepôt Expéditeur *</label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date Livraison Prévue *</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Lignes d'articles */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>Articles commandés</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  >
                    + Ligne
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <select
                        value={it.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="flex-1 text-xs p-1 bg-white border border-slate-300 rounded"
                      >
                        {products.filter(p => !p.isArchived).map(p => (
                          <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20 text-xs p-1 bg-white border border-slate-300 rounded text-right font-bold"
                        placeholder="Qté"
                      />
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-28 text-xs p-1 bg-white border border-slate-300 rounded text-right font-bold text-blue-700"
                        placeholder="Prix de vente"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-2xs"
                >
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
