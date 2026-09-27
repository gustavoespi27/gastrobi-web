/** Espacio de trabajo (tenant): un grupo gastronómico. */
export interface Workspace {
  id: string;
  name: string;
}

/** Sucursal / cocina dentro de un workspace. */
export interface Branch {
  id: string;
  name: string;
}
