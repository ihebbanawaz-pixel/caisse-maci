import React, { useState } from 'react';
import { Tags, Plus, Search, Edit3, Trash2, Layers, Check, Info } from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { Category, UnitOfMeasure } from '../../types';

export const Categories: React.FC = () => {
  const { categories, products, addCategory, updateCategory } = useStock();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(['admin', 'stock_manager']);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', description: '' });
  const [error, setError] = useState('');

  // Unités configurables
  const [standardUnits] = useState<string[]>([
    'pièce', 'carton', 'kg', 'litre', 'mètre', 'paquet', 'boîte', 'rouleau', 'palette', 'm²'
  ]);

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const getProductCountForCat = (catId: string) => {
    return products.filter(p => p.categoryId === catId && !p.isArchived).length;
  };

  const handleOpenAdd = () => {
    setFormData({ code: '', name: '', description: '' });
    setEditingCategory(null);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    setFormData({ code: c.code, name: c.name, description: c.description || '' });
    setEditingCategory(c);
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      setError('Le code et le nom de la catégorie sont requis.');
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description.trim()
      });
    } else {
      addCategory({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        productCount: 0
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-800">Catégories & Unités de Mesure</h2>
          <p className="text-xs text-slate-400">Classification hiérarchique du catalogue et standardisation des unités</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Nouvelle Catégorie
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des catégories */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ml-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une catégorie..."
              className="w-full text-xs bg-transparent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCategories.map(c => {
              const count = getProductCountForCat(c.id);
              return (
                <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 transition flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {c.code}
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {count} article{count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 mt-2">{c.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {c.description || 'Aucune description spécifique.'}
                    </p>
                  </div>

                  {canEdit && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Modifier
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panneau latéral des Unités de Mesure */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Unités de stock configurées</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Pour garantir l'intégrité comptable et éviter les conversions implicites erronées, chaque produit est assigné à une unité stricte.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {standardUnits.map((unit) => (
              <span key={unit} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> {unit}
              </span>
            ))}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Les unités sont vérifiées sur les mouvements d'entrée et de sortie afin d'empêcher les discordances de magasinage.
            </span>
          </div>
        </div>
      </div>

      {/* Modal Catégorie */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-lg font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Code Catégorie *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: ELEC, INDUS, EMBAL..."
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom de la Catégorie *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Matériel Électrique"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Articles regroupés dans cette catégorie..."
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg"
                ></textarea>
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
