import { useMemo, useState, useCallback } from 'react';
import { Lobby, LobbyConfig } from './components/Lobby';
import { GradientsBackground } from './components/GradientsBackground';
import { BackgroundMusic } from './components/BackgroundMusic';
import { createGameClient } from './client';

export default function App() {
  const [config, setConfig] = useState<LobbyConfig | null>(null);
  const handleLeave = useCallback(() => setConfig(null), []);

  const sessionConfig = useMemo(() => {
    if (!config) return null;
    return { ...config, onLeave: handleLeave };
  }, [config, handleLeave]);

  const ClientComponent = useMemo(() => {
    if (!sessionConfig) return null;
    return createGameClient(sessionConfig);
  }, [sessionConfig]);

  return (
    <>
      <GradientsBackground />
      <BackgroundMusic />
      <div className="app-shell">
        {!config || !ClientComponent ? (
          <Lobby onStart={setConfig} />
        ) : (
          <ClientComponent
            matchID={config.matchID ?? 'local'}
            playerID={config.mode === 'local' ? undefined : config.playerID ?? '0'}
          />
        )}
      </div>
    </>
  );
}
