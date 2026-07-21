import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

const RELOAD_FLAG = 'bob_chunk_reload';

function isChunkError(err: Error): boolean {
  // Chrome: "Failed to fetch dynamically imported module"
  // Safari/iOS: "Importing a module script failed."
  // Vite preload: "Unable to preload CSS for …"
  return /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch|Unable to preload CSS|MIME type/i
    .test(err.message);
}

/**
 * Zachytí pád lazy-loaded sekce. Nejčastější příčina: po deployi drží
 * nainstalovaná PWA starý index.html odkazující na už neexistující chunky —
 * jediná záchrana je reload (jednou za session, ať nevznikne smyčka).
 */
export class LazyBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  componentDidMount() {
    // Až po 10 s bezchybného běhu resetuj reload pojistku (pro další deploy).
    // Okamžité čištění by při trvale rozbitém chunku vytvořilo reload smyčku.
    this.clearTimer = setTimeout(() => {
      if (!this.state.error) sessionStorage.removeItem(RELOAD_FLAG);
    }, 10_000);
  }

  componentWillUnmount() {
    if (this.clearTimer) clearTimeout(this.clearTimer);
  }

  componentDidCatch(error: Error) {
    if (isChunkError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="empty-state">
          <p>😿 Tuhle část se nepodařilo načíst.</p>
          <p className="help-text" style={{ marginBottom: 14 }}>
            Pravděpodobně vyšla nová verze aplikace.
          </p>
          <button
            className="btn btn-gold"
            onClick={() => { sessionStorage.removeItem(RELOAD_FLAG); window.location.reload(); }}
          >
            Obnovit aplikaci
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
