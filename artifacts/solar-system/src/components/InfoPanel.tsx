import { X, Satellite, Moon, Info } from 'lucide-react';
import type { PlanetData } from '@/data/planets';
import { SUN_DATA } from '@/data/planets';

interface Props {
  planet: PlanetData | null;
  isSun: boolean;
  onClose: () => void;
}

export default function InfoPanel({ planet, isSun, onClose }: Props) {
  if (!planet && !isSun) return null;

  const naturalSats = planet?.satellites.filter(s => !s.isArtificial) ?? [];
  const artificialSats = planet?.satellites.filter(s => s.isArtificial) ?? [];

  return (
    <div className="info-panel">
      <button
        onClick={onClose}
        className="close-btn"
        aria-label="Cerrar"
      >
        <X size={18} />
      </button>

      {isSun && !planet ? (
        <>
          <div className="panel-header">
            <div className="planet-icon sun-icon">☀</div>
            <div>
              <h2 className="planet-name">El Sol</h2>
              <p className="planet-subtitle">Estrella central</p>
            </div>
          </div>
          <p className="planet-desc">{SUN_DATA.description}</p>
          <div className="data-grid">
            <DataRow label="Diámetro" value={SUN_DATA.realDiameter} />
            <DataRow label="Temperatura superficie" value={SUN_DATA.temperature} />
            <DataRow label="Edad" value={SUN_DATA.age} />
          </div>
          <div className="fact-box">
            <Info size={14} />
            <span>{SUN_DATA.fact}</span>
          </div>
        </>
      ) : planet ? (
        <>
          <div className="panel-header">
            <div className="planet-icon" style={{ backgroundColor: planet.color + '33', borderColor: planet.color + '66' }}>
              <div className="planet-dot" style={{ backgroundColor: planet.color }} />
            </div>
            <div>
              <h2 className="planet-name">{planet.name}</h2>
              <p className="planet-subtitle">Planeta</p>
            </div>
          </div>

          <p className="planet-desc">{planet.description}</p>

          <div className="data-grid">
            <DataRow label="Diámetro" value={planet.realDiameter} />
            <DataRow label="Distancia al Sol" value={planet.realDistance} />
            <DataRow label="Satélites" value={String(planet.moonsCount)} />
          </div>

          <div className="fact-box">
            <Info size={14} />
            <span>{planet.fact}</span>
          </div>

          {naturalSats.length > 0 && (
            <div className="sat-section">
              <div className="sat-section-title">
                <Moon size={14} />
                <span>Satélites Naturales</span>
              </div>
              <div className="sat-list">
                {naturalSats.map(sat => (
                  <div key={sat.id} className="sat-item">
                    <div className="sat-dot" style={{ backgroundColor: sat.color }} />
                    <div>
                      <div className="sat-name">{sat.name}</div>
                      <div className="sat-desc">{sat.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {artificialSats.length > 0 && (
            <div className="sat-section">
              <div className="sat-section-title artificial">
                <Satellite size={14} />
                <span>Satélites Artificiales</span>
              </div>
              <div className="sat-list">
                {artificialSats.map(sat => (
                  <div key={sat.id} className="sat-item artificial">
                    <div className="sat-dot artificial" style={{ backgroundColor: sat.color }} />
                    <div>
                      <div className="sat-name">{sat.name}</div>
                      <div className="sat-desc">{sat.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-row">
      <span className="data-label">{label}</span>
      <span className="data-value">{value}</span>
    </div>
  );
}
