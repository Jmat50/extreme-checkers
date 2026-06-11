import { useMemo, useState, useCallback } from 'react';
import { Lobby, LobbyConfig } from './components/Lobby';
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

  if (!config || !ClientComponent) {
    return <Lobby onStart={setConfig} />;
  }

  return (
    <ClientComponent
      matchID={config.matchID ?? 'local'}
      playerID={config.mode === 'local' ? undefined : config.playerID ?? '0'}
    />
  );
}
