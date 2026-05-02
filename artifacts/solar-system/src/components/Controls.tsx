import { RotateCcw, Gauge } from 'lucide-react';

interface Props {
  speed: number;
  onSpeedChange: (speed: number) => void;
  onResetCamera: () => void;
}

export default function Controls({ speed, onSpeedChange, onResetCamera }: Props) {
  return (
    <div className="controls-bar">
      <div className="control-group">
        <Gauge size={15} className="control-icon" />
        <span className="control-label">Velocidad</span>
        <input
          type="range"
          min={0}
          max={5}
          step={0.1}
          value={speed}
          onChange={e => onSpeedChange(Number(e.target.value))}
          className="speed-slider"
        />
        <span className="speed-value">{speed.toFixed(1)}x</span>
      </div>
      <button className="reset-btn" onClick={onResetCamera} title="Reiniciar cámara">
        <RotateCcw size={15} />
        <span>Reiniciar cámara</span>
      </button>
    </div>
  );
}
