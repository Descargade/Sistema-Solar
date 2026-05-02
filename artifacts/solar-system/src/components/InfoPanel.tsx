import { useState } from 'react';
import { X, Moon, Satellite, Info, Zap, RotateCw } from 'lucide-react';
import type { PlanetData } from '@/data/planets';
import { SUN_DATA } from '@/data/planets';

interface Props {
  planet: PlanetData | null;
  isSun: boolean;
  onClose: () => void;
}

type Tab = 'info' | 'satellites' | 'curiosidades';

export default function InfoPanel({ planet, isSun, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('info');

  if (!planet && !isSun) return null;

  const naturalSats = planet?.satellites.filter(s => !s.isArtificial) ?? [];
  const artificialSats = planet?.satellites.filter(s => s.isArtificial) ?? [];
  const hasSatellites = naturalSats.length > 0 || artificialSats.length > 0;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'info', label: 'Info', icon: <Info size={12} /> },
    ...(hasSatellites ? [{ id: 'satellites' as Tab, label: 'Satélites', icon: <Moon size={12} /> }] : []),
    { id: 'curiosidades', label: 'Datos', icon: <Zap size={12} /> },
  ];

  return (
    <div className="info-panel" key={planet?.id ?? 'sun'}>
      <button onClick={onClose} className="close-btn" aria-label="Cerrar">
        <X size={16} />
      </button>

      {/* Header */}
      {isSun && !planet ? (
        <div className="panel-header">
          <div className="planet-icon sun-icon">☀</div>
          <div>
            <h2 className="planet-name">El Sol</h2>
            <p className="planet-subtitle">Estrella · G2V</p>
          </div>
        </div>
      ) : planet ? (
        <div className="panel-header">
          <div className="planet-icon" style={{ backgroundColor: planet.color + '22', borderColor: planet.color + '55' }}>
            <div className="planet-dot" style={{ backgroundColor: planet.color, boxShadow: `0 0 10px ${planet.color}88` }} />
          </div>
          <div>
            <h2 className="planet-name">{planet.name}</h2>
            <p className="planet-subtitle">{planet.comparison}</p>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {tab === 'info' && (
          <>
            {isSun && !planet ? (
              <>
                <p className="planet-desc">{SUN_DATA.description}</p>
                <div className="data-grid">
                  <DataRow label="Diámetro" value={SUN_DATA.realDiameter} />
                  <DataRow label="Temperatura" value={SUN_DATA.temperature} />
                  <DataRow label="Edad" value={SUN_DATA.age} />
                </div>
                <div className="fact-box">
                  <Info size={13} />
                  <span>{SUN_DATA.fact}</span>
                </div>
              </>
            ) : planet ? (
              <>
                <p className="planet-desc">{planet.description}</p>
                <div className="data-grid">
                  <DataRow label="Diámetro" value={planet.realDiameter} />
                  <DataRow label="Distancia al Sol" value={planet.realDistance} />
                  <DataRow label="Temperatura media" value={planet.avgTemperature} />
                  <DataRow label="Satélites" value={String(planet.moonsCount)} />
                </div>
                <div className="period-row">
                  <PeriodCard icon={<RotateCw size={13} />} label="Rotación" value={planet.rotationPeriod} />
                  <PeriodCard icon={<Satellite size={13} />} label="Traslación" value={planet.orbitalPeriod} />
                </div>
                <div className="fact-box">
                  <Info size={13} />
                  <span>{planet.fact}</span>
                </div>
              </>
            ) : null}
          </>
        )}

        {tab === 'satellites' && planet && (
          <>
            {naturalSats.length > 0 && (
              <div className="sat-section">
                <div className="sat-section-title">
                  <Moon size={13} />
                  Satélites Naturales ({naturalSats.length})
                </div>
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
            )}
            {artificialSats.length > 0 && (
              <div className="sat-section">
                <div className="sat-section-title artificial">
                  <Satellite size={13} />
                  Satélites Artificiales ({artificialSats.length})
                </div>
                {artificialSats.map(sat => (
                  <div key={sat.id} className="sat-item artificial">
                    <div className="sat-dot artificial" style={{ backgroundColor: sat.color, boxShadow: `0 0 6px ${sat.color}` }} />
                    <div>
                      <div className="sat-name artificial">{sat.name}</div>
                      <div className="sat-desc">{sat.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'curiosidades' && (
          <div className="curiosities">
            {(isSun ? SUN_DATA.curiosities : planet?.curiosities ?? []).map((c, i) => (
              <div key={i} className="curiosity-item">
                <div className="curiosity-num">{i + 1}</div>
                <p className="curiosity-text">{c}</p>
              </div>
            ))}
          </div>
        )}
      </div>
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

function PeriodCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="period-card">
      <div className="period-icon">{icon}</div>
      <div className="period-label">{label}</div>
      <div className="period-value">{value}</div>
    </div>
  );
}
