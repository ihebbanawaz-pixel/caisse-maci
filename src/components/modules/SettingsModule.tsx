import React, { useState, useRef } from 'react';
import { 
  Building, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  Server,
  Image as ImageIcon,
  Upload,
  Link,
  Eye,
  Check,
  FileText
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { isFirebaseLive } from '../../firebase/config';

// 4 Modèles de logos professionnels prédéfinis pour entreprises tunisiennes
const PRESET_LOGOS = [
  {
    id: 'preset-1',
    name: 'Bleu Tech & Industrie (Stock Pro)',
    data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="48" viewBox="0 0 180 48"><rect width="48" height="48" rx="10" fill="%232563eb"/><path d="M14 16h20M14 24h16M14 32h12" stroke="white" stroke-width="3" stroke-linecap="round"/><text x="58" y="24" font-family="sans-serif" font-size="16" font-weight="900" fill="%230f172a">STOCK<tspan fill="%232563eb">PRO</tspan></text><text x="58" y="38" font-family="sans-serif" font-size="9" font-weight="700" fill="%2364748b">DISTRIBUTION TUNISIE</text></svg>'
  },
  {
    id: 'preset-2',
    name: 'Industrie & Mécanique (Rouge & Anthracite)',
    data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="48" viewBox="0 0 180 48"><rect width="48" height="48" rx="10" fill="%23dc2626"/><circle cx="24" cy="24" r="14" stroke="white" stroke-width="3" fill="none" stroke-dasharray="6 3"/><circle cx="24" cy="24" r="6" fill="white"/><text x="58" y="24" font-family="sans-serif" font-size="15" font-weight="900" fill="%230f172a">MAGHREB<tspan fill="%23dc2626">INDUS</tspan></text><text x="58" y="38" font-family="sans-serif" font-size="8.5" font-weight="700" fill="%2364748b">OUTILLAGE %26 FOURNITURES</text></svg>'
  },
  {
    id: 'preset-3',
    name: 'Logistique & Transit (Émeraude & Saphir)',
    data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="48" viewBox="0 0 180 48"><rect width="48" height="48" rx="10" fill="%23059669"/><path d="M14 24l10-10 10 10-10 10z" fill="white"/><circle cx="24" cy="24" r="3" fill="%23059669"/><text x="58" y="24" font-family="sans-serif" font-size="15" font-weight="900" fill="%230f172a">TUNIS<tspan fill="%23059669">LOGISTICS</tspan></text><text x="58" y="38" font-family="sans-serif" font-size="8.5" font-weight="700" fill="%2364748b">ENTREPOSAGE RADES %26 SFAX</text></svg>'
  },
  {
    id: 'preset-4',
    name: 'Commerce & Comptoir (Indigo Corporate)',
    data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="48" viewBox="0 0 180 48"><rect width="48" height="48" rx="10" fill="%234f46e5"/><path d="M16 16h16v16H16z" fill="none" stroke="white" stroke-width="2.5"/><path d="M22 16v16M16 22h16" stroke="white" stroke-width="2.5"/><text x="58" y="24" font-family="sans-serif" font-size="15" font-weight="900" fill="%230f172a">COMPTOIR<tspan fill="%234f46e5">PRO</tspan></text><text x="58" y="38" font-family="sans-serif" font-size="8.5" font-weight="700" fill="%2364748b">VENTE GROS %26 DETAIL</text></svg>'
  }
];

export const SettingsModule: React.FC = () => {
  const { settings, updateSettings, injectDemoData, resetDatabase } = useStock();
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission(['admin']);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    companyName: settings.companyName,
    companyLogo: settings.companyLogo || '',
    taxId: settings.taxId,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    currency: settings.currency,
    valuationMethod: settings.valuationMethod,
    defaultVatRate: settings.defaultVatRate,
    fiscalStamp: settings.fiscalStamp || 1.000
  });

  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [logoUploadError, setLogoUploadError] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Gestion du fichier image logo (PNG, JPG, SVG, WebP)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError("Le fichier sélectionné doit être une image (PNG, JPG, SVG, WEBP).");
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setLogoUploadError("L'image dépasse 1.5 Mo. Veuillez choisir une image plus légère pour optimiser l'impression.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, companyLogo: base64 }));
    };
    reader.onerror = () => {
      setLogoUploadError("Erreur lors de la lecture du fichier image.");
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogoUrl = () => {
    if (!customLogoUrl.trim()) return;
    setFormData(prev => ({ ...prev, companyLogo: customLogoUrl.trim() }));
    setCustomLogoUrl('');
  };

  const handleSelectPresetLogo = (data: string) => {
    setFormData(prev => ({ ...prev, companyLogo: data }));
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, companyLogo: '' }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleInjectDemo = () => {
    if (confirm("Charger le jeu de données de test professionnel ? (12 produits tunisiens, 4 catégories, 2 dépôts, 3 fournisseurs, 5 clients et mouvements initiaux)")) {
      injectDemoData();
    }
  };

  const handleResetDb = () => {
    const confirmation = prompt("ATTENTION : Cette action efface toutes les données de stock et d'historique. Tapez 'RESET' pour confirmer :");
    if (confirmation === 'RESET') {
      resetDatabase();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-base font-black text-slate-800">Paramètres Généraux du Système</h2>
        <p className="text-xs text-slate-400">Configuration de l'entreprise, logo officiel pour factures & rapports, et règles fiscales</p>
      </div>

      {isSaved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          Paramètres et logo officiel enregistrés avec succès.
        </div>
      )}

      {/* Section Logo de l'Entreprise pour Documents Officiels */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Logo de l'Entreprise (Documents Officiels, Factures, Tickets & Rapports)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Intégration PDF & Caisse
          </span>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            Ce logo figurera automatiquement sur l'ensemble de vos documents commerciaux : <strong>factures officielles</strong>, <strong>tickets de caisse thermiques</strong>, <strong>bons de livraison/réception</strong> et <strong>les 14 rapports de stock en PDF</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Aperçu du logo actuel */}
            <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center min-h-[160px]">
              <span className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Aperçu du logo actuel
              </span>
              
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs w-full flex items-center justify-center min-h-[70px]">
                {formData.companyLogo ? (
                  <img 
                    src={formData.companyLogo} 
                    alt="Logo Entreprise" 
                    className="max-h-14 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-slate-400 text-xs font-medium italic">
                    Aucun logo personnalisé (texte par défaut « STOCK PRO »)
                  </div>
                )}
              </div>

              {formData.companyLogo && isAdmin && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="mt-3 text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer le logo
                </button>
              )}
            </div>

            {/* Actions d'importation et options */}
            <div className="md:col-span-7 space-y-3">
              {isAdmin && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      1. Importer un fichier image (PNG, JPG, SVG, WebP)
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      Choisir une image sur mon ordinateur...
                    </button>
                    {logoUploadError && (
                      <p className="text-[11px] text-rose-600 mt-1 font-semibold">{logoUploadError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      2. Ou renseigner une URL d'image directe
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={customLogoUrl}
                          onChange={(e) => setCustomLogoUrl(e.target.value)}
                          placeholder="https://mon-entreprise.tn/logo.png"
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyLogoUrl}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Modèles de logos rapides */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAdmin ? '3. Ou sélectionner un modèle professionnel prédéfini :' : 'Modèles professionnels :'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_LOGOS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => handleSelectPresetLogo(p.data)}
                      className={`p-2 rounded-lg border text-left text-[11px] transition flex items-center justify-between ${
                        formData.companyLogo === p.data
                          ? 'bg-blue-50 border-blue-500 font-bold text-blue-800'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {formData.companyLogo === p.data && (
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Exemple Visuel de Rendu Document Officiel */}
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Exemple de rendu sur document officiel (Facture / Rapport PDF)
            </span>
            <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs max-w-lg mx-auto">
              <div className="flex justify-between items-start border-b border-blue-600 pb-2">
                <div>
                  {formData.companyLogo ? (
                    <img src={formData.companyLogo} alt="Logo" className="max-h-8 max-w-[140px] object-contain mb-1" />
                  ) : (
                    <div className="font-black text-sm text-slate-900">STOCK <span className="text-blue-600">PRO</span></div>
                  )}
                  <div className="text-[9px] text-slate-500">
                    <strong>{formData.companyName}</strong><br/>
                    MF : {formData.taxId} • Tél : {formData.phone}
                  </div>
                </div>
                <div className="text-right text-[9px] text-slate-400">
                  <span className="font-bold text-slate-700">FACTURE N° FACT-2026-0042</span><br/>
                  Date : {new Date().toLocaleDateString('fr-TN')}
                </div>
              </div>
              <div className="text-[9px] text-slate-400 pt-2 text-center italic">
                En-tête officiel automatiquement imprimé avec votre logo
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire Coordonnées Entreprise */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
          <Building className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Identité & Coordonnées de l'Entreprise</h3>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Raison Sociale de l'Entreprise *</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Matricule Fiscal / Identifiant fiscal (MF) *</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Adresse E-mail officielle</label>
              <input
                type="email"
                disabled={!isAdmin}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Numéro de Téléphone</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Adresse du Siège Social</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Devise Principale</label>
              <input
                type="text"
                disabled
                value="Dinar Tunisien (TND - 3 décimales)"
                className="w-full text-xs p-2 bg-slate-200 border border-slate-300 rounded-lg font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Méthode de Valorisation</label>
              <select
                disabled={!isAdmin}
                value={formData.valuationMethod}
                onChange={(e) => setFormData({ ...formData, valuationMethod: e.target.value as any })}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-semibold"
              >
                <option value="CMP">Coût Moyen Pondéré (CMP)</option>
                <option value="FIFO">Premier Entré Premier Sortie (FIFO)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Taux TVA Standard (%)</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={formData.defaultVatRate}
                onChange={(e) => setFormData({ ...formData, defaultVatRate: parseFloat(e.target.value) || 19 })}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition"
              >
                Enregistrer tous les paramètres
              </button>
            </div>
          )}
        </form>
      </div>

      {/* État de la Base de Données & Persistance */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Statut de la Base de Données & Persistance
            </h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            isFirebaseLive ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {isFirebaseLive ? 'Connecté à Cloud Firestore' : 'Moteur Transactionnel Persistant Actif'}
          </span>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Stock Pro dispose d'une architecture persistante avec synchronisation Cloud Firestore et validation des règles de sécurité dans <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">firestore.rules</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-slate-800">Données de Démonstration (12 Produits)</h4>
              </div>
              <p className="text-[11px] text-slate-500">
                Charge 12 produits tunisiens (matériel électrique, outillage, emballage, informatique), 2 dépôts (Radès & Sfax), 3 fournisseurs et 5 clients avec mouvements historiques.
              </p>
              {isAdmin && (
                <button
                  onClick={handleInjectDemo}
                  className="mt-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Recharger le jeu de démonstration
                </button>
              )}
            </div>

            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h4 className="text-xs font-bold text-rose-800">Zone Dangereuse : Réinitialiser la Base</h4>
              </div>
              <p className="text-[11px] text-rose-600">
                Efface tous les produits, soldes, commandes et historiques de mouvements pour démarrer avec une base vierge.
              </p>
              {isAdmin && (
                <button
                  onClick={handleResetDb}
                  className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vider entièrement la base
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
