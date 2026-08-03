import { lazy, Suspense } from 'react';
import Mapa from './pages/Mapa';
import { useCesta } from './ui/hooks';

const Kronika = lazy(() => import('./pages/Kronika'));

export default function App() {
  const cesta = useCesta();

  if (cesta.startsWith('/kronika')) {
    return (
      <Suspense fallback={<Nacitani />}>
        <Kronika />
      </Suspense>
    );
  }

  return <Mapa />;
}

function Nacitani() {
  return (
    <p className="p-10 font-display text-[13px] tracking-[0.14em]" role="status">
      OPENING THE BOOK…
    </p>
  );
}
