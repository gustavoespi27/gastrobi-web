import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { environment } from '@env/environment';
import { Branch } from '@core/models/organization.models';

const STORAGE_KEY = 'gastrobi.branch';

function readStoredBranch(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Sucursal activa: todas las pantallas filtran sus datos por ella. */
@Injectable({ providedIn: 'root' })
export class BranchContextService {
  private readonly http = inject(HttpClient);

  readonly branches = signal<Branch[]>([]);
  readonly loadFailed = signal(false);
  private readonly selectedIdState = signal<string | null>(readStoredBranch());

  // Tipo explícito: branches()[0] es undefined mientras la lista no ha cargado.
  readonly selected = computed<Branch | null>(
    () =>
      this.branches().find((b) => b.id === this.selectedIdState()) ?? this.branches()[0] ?? null,
  );
  readonly selectedId = computed(() => this.selected()?.id ?? null);

  load(): void {
    this.loadFailed.set(false);
    this.http.get<Branch[]>(`${environment.apiUrl}/branches`).subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.loadFailed.set(true),
    });
  }

  select(branch: Branch): void {
    this.selectedIdState.set(branch.id);
    try {
      localStorage.setItem(STORAGE_KEY, branch.id);
    } catch {
      // Preferencia no persistida; no es crítico.
    }
  }
}
