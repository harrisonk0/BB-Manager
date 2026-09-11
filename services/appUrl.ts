export const getAppUrl = () => {
  const configured = import.meta.env.VITE_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
};
