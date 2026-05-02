import { useState, useCallback, useRef } from 'react';
import SolarSystemScene, { type SceneHandle } from '@/components/SolarSystemScene';
import InfoPanel from '@/components/InfoPanel';
import Controls from '@/components/Controls';
import Loader from '@/components/Loader';
import TravelMode from '@/components/TravelMode';
import PlanetMenu from '@/components/PlanetMenu';
import type { PlanetData, SatelliteData } from '@/data/planets';
import { PLANETS } from '@/data/planets';
import { Rocket } from 'lucide-react';

export default function App() {
  const [selectedPlanet,    setSelectedPlanet]    = useState<PlanetData | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
  const [isSun,   setIsSun]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [speed,   setSpeed]   = useState(1.0);
  const [travelMode, setTravelMode] = useState(false);
  const sceneRef = useRef<SceneHandle>(null);

  const clearSelection = useCallback(() => {
    setSelectedPlanet(null);
    setSelectedSatellite(null);
    setIsSun(false);
  }, []);

  const handlePlanetSelect = useCallback((planet: PlanetData | null, sunClicked?: boolean) => {
    if (travelMode) return;
    setSelectedPlanet(planet);
    setSelectedSatellite(null);
    setIsSun(!!sunClicked);
  }, [travelMode]);

  const handleSatelliteSelect = useCallback((sat: SatelliteData, _planet: PlanetData) => {
    if (travelMode) return;
    setSelectedPlanet(null);
    setSelectedSatellite(sat);
    setIsSun(false);
  }, [travelMode]);

  const handleClose = useCallback(() => clearSelection(), [clearSelection]);

  const handleLoad = useCallback(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  const handleResetCamera = useCallback(() => {
    sceneRef.current?.resetCamera();
    clearSelection();
  }, [clearSelection]);

  const handleMenuSelect = useCallback((planetId: string | null, sunSelected: boolean) => {
    if (travelMode) return;
    if (sunSelected) {
      handlePlanetSelect(null, true);
      sceneRef.current?.focusPlanet('sun');
    } else if (planetId) {
      const planet = PLANETS.find(p => p.id === planetId) ?? null;
      handlePlanetSelect(planet, false);
      sceneRef.current?.focusPlanet(planetId);
    }
  }, [travelMode, handlePlanetSelect]);

  const handleStartTravel = useCallback(() => {
    setTravelMode(true);
    clearSelection();
  }, [clearSelection]);

  const handleTravelClose = useCallback(() => {
    setTravelMode(false);
    sceneRef.current?.resetCamera();
    clearSelection();
  }, [clearSelection]);

  const handleTravelFocus = useCallback((planetId: string | null) => {
    if (!planetId) {
      setIsSun(true);
      setSelectedPlanet(null);
      setSelectedSatellite(null);
    } else {
      const p = PLANETS.find(pl => pl.id === planetId) ?? null;
      setSelectedPlanet(p);
      setSelectedSatellite(null);
      setIsSun(false);
    }
  }, []);

  return (
    <div className="app-container">
      {loading && <Loader />}

      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <span className="header-star">✦</span>
          <span className="header-title">Sistema Solar</span>
          <span className="header-sub">Explorador 3D</span>
        </div>
        <div className="header-actions">
          {!travelMode && (
            <button className="travel-start-btn" onClick={handleStartTravel}>
              <Rocket size={14} />
              Modo Viaje
            </button>
          )}
          <div className="header-hint">
            <span>Haz clic en un planeta o satélite para explorar</span>
          </div>
        </div>
      </header>

      {/* 3D Scene */}
      <main className="scene-container">
        <SolarSystemScene
          ref={sceneRef}
          speedMultiplier={speed}
          onPlanetSelect={handlePlanetSelect}
          onSatelliteSelect={handleSatelliteSelect}
          onLoad={handleLoad}
        />
      </main>

      {/* Planet navigation menu */}
      {!travelMode && (
        <PlanetMenu
          selectedPlanetId={selectedPlanet?.id ?? null}
          isSun={isSun}
          onSelect={handleMenuSelect}
        />
      )}

      {/* Info panel (normal mode) */}
      {!travelMode && (
        <InfoPanel
          planet={selectedPlanet}
          isSun={isSun}
          satellite={selectedSatellite}
          onClose={handleClose}
        />
      )}

      {/* Travel mode overlay */}
      {travelMode && (
        <>
          <InfoPanel
            planet={selectedPlanet}
            isSun={isSun}
            satellite={null}
            onClose={() => {}}
          />
          <TravelMode
            sceneRef={sceneRef}
            onPlanetFocus={handleTravelFocus}
            onClose={handleTravelClose}
          />
        </>
      )}

      {/* Controls bar */}
      {!travelMode && (
        <Controls
          speed={speed}
          onSpeedChange={setSpeed}
          onResetCamera={handleResetCamera}
        />
      )}

      {/* Legend */}
      {!travelMode && (
        <div className="legend">
          <div className="legend-item">
            <span className="legend-dot natural" />
            <span>Satélite natural</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot artificial" />
            <span>Satélite artificial</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot asteroid" />
            <span>Cinturón de asteroides</span>
          </div>
        </div>
      )}
    </div>
  );
}
