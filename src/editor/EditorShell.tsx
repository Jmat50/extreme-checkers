import { useEffect, useMemo } from 'react';
import { createGameClient } from '../client';
import { GradientsBackground } from '../components/GradientsBackground';
import { BackgroundMusic } from '../components/BackgroundMusic';
import { LevaPanel } from './LevaPanel';
import { useConfigStore } from '../config/configStore';
import { saveConfigToDisk } from './exportConfig';
import type { LobbyConfig } from '../components/Lobby';

const editorSession: LobbyConfig = {
  mode: 'local',
  playerName: 'Editor',
  playerID: '0',
  onLeave: () => undefined,
};

export function EditorShell() {
  const rulesVersion = useConfigStore((s) => s.rulesVersion);

  useEffect(() => {
    const onSave = () => {
      void saveConfigToDisk(useConfigStore.getState().config);
    };
    window.addEventListener('editor:save-request', onSave);
    return () => window.removeEventListener('editor:save-request', onSave);
  }, []);

  const ClientComponent = useMemo(() => createGameClient(editorSession), []);

  return (
    <>
      <GradientsBackground />
      <BackgroundMusic />
      <div className="app-shell">
        <LevaPanel />
        <div className="editor-banner">
          Editor mode — use Rules → editMode to click squares on the board. Save JSON when done.
        </div>
        <ClientComponent key={rulesVersion} matchID="editor" playerID={undefined} />
      </div>
    </>
  );
}
