import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Eye, 
  Edit3, 
  Archive, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Warehouse,
  History
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { Product, UnitOfMeasure } from '../../types';
import { formatTND, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';

export const Products: React.FC<{ initialSearch?: string }> = ({ initialSearch = '' }) => {
  const { 
    products, 
    categories, 
    suppliers, 
    warehouses, 
    balances, 
    movements,
    addProduct, 
    updateProduct, 
    archiveProduct, 
    unarchiveProduct 
  } = useStock();

  const { hasPermission } = useAuth();
  const canEdit = hasPermission(['admin', 'stock_manager']);

  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED' | 'LOW' | 'RUPTURE'>('ACTIVE');
  const [sortField, setSortField] = useState<'sku' | 'name' | 'available' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modales
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    categoryId: categories[0]?.id || '',
    brand: '',
    unit: 'pièce' as UnitOfMeasure,
    purchasePrice: 0,
    sellingPrice: 0,
    minThreshold: 10,
    maxThreshold: 100,
    primarySupplierId: ''
  });

  // Calcul du stock par produit
  const getProductStock = (productId: string) => {
    const pBalances = balances.filter(b => b.productId === productId);
    const physical = pBalances.reduce((s, b) => s + b.physicalQuantity, 0);
    const reserved = pBalances.reduce((s, b) => s + b.reservedQuantity, 0);
    const available = physical - reserved;
    return { physical, reserved, available };
  };

  // Filtrage et Tri
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Recherche
      if (search) {
        const q = search.toLowerCase();
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
        if (!matchSku && !matchName && !matchBarcode) return false;
      }

      // Catégorie
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;

      // Fournisseur
      if (selectedSupplier !== 'ALL' && p.primarySupplierId !== selectedSupplier) return false;

      // Statut
      const { available } = getProductStock(p.id);
      if (selectedStatus === 'ACTIVE' && p.isArchived) return false;
      if (selectedStatus === 'ARCHIVED' && !p.isArchived) return false;
      if (selectedStatus === 'LOW' && (available <= 0 || available > p.minThreshold || p.isArchived)) return false;
      if (selectedStatus === 'RUPTURE' && (available > 0 || p.isArchived)) return false;

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'sku') comparison = a.sku.localeCompare(b.sku);
      if (sortField === 'name') comparison = a.name.localeCompare(b.name);
      if (sortField === 'price') comparison = a.sellingPrice - b.sellingPrice;
      if (sortField === 'available') {
        const stockA = getProductStock(a.id).available;
        const stockB = getProductStock(b.id).available;
        comparison = stockA - stockB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [products, search, selectedCategory, selectedSupplier, selectedStatus, sortField, sortOrder, balances]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetForm = () => {
    setFormData({
      sku: '',
      barcode: '',
      name: '',
      description: '',
      categoryId: categories[0]?.id || '',
      brand: '',
      unit: 'pièce',
      purchasePrice: 0,
      sellingPrice: 0,
      minThreshold: 10,
      maxThreshold: 100,
      primarySupplierId: ''
    });
    setFormError('');
  };

  const openAddModal = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEditModal = (p: Product) => {
    setFormData({
      sku: p.sku,
      barcode: p.barcode || '',
      name: p.name,
      description: p.description || '',
      categoryId: p.categoryId,
      brand: p.brand || '',
      unit: p.unit,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      minThreshold: p.minThreshold,
      maxThreshold: p.maxThreshold || 100,
      primarySupplierId: p.primarySupplierId || ''
    });
    setEditingProduct(p);
    setFormError('');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.sku.trim() || !formData.name.trim()) {
      setFormError('La référence SKU et la désignation sont obligatoires.');
      return;
    }

    if (formData.sellingPrice < formData.purchasePrice) {
      if (!confirm('Attention : Le prix de vente est inférieur au coût d\'achat (CMP). Confirmer malgré tout ?')) {
        return;
      }
    }

    if (editingProduct) {
      const res = updateProduct(editingProduct.id, {
        sku: formData.sku.trim().toUpperCase(),
        barcode: formData.barcode.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        brand: formData.brand.trim(),
        unit: formData.unit,
        sellingPrice: Number(formData.sellingPrice),
        minThreshold: Number(formData.minThreshold),
        maxThreshold: Number(formData.maxThreshold),
        primarySupplierId: formData.primarySupplierId || undefined
      });
      if (!res.success) {
        setFormError(res.error || 'Erreur lors de la modification.');
        return;
      }
      setEditingProduct(null);
    } else {
      const res = addProduct({
        sku: formData.sku.trim().toUpperCase(),
        barcode: formData.barcode.trim(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        brand: formData.brand.trim(),
        unit: formData.unit,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        minThreshold: Number(formData.minThreshold),
        maxThreshold: Number(formData.maxThreshold),
        primarySupplierId: formData.primarySupplierId || undefined,
        isArchived: false
      });
      if (!res.success) {
        setFormError(res.error || 'Erreur lors de l\'ajout du produit.');
        return;
      }
      setIsAddOpen(false);
    }
  };

  const handleArchive = (p: Product) => {
    if (confirm(`Confirmez-vous l'archivage de l'article ${p.sku} — ${p.name} ?`)) {
      const res = archiveProduct(p.id);
      if (!res.success) {
        alert(res.error);
      }
    }
  };

  const handleUnarchive = (p: Product) => {
    unarchiveProduct(p.id);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'SKU', 'Nom', 'Code-barres', 'Catégorie', 'Marque', 'Unité', 
      'Coût Achat CMP (TND)', 'Prix Vente (TND)', 'Stock Physique', 
      'Stock Réservé', 'Stock Disponible', 'Seuil Min', 'Statut'
    ];
    const rows = filteredProducts.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)?.name || '-';
      const { physical, reserved, available } = getProductStock(p.id);
      return [
        p.sku,
        p.name,
        p.barcode || '',
        cat,
        p.brand || '',
        p.unit,
        p.purchasePrice,
        p.sellingPrice,
        physical,
        reserved,
        available,
        p.minThreshold,
        p.isArchived ? 'Archivé' : available <= 0 ? 'Rupture' : available <= p.minThreshold ? 'Faible' : 'Actif'
      ];
    });
    exportToCSV('export_produits_stock_pro', headers, rows);
  };

  // Simulation Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
        if (lines.length <= 1) {
          alert("Le fichier est vide ou ne comporte pas de données valides.");
          return;
        }
        let imported = 0;
        // Supposons colonnes : SKU;Nom;PrixAchat;PrixVente;SeuilMin
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/[;,]/);
          if (cols.length >= 2 && cols[0].trim()) {
            const sku = cols[0].trim().toUpperCase();
            const name = cols[1].trim();
            const purchasePrice = parseFloat(cols[2]) || 0;
            const sellingPrice = parseFloat(cols[3]) || purchasePrice * 1.3;
            const minThreshold = parseInt(cols[4]) || 10;
            const res = addProduct({
              sku,
              name,
              categoryId: categories[0]?.id || 'CAT-GEN',
              unit: 'pièce',
              purchasePrice,
              sellingPrice,
              minThreshold,
              isArchived: false
            });
            if (res.success) imported++;
          }
        }
        alert(`${imported} produit(s) importé(s) avec succès !`);
      } catch (err) {
        alert("Erreur lors de la lecture du fichier CSV.");
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Gestion des Références Produits</h2>
          <p className="text-xs text-slate-400">
            {filteredProducts.length} produit(s) affiché(s) • Contrôle d'unicité SKU et valorisation CMP
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import CSV */}
          <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Importer CSV</span>
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Exporter
          </button>

          {/* Ajouter Produit */}
          {canEdit && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Nouveau Produit
            </button>
          )}
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-2xs">
        {/* Recherche */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Rechercher par référence SKU, nom, code-barres..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filtre Catégorie */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-slate-700 font-medium"
          >
            <option value="ALL">Toutes les catégories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Filtre Statut */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value as any); setCurrentPage(1); }}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-slate-700 font-medium"
          >
            <option value="ACTIVE">Produits actifs</option>
            <option value="LOW">Stock faible (sous seuil)</option>
            <option value="RUPTURE">Rupture totale</option>
            <option value="ARCHIVED">Produits archivés</option>
            <option value="ALL">Tous les statuts</option>
          </select>
        </div>

        {/* Tri */}
        <div>
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortField(field as any);
              setSortOrder(order as any);
            }}
            className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-slate-700 font-medium"
          >
            <option value="name-asc">Trier par Nom (A-Z)</option>
            <option value="name-desc">Trier par Nom (Z-A)</option>
            <option value="sku-asc">Trier par SKU (A-Z)</option>
            <option value="available-asc">Disponibilité croissante</option>
            <option value="available-desc">Disponibilité décroissante</option>
            <option value="price-desc">Prix de vente décroissant</option>
          </select>
        </div>
      </div>

      {/* Tableau des Produits */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Réf. SKU</th>
                <th className="py-3 px-4">Article & Marque</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4 text-right">Coût CMP</th>
                <th className="py-3 px-4 text-right">Prix Vente</th>
                <th className="py-3 px-4 text-center">Stock Phys.</th>
                <th className="py-3 px-4 text-center">Disponible</th>
                <th className="py-3 px-4 text-center">État Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    Aucun produit ne correspond à vos critères de recherche.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const cat = categories.find(c => c.id === p.categoryId);
                  const { physical, reserved, available } = getProductStock(p.id);
                  const isOutOfStock = available <= 0;
                  const isLowStock = available > 0 && available <= p.minThreshold;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition group">
                      {/* SKU */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 text-blue-700 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200">
                          {p.sku}
                        </span>
                      </td>

                      {/* Nom & Marque */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block group-hover:text-blue-600 transition">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.brand ? `${p.brand} • ` : ''}Unité: {p.unit}
                          {p.barcode ? ` • ${p.barcode}` : ''}
                        </span>
                      </td>

                      {/* Catégorie */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-slate-700 text-xs font-medium">
                          {cat?.name || '-'}
                        </span>
                      </td>

                      {/* Coût CMP */}
                      <td className="py-3 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                        {formatTND(p.purchasePrice)}
                      </td>

                      {/* Prix Vente */}
                      <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatTND(p.sellingPrice)}
                      </td>

                      {/* Stock Physique */}
                      <td className="py-3 px-4 text-center font-bold text-slate-800 whitespace-nowrap">
                        {physical} {p.unit}
                      </td>

                      {/* Stock Disponible */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`font-black ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {available} {p.unit}
                        </span>
                        {reserved > 0 && (
                          <span className="text-[9px] text-slate-400 block">({reserved} rés.)</span>
                        )}
                      </td>

                      {/* État Stock Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {p.isArchived ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            Archivé
                          </span>
                        ) : isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Rupture
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Faible (≤{p.minThreshold})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Optimal
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                        {/* Fiche Détails */}
                        <button
                          onClick={() => setDetailProduct(p)}
                          title="Fiche détaillée"
                          className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 hover:text-blue-600 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Modifier */}
                        {canEdit && !p.isArchived && (
                          <button
                            onClick={() => openEditModal(p)}
                            title="Modifier"
                            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 hover:text-amber-600 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Archiver / Réactiver */}
                        {canEdit && (
                          p.isArchived ? (
                            <button
                              onClick={() => handleUnarchive(p)}
                              title="Réactiver le produit"
                              className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 hover:text-emerald-600 transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(p)}
                              title="Archiver le produit"
                              className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 hover:text-rose-600 transition"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>
            Affichage de {paginatedProducts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} à {Math.min(currentPage * pageSize, filteredProducts.length)} sur {filteredProducts.length} articles
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700">Page {currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CRÉATION / ÉDITION DE PRODUIT */}
      {(isAddOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">
                {editingProduct ? `Modifier le produit : ${editingProduct.sku}` : 'Créer un nouveau produit dans le catalogue'}
              </h3>
              <button 
                onClick={() => { setIsAddOpen(false); setEditingProduct(null); }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Référence SKU Unique *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="Ex: CAB-U1000-3X2"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono uppercase focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code-barres (EAN / UPC)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Ex: 6191234560011"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom du Produit / Désignation *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Câble Armé U1000 R2V 3x2.5mm²"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-medium"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marque / Fabricant</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ex: Schneider, Legrand..."
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unité de mesure *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitOfMeasure })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white font-medium"
                  >
                    <option value="pièce">pièce</option>
                    <option value="carton">carton</option>
                    <option value="kg">kg (kilogramme)</option>
                    <option value="litre">litre</option>
                    <option value="mètre">mètre</option>
                    <option value="paquet">paquet</option>
                    <option value="boîte">boîte</option>
                    <option value="rouleau">rouleau</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prix / Coût d'achat initial (TND) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    disabled={!!editingProduct} // Le CMP est géré par les réceptions
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold disabled:bg-slate-200"
                  />
                  {editingProduct && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Recalculé automatiquement selon le CMP des réceptions.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prix de vente unitaire (TND) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Seuil minimal d'alerte *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.minThreshold}
                    onChange={(e) => setFormData({ ...formData, minThreshold: parseInt(e.target.value) || 1 })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Déclenche les alertes de stock faible.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Seuil maximal recommandé</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxThreshold}
                    onChange={(e) => setFormData({ ...formData, maxThreshold: parseInt(e.target.value) || 100 })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fournisseur principal associé</label>
                <select
                  value={formData.primarySupplierId}
                  onChange={(e) => setFormData({ ...formData, primarySupplierId: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                >
                  <option value="">-- Aucun fournisseur prédéfini --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description technique</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Caractéristiques, normes de sécurité, spécifications..."
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingProduct(null); }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition"
                >
                  {editingProduct ? 'Enregistrer les modifications' : 'Créer le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FICHE DÉTAILLÉE PRODUIT */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-blue-500 text-white font-bold px-2 py-0.5 rounded">
                    {detailProduct.sku}
                  </span>
                  <h3 className="text-sm font-bold">{detailProduct.name}</h3>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Catégorie : {categories.find(c => c.id === detailProduct.categoryId)?.name} • Unité : {detailProduct.unit}
                </span>
              </div>
              <button onClick={() => setDetailProduct(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Tarification & Niveaux */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Coût Moyen CMP</span>
                  <p className="text-base font-black text-slate-800 mt-1">{formatTND(detailProduct.purchasePrice)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Prix de Vente</span>
                  <p className="text-base font-black text-blue-600 mt-1">{formatTND(detailProduct.sellingPrice)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Seuil Minimal</span>
                  <p className="text-base font-black text-amber-600 mt-1">{detailProduct.minThreshold} {detailProduct.unit}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Stock Disponible Global</span>
                  <p className="text-base font-black text-emerald-600 mt-1">
                    {getProductStock(detailProduct.id).available} {detailProduct.unit}
                  </p>
                </div>
              </div>

              {/* Stock par Entrepôt */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                  Répartition du stock par entrepôt
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Dépôt</th>
                        <th className="py-2.5 px-3 text-center">Stock Physique</th>
                        <th className="py-2.5 px-3 text-center">Réservé</th>
                        <th className="py-2.5 px-3 text-center">Disponible</th>
                        <th className="py-2.5 px-3">Emplacement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {warehouses.map(w => {
                        const bal = balances.find(b => b.productId === detailProduct.id && b.warehouseId === w.id);
                        const phys = bal ? bal.physicalQuantity : 0;
                        const res = bal ? bal.reservedQuantity : 0;
                        const avail = phys - res;
                        return (
                          <tr key={w.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-800">{w.name} ({w.code})</td>
                            <td className="py-2 px-3 text-center font-bold">{phys} {detailProduct.unit}</td>
                            <td className="py-2 px-3 text-center text-amber-600 font-bold">{res}</td>
                            <td className="py-2 px-3 text-center text-emerald-600 font-black">{avail} {detailProduct.unit}</td>
                            <td className="py-2 px-3 text-slate-500">{bal?.location || 'Non assigné'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historique des derniers mouvements pour cet article */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-emerald-600" />
                  Derniers flux pour cet article
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Mouvement</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Quantité</th>
                        <th className="py-2 px-3">Document Réf</th>
                        <th className="py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movements
                        .filter(m => m.items.some(i => i.productId === detailProduct.id))
                        .slice(0, 5)
                        .map(m => {
                          const item = m.items.find(i => i.productId === detailProduct.id)!;
                          const isEntry = m.type.startsWith('ENTRY');
                          return (
                            <tr key={m.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-slate-800">{m.movementNumber}</td>
                              <td className="py-2 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isEntry ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {isEntry ? 'ENTRÉE' : 'SORTIE'}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-bold">
                                {isEntry ? '+' : '-'}{item.quantity} {item.unit}
                              </td>
                              <td className="py-2 px-3 text-slate-500">{m.documentRef || '-'}</td>
                              <td className="py-2 px-3 text-slate-500">{formatDate(m.date)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setDetailProduct(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
