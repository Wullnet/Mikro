/** Emetues i thjeshtë ngjarjesh me tipe. */
export class Emitter<E extends object> {
  private handlers = new Map<keyof E, Set<(payload: any) => void>>();

  on<K extends keyof E>(type: K, fn: (payload: E[K]) => void): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof E>(type: K, payload: E[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); } catch (e) { console.error('[events]', String(type), e); }
    }
  }
}
