import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  FileText, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Coins, 
  Building2, 
  User, 
  Barcode, 
  Package, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { Product, POSSaleItem, POSSaleTicket } from '../../types';
import { formatTND, formatDate, formatDateTime } from '../../utils/formatters';
import { printPOSTicket, printOfficialInvoice } from '../../utils/exportUtils';

export const POSCashRegister: React.FC = () => {
  const { 
    products, 
    categories, 
    warehouses, 
    customers, 
    balances, 
    settings, 
    posTickets, 
    executePOSSale 
  } = useStock();

  const { currentUser, hasPermission } = useAuth();
  const canOperatePOS = hasPermission(['admin', 'stock_manager', 'sales', 'warehouseman']);

  const [activeTab, setActiveTab] = useState<'register' | 'history'>('register');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Panier en cours
  const [cart, setCart] = useState<POSSaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'carte' | 'cheque' | 'virement'>('especes');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Ticket validé récemment pour impression
  const [completedTicket, setCompletedTicket] = useState<POSSaleTicket | null>(null);

  // Recherche dans l'historique
  const [historySearch, setHistorySearch] = useState('');

  // Vérifier le stock disponible dans le dépôt sélectionné
  const getProductAvailable = (productId: string) => {
    const bal = balances.find(b => b.productId === productId && b.warehouseId === selectedWarehouseId);
    return bal ? bal.availableQuantity : 0;
  };

  // Filtrage des produits pour la caisse
  const availableProducts = useMemo(() => {
    return products.filter(p => {
      if (p.isArchived) return false;
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
      if (searchProduct) {
        const q = searchProduct.toLowerCase();
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
        if (!matchSku && !matchName && !matchBarcode) return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchProduct]);

  // Ajouter au panier
  const handleAddToCart = (product: Product) => {
    setErrorMessage('');
    const available = getProductAvailable(product.id);
    const existingIndex = cart.findIndex(i => i.productId === product.id);
    const currentQtyInCart = existingIndex >= 0 ? cart[existingIndex].quantity : 0;

    if (currentQtyInCart + 1 > available) {
      setErrorMessage(`Stock insuffisant pour ${product.sku} (${available} dispo. dans ce dépôt).`);
      return;
    }

    if (existingIndex >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + 1;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        total: newQty * updated[existingIndex].unitPrice
      };
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice: product.sellingPrice,
          total: product.sellingPrice,
          unit: product.unit
        }
      ]);
    }
  };

  // Modifier la quantité
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setErrorMessage('');
    const existingIndex = cart.findIndex(i => i.productId === productId);
    if (existingIndex === -1) return;

    const available = getProductAvailable(productId);
    const updated = [...cart];
    const newQty = updated[existingIndex].quantity + delta;

    if (newQty <= 0) {
      setCart(cart.filter(i => i.productId !== productId));
      return;
    }

    if (newQty > available) {
      setErrorMessage(`Quantité maximale disponible atteinte pour cet article (${available} ${updated[existingIndex].unit}).`);
      return;
    }

    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: newQty,
      total: newQty * updated[existingIndex].unitPrice
    };
    setCart(updated);
  };

  // Supprimer une ligne
  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(i => i.productId !== productId));
  };

  // Vider le panier
  const handleClearCart = () => {
    setCart([]);
    setAmountReceived(0);
    setErrorMessage('');
  };

  // Calculs financiers du panier
  const subtotalHT = cart.reduce((sum, item) => sum + item.total, 0);
  const vatRate = settings.defaultVatRate || 19;
  const vatAmount = subtotalHT * (vatRate / 100);
  const fiscalStamp = subtotalHT > 0 ? (settings.fiscalStamp || 1.000) : 0;
  const totalTTC = subtotalHT + vatAmount + fiscalStamp;
  const changeReturned = Math.max(0, amountReceived - totalTTC);

  // Valider la vente en caisse
  const handleValidateSale = () => {
    setErrorMessage('');

    if (cart.length === 0) {
      setErrorMessage("Le panier est vide. Veuillez sélectionner des articles.");
      return;
    }

    if (paymentMethod === 'especes' && amountReceived < totalTTC) {
      setErrorMessage(`Montant reçu insuffisant (${formatTND(amountReceived)} reçu pour un total de ${formatTND(totalTTC)}).`);
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    const customerName = customer ? customer.name : 'Client Comptoir (Passager)';
    const customerTaxId = customer?.taxId;
    const customerAddress = customer?.address;

    const res = executePOSSale({
      warehouseId: selectedWarehouseId,
      customerId: selectedCustomerId || undefined,
      customerName,
      customerTaxId,
      customerAddress,
      items: cart,
      paymentMethod,
      amountReceived: paymentMethod === 'especes' ? amountReceived : totalTTC,
      vatRate,
      fiscalStamp,
      cashierId: currentUser?.id || 'CAISSE-1',
      cashierName: currentUser?.displayName || 'Caissier'
    });

    if (res.success && res.ticket) {
      setCompletedTicket(res.ticket);
      handleClearCart();
    } else {
      setErrorMessage(res.error || "Échec de validation de la vente.");
    }
  };

  // Raccourcis espèces
  const handleQuickAmount = (extra: number) => {
    setAmountReceived(prev => (prev === 0 ? totalTTC : prev) + extra);
  };

  // Historique filtré
  const filteredHistory = posTickets.filter(t =>
    t.ticketNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
    t.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
    (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(historySearch.toLowerCase()))
  );

  const totalSalesToday = posTickets
    .filter(t => new Date(t.date).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + t.totalTTC, 0);

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation de Caisse */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
              Point de Vente Connecté
            </span>
            <span className="text-xs text-slate-400">• Déstockage immédiat</span>
          </div>
          <h2 className="text-base font-black text-slate-800 mt-1">Caisse Enregistreuse & Facturation Rapide</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('register')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'register' 
                ? 'bg-blue-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" /> Terminal Caisse
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history' 
                ? 'bg-blue-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Historique ({posTickets.length})
          </button>
        </div>
      </div>

      {activeTab === 'register' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Panneau Gauche : Catalogue et Sélection Produits (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Contrôles Dépôt et Recherche */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-blue-600" /> Dépôt de Déstockage Caisse *
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:bg-white"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-600" /> Client Vente
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white"
                  >
                    <option value="">Client Comptoir (Passager)</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recherche et filtres catégories */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    placeholder="Scanner code-barres ou chercher article, SKU..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Pills Catégories */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                    selectedCategory === 'ALL' 
                      ? 'bg-blue-600 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tout voir
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                      selectedCategory === c.id 
                        ? 'bg-blue-600 text-white shadow-2xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grille des Articles Caisse */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto p-1 custom-scrollbar">
              {availableProducts.map(p => {
                const avail = getProductAvailable(p.id);
                const isOutOfStock = avail <= 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && handleAddToCart(p)}
                    className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {p.sku}
                        </span>
                        <span className={`text-[10px] font-bold ${isOutOfStock ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {avail} {p.unit}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 mt-2 line-clamp-2 leading-tight">
                        {p.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                      <span className="font-black text-xs text-slate-900">{formatTND(p.sellingPrice)}</span>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className="w-6 h-6 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panneau Droit : Panier Caisse & Encaissement (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
            {/* Entête Panier */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Ticket en Cours ({cart.length} articles)</h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-[10px] text-rose-300 hover:text-white flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3 h-3" /> Vider
                </button>
              )}
            </div>

            {errorMessage && (
              <div className="m-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            {/* Liste des Lignes du Panier */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[340px] custom-scrollbar">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                  <p className="text-xs font-bold text-slate-600">Panier de caisse vide</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Cliquez sur un article à gauche pour l'ajouter.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.productId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-bold text-slate-900 block truncate">{item.productName}</span>
                      <span className="text-[10px] text-slate-500">
                        {item.sku} • {formatTND(item.unitPrice)}/{item.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(item.productId, -1)}
                        className="w-6 h-6 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-black text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.productId, 1)}
                        className="w-6 h-6 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      <span className="w-20 text-right font-black text-slate-900 ml-1">
                        {formatTND(item.total)}
                      </span>

                      <button
                        onClick={() => handleRemoveFromCart(item.productId)}
                        className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Récapitulatif Financier et Paiement */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              {/* Totaux */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Total Hors Taxes (HT) :</span>
                  <span className="font-semibold text-slate-700">{formatTND(subtotalHT)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>TVA applicable ({vatRate}%) :</span>
                  <span className="font-semibold text-slate-700">{formatTND(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Droit de Timbre Fiscal :</span>
                  <span className="font-semibold text-slate-700">{formatTND(fiscalStamp)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-1.5">
                  <span>NET À PAYER (TTC) :</span>
                  <span className="text-blue-700 font-black">{formatTND(totalTTC)}</span>
                </div>
              </div>

              {/* Mode de règlement */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mode de Règlement</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'especes', label: 'Espèces' },
                    { id: 'carte', label: 'Carte TPE' },
                    { id: 'cheque', label: 'Chèque' },
                    { id: 'virement', label: 'Virement' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                        paymentMethod === m.id 
                          ? 'bg-slate-900 text-white shadow-2xs' 
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Montant Reçu & Rendu Monnaie (pour espèces) */}
              {paymentMethod === 'especes' && (
                <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">Espèces Reçues :</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                      className="w-28 text-right p-1 text-xs border border-slate-300 rounded font-black text-slate-900"
                    />
                  </div>

                  {/* Boutons rapides */}
                  <div className="flex gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setAmountReceived(totalTTC)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700"
                    >
                      Compte Exact
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(10)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700"
                    >
                      +10 TND
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(20)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700"
                    >
                      +20 TND
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(50)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700"
                    >
                      +50 TND
                    </button>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-xs">
                    <span className="font-semibold text-slate-600">Rendu Monnaie :</span>
                    <span className={`font-black text-sm ${changeReturned > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {formatTND(changeReturned)}
                    </span>
                  </div>
                </div>
              )}

              {/* Bouton Validation Vente */}
              <button
                type="button"
                disabled={cart.length === 0 || !canOperatePOS}
                onClick={handleValidateSale}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Valider l'Encaissement & Sortie Stock
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Onglet Historique des Ventes Caisse */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Journal des Tickets et Factures Caisse</h3>
              <p className="text-xs text-slate-400">
                Total des ventes du jour : <strong className="text-emerald-700 font-bold">{formatTND(totalSalesToday)}</strong>
              </p>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="N° Ticket, Facture, Client..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">N° Ticket</th>
                  <th className="py-2.5 px-4">N° Facture</th>
                  <th className="py-2.5 px-4">Date & Heure</th>
                  <th className="py-2.5 px-4">Client</th>
                  <th className="py-2.5 px-4">Dépôt</th>
                  <th className="py-2.5 px-4 text-center">Règlement</th>
                  <th className="py-2.5 px-4 text-right">Total TTC</th>
                  <th className="py-2.5 px-4 text-right">Impressions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      Aucune vente en caisse enregistrée.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{ticket.ticketNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{ticket.invoiceNumber || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(ticket.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{ticket.customerName}</td>
                      <td className="py-3 px-4 text-slate-600">{ticket.warehouseName}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 uppercase">
                          {ticket.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatTND(ticket.totalTTC)}</td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => printPOSTicket(ticket, settings)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3 text-blue-600" /> Ticket
                        </button>
                        <button
                          onClick={() => printOfficialInvoice(ticket, settings)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-emerald-600" /> Facture
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ticket Vente Validée & Impression Immédiate */}
      {completedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-800">Vente Validée avec Succès !</h3>
              <p className="text-xs text-slate-500 mt-1">
                Le stock a été déstocké et le ticket <strong className="text-slate-900 font-bold">{completedTicket.ticketNumber}</strong> est prêt.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Montant Total TTC :</span>
                <span className="font-bold text-slate-900">{formatTND(completedTicket.totalTTC)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode de paiement :</span>
                <span className="font-bold uppercase text-slate-900">{completedTicket.paymentMethod}</span>
              </div>
              {completedTicket.paymentMethod === 'especes' && (
                <div className="flex justify-between border-t border-slate-200/60 pt-1">
                  <span className="text-slate-500">Monnaie rendue :</span>
                  <span className="font-black text-emerald-600">{formatTND(completedTicket.changeReturned)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => printPOSTicket(completedTicket, settings)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <Receipt className="w-4 h-4" /> Imprimer Ticket de Caisse (80mm)
              </button>

              <button
                onClick={() => printOfficialInvoice(completedTicket, settings)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <FileText className="w-4 h-4" /> Imprimer Facture Commerciale A4
              </button>

              <button
                onClick={() => setCompletedTicket(null)}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold"
              >
                Passer à la vente suivante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
