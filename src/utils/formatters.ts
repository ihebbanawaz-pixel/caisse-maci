/**
 * Utilitaires de formatage et calculs financiers pour Stock Pro
 * Spécifications : Dinars Tunisiens (TND - 3 décimales), dates JJ/MM/AAAA, Fuseau Africa/Tunis
 */

export const formatTND = (amount: number | null | undefined): string => {
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  // Formatage propre : 1 250,000 TND
  const parts = val.toFixed(3).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decPart = parts[1];
  return `${intPart},${decPart} TND`;
};

export const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Africa/Tunis'
    }).format(date);
  } catch {
    return String(dateString);
  }
};

export const formatDateTime = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Tunis'
    }).format(date);
  } catch {
    return String(dateString);
  }
};

export const generateSequence = (prefix: string): string => {
  const year = new Date().getFullYear();
  const time = Date.now().toString().slice(-5);
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${year}-${time}${rand}`;
};

export const parseNumberSafely = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};
