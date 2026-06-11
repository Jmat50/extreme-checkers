import { Html, useProgress } from '@react-three/drei';

export function SceneLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="scene-loader">
        <p>Loading board…</p>
        <div className="scene-loader-bar">
          <div className="scene-loader-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </Html>
  );
}
