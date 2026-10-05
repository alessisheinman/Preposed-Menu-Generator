import { useCallback, useEffect, useState } from 'react';
import { pruneCovers } from '../storage/covers';
import { shouldRemindExport } from '../storage/exportImport';
import { CatalogEditor } from './CatalogEditor';
import { DogLightbox, DogRails, DogStrip, type DogPhoto } from './DogRails';
import { EventEditor } from './EventEditor';
import { EventList } from './EventList';
import { useAppState } from './useAppState';

type Route = { view: 'list' } | { view: 'event'; id: string } | { view: 'catalog' };

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h.startsWith('event/')) return { view: 'event', id: decodeURIComponent(h.slice(6)) };
  if (h === 'catalog') return { view: 'catalog' };
  return { view: 'list' };
}

export function App() {
  const app = useAppState();
  const [route, setRoute] = useState<Route>(parseHash);
  const [dismissedReminder, setDismissedReminder] = useState(false);
  const [dog, setDog] = useState<DogPhoto | null>(null);
  const closeDog = useCallback(() => setDog(null), []);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Tidy up cover images that no proposal uses any more (once per visit).
  useEffect(() => {
    pruneCovers(new Set(app.state.events.map((e) => e.coverId).filter((x): x is string => !!x)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (hash: string) => { window.location.hash = hash; };
  const { events, lastExportAt, firstUseAt } = app.state;
  const remind = !dismissedReminder && shouldRemindExport(new Date(), events.length > 0, lastExportAt, firstUseAt);
  const current = route.view === 'event' ? events.find((e) => e.id === route.id) : undefined;

  return (
    <div className="app">
      <DogRails onOpen={setDog} />
      <header className="topbar">
        <a className="brand" href="#/"><span className="brand-script">Menu</span> Proposals</a>
        <nav>
          <a href="#/" className={route.view !== 'catalog' ? 'on' : ''}>Proposals</a>
          <a href="#/catalog" className={route.view === 'catalog' ? 'on' : ''}>Catalog</a>
        </nav>
      </header>
      <DogStrip onOpen={setDog} />
      {dog && <DogLightbox photo={dog} onClose={closeDog} />}

      {!app.storageAvailable && <div className="banner bad">This browser is blocking storage (private window?). Your work won't be saved — use Export backup before closing.</div>}
      {app.saveFailed && <div className="banner bad">Couldn't save to this browser (storage full?). Export a backup now.</div>}
      {remind && (
        <div className="banner">
          It's been a while since your last backup. Proposals live only in this browser. <a href="#/">Go to Proposals → Export backup</a>
          <button type="button" className="ghost" onClick={() => setDismissedReminder(true)}>Later</button>
        </div>
      )}

      <main>
        {route.view === 'catalog' && <CatalogEditor catalog={app.catalog} overrides={app.state.overrides} setOverrides={app.setOverrides} />}
        {route.view === 'event' && current && (
          <EventEditor
            event={current}
            catalog={app.catalog}
            coverUrl={current.coverId ? app.covers[current.coverId] ?? null : null}
            onCoverStored={app.putCover}
            onChange={(ev) => app.setEvents((all) => all.map((e) => (e.id === ev.id ? ev : e)))}
            onBack={() => go('/')}
          />
        )}
        {route.view === 'event' && !current && <div className="card"><p>That proposal doesn't exist in this browser.</p><a href="#/">Back to proposals</a></div>}
        {route.view === 'list' && (
          <EventList
            events={events}
            covers={app.covers}
            overrides={app.state.overrides}
            catalog={app.catalog}
            onOpen={(id) => go(`/event/${encodeURIComponent(id)}`)}
            setEvents={app.setEvents}
            setOverrides={(o) => app.setOverrides(() => o)}
            putCover={app.putCover}
            onExported={app.markExported}
          />
        )}
      </main>
    </div>
  );
}
