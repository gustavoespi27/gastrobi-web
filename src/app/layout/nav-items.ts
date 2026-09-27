export interface NavItem {
  path: string;
  label: string;
  /** Nombre del ícono de Material Symbols. */
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { path: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: 'inventario', label: 'Inventario', icon: 'inventory_2' },
  { path: 'recetas', label: 'Recetas', icon: 'menu_book' },
  { path: 'ventas', label: 'Ventas', icon: 'trending_up' },
  { path: 'facturas', label: 'Facturas OCR', icon: 'document_scanner' },
  { path: 'configuracion', label: 'Configuración', icon: 'settings' },
];
