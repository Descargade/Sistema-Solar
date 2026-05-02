import { useState, useCallback } from 'react';
import SolarSystemScene from '@/components/SolarSystemScene';
import InfoPanel from '@/components/InfoPanel';
import Controls from '@/components/Controls';
import Loader from '@/components/Loader';
import type { PlanetData } from '@/data/planets';

export default function App() {
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [isSun, setIsSun] = useState(false);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(1.0);

  const handlePlanetSelect = useCallback((planet: PlanetData | null, sunClicked?: boolean) => {
    setSelectedPlanet(planet);
    setIsSun(!!sunClicked);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedPlanet(null);
    setIsSun(false);
  }, []);

  const handleLoad = useCallback(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  const handleResetCamera = useCallback(() => {
    const reset = (window as unknown as { __resetCamera?: () => void }).__resetCamera;
    if (reset) reset();
    handleClose();
  }, [handleClose]);

  return (
    <div className="app-container">
      {loading && <Loader />}

      <header className="app-header">
        <div className="header-logo">
          <span className="header-star">✦</span>
          <span className="header-title">Sistema Solar</span>
          <span className="header-sub">Explorador Interactivo 3D</span>
        </div>
        <div className="header-hint">
          Haz clic en cualquier planeta para explorar
        </div>
      </header>

      <main className="scene-container">
        <SolarSystemScene
          speedMultiplier={speed}
          onPlanetSelect={handlePlanetSelect}
          onLoad={handleLoad}
        />
      </main>

      <InfoPanel
        planet={selectedPlanet}
        isSun={isSun}
        onClose={handleClose}
      />

      <Controls
        speed={speed}
        onSpeedChange={setSpeed}
        onResetCamera={handleResetCamera}
      />

      <div className="legend">
        <div className="legend-item">
          <span className="legend-dot natural" />
          <span>Satélite natural</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot artificial" />
          <span>Satélite artificial</span>
        </div>
      </div>
    </div>
  );
}
