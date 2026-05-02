import { useState } from 'react';
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { PLANETS } from '@/data/planets';

interface Props {
  selectedPlanetId: string | null;
  isSun: boolean;
  onSelect: (planetId: string | null, isSun: boolean) => void;
}

const ITEMS = [
  { id: 'sun',  name: 'Sol',  color: '#FDB813', moons: 0 },
  ...PLANETS.map(p => ({ id: p.id, name: p.name, color: p.color, moons: p.moonsCount })),
];

export default function PlanetMenu({ selectedPlanetId, isSun, onSelect }: Props) {
  const [open, setOpen] = useState(true);
  const activeId = isSun ? 'sun' : (selectedPlanetId ?? '');

  return (
    <div className={`pm${open ? '' : ' pm--closed'}`}>
      {open && (
        <div className="pm__body">
          <div className="pm__head">
            <Globe size={11} />
            <span className="pm__title">Sistema Solar</span>
          </div>
          <ul className="pm__list">
            {ITEMS.map(item => (
              <li key={item.id}>
                <button
                  className={`pm__item${activeId === item.id ? ' pm__item--on' : ''}`}
                  onClick={() => onSelect(item.id === 'sun' ? null : item.id, item.id === 'sun')}
                >
                  <span
                    className="pm__dot"
                    style={{
                      background: item.color,
                      boxShadow: activeId === item.id ? `0 0 8px ${item.color}99` : `0 0 4px ${item.color}55`,
                    }}
                  />
                  <span className="pm__name">{item.name}</span>
                  {item.moons > 0 && (
                    <span className="pm__badge">{item.moons}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        className="pm__tog"
        onClick={() => setOpen(o => !o)}
        title={open ? 'Cerrar menú' : 'Abrir menú de planetas'}
      >
        {open ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </div>
  );
}
