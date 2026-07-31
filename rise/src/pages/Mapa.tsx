import { useStav } from '../data/store';
import { Ledger, LedgerKarty } from '../ui/Ledger';
import { usePortfolio } from '../ui/hooks';

export default function Mapa() {
  const { portfolio } = usePortfolio();
  useStav();

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-8">
      <h1 className="text-[32px]">Říše</h1>
      <div className="mt-8 hidden sm:block">
        <Ledger portfolio={portfolio} />
      </div>
      <div className="mt-8 sm:hidden">
        <LedgerKarty portfolio={portfolio} />
      </div>
      <p className="mt-8">
        <a href="#/kronika" className="underline underline-offset-4">
          Kronika a správa →
        </a>
      </p>
    </div>
  );
}
