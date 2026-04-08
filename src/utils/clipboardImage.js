/**
 * Obtiene el primer archivo de imagen de un evento paste (Ctrl+V / pegar).
 * @param {ClipboardEvent} e
 * @returns {File | null}
 */
export function getImageFileFromPasteEvent(e) {
  const items = e.clipboardData?.items;
  if (!items?.length) return null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.type.startsWith('image/')) continue;
    const blob = item.getAsFile();
    if (blob) {
      const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
      return new File([blob], `pegado-${Date.now()}.${ext}`, { type: blob.type });
    }
  }
  return null;
}
