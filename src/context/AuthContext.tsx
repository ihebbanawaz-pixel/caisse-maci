import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

export const SYSTEM_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: 'admin', label: 'Administrateur', description: 'Accès total aux données, paramètres, utilisateurs, stocks et clôtures.' },
  { role: 'stock_manager', label: 'Responsable de stock', description: 'Gestion des produits, réceptions, sorties, transferts, inventaires et rapports.' },
  { role: 'warehouseman', label: 'Magasinier', description: 'Consultation des produits et saisie opérationnelle des flux autorisés.' },
  { role: 'buyer', label: 'Acheteur', description: 'Gestion des fournisseurs, prix d\'achat et commandes d\'approvisionnement.' },
  { role: 'sales', label: 'Commercial', description: 'Gestion des clients, réservations de stock et commandes de vente.' },
  { role: 'viewer', label: 'Lecteur', description: 'Consultation seule sans droit de modification ni de validation.' },
];

export const PRESET_USERS: UserProfile[] = [
  {
    id: 'USR-ADMIN',
    email: 'moncef.bensalem@maghreb-distribution.tn',
    displayName: 'Moncef Ben Salem (Directeur Général)',
    role: 'admin',
    active: true,
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'USR-MGR',
    email: 'karim.trabelsi@maghreb-distribution.tn',
    displayName: 'Karim Trabelsi (Responsable Stock)',
    role: 'stock_manager',
    active: true,
    createdAt: '2026-01-02T08:00:00Z'
  },
  {
    id: 'USR-MAG',
    email: 'lotfi.magasin@maghreb-distribution.tn',
    displayName: 'Lotfi Zaher (Magasinier Principal)',
    role: 'warehouseman',
    active: true,
    createdAt: '2026-01-03T08:00:00Z'
  },
  {
    id: 'USR-ACH',
    email: 'samia.achats@maghreb-distribution.tn',
    displayName: 'Samia Mansouri (Responsable Achats)',
    role: 'buyer',
    active: true,
    createdAt: '2026-01-04T08:00:00Z'
  },
  {
    id: 'USR-COM',
    email: 'tarak.commercial@maghreb-distribution.tn',
    displayName: 'Tarak Hammami (Commercial B2B)',
    role: 'sales',
    active: true,
    createdAt: '2026-01-05T08:00:00Z'
  },
  {
    id: 'USR-LEC',
    email: 'audit@maghreb-distribution.tn',
    displayName: 'Cabinet Audit (Consultation)',
    role: 'viewer',
    active: true,
    createdAt: '2026-01-06T08:00:00Z'
  }
];

interface AuthContextType {
  currentUser: UserProfile | null;
  usersList: UserProfile[];
  loading: boolean;
  login: (email: string, role?: UserRole) => Promise<boolean>;
  switchUser: (userId: string) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  addUser: (user: Omit<UserProfile, 'id' | 'createdAt'>) => void;
  logout: () => void;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('sp_users_list');
    return saved ? JSON.parse(saved) : PRESET_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('sp_current_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return PRESET_USERS[0]; }
    }
    return PRESET_USERS[0]; // Administrateur par défaut pour l'évaluation immédiate
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('sp_users_list', JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('sp_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('sp_current_user');
    }
  }, [currentUser]);

  const login = async (email: string, role: UserRole = 'admin'): Promise<boolean> => {
    setLoading(true);
    let matched = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!matched) {
      matched = {
        id: `USR-${Date.now().toString().slice(-4)}`,
        email,
        displayName: email.split('@')[0].toUpperCase(),
        role,
        active: true,
        createdAt: new Date().toISOString()
      };
      setUsersList(prev => [...prev, matched!]);
    }
    setCurrentUser(matched);
    setLoading(false);
    return true;
  };

  const switchUser = (userId: string) => {
    const target = usersList.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
    }
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, role: newRole } : null);
    }
  };

  const addUser = (newUser: Omit<UserProfile, 'id' | 'createdAt'>) => {
    const created: UserProfile = {
      ...newUser,
      id: `USR-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toISOString()
    };
    setUsersList(prev => [...prev, created]);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const hasPermission = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return allowedRoles.includes(currentUser.role);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      usersList,
      loading,
      login,
      switchUser,
      updateUserRole,
      addUser,
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
