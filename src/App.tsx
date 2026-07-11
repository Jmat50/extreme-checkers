import { useMemo, useState, useCallback, useRef } from 'react';
import { Lobby, LobbyConfig } from './components/Lobby';
import { GradientsBackground } from './components/GradientsBackground';
import { BackgroundMusic } from './components/BackgroundMusic';
import { BurnTransition } from './components/BurnTransition';
import { createGameClient } from './client';
import { leaveSeat } from './lobby/lobbyClient';

export default function App() {
  const [config, setConfig] = useState<LobbyConfig | null>(null);
  const [burning, setBurning] = useState(false);
  const pendingConfigRef = useRef<LobbyConfig | null>(null);
  const handleLeave = useCallback(() => setConfig(null), []);

  const handleStart = useCallback((next: LobbyConfig) => {
    pendingConfigRef.current = next;
    setBurning(true);
  }, []);

  const handleBurnComplete = useCallback(() => {
    const next = pendingConfigRef.current;
    if (next) {
      setConfig(next);
      pendingConfigRef.current = null;
    }
    setBurning(false);
  }, []);

  const sessionConfig = useMemo(() => {
    if (!config) return null;
    return {
      ...config,
      onLeave: () => {
        if (
          config.mode === 'online' &&
          config.matchID &&
          config.playerID &&
          config.credentials
        ) {
          void leaveSeat(config.matchID, config.playerID, config.credentials).catch(
            () => undefined,
          );
        }
        handleLeave();
      },
    };
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
          <Lobby onStart={handleStart} />
        ) : (
          <ClientComponent
            matchID={config.matchID ?? 'local'}
            playerID={config.mode === 'local' ? undefined : config.playerID ?? '0'}
            credentials={config.credentials}
          />
        )}
      </div>
      {burning && <BurnTransition onComplete={handleBurnComplete} />}
    </>
  );
}
