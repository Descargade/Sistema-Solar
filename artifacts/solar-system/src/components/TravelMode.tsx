import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, Square, Radio } from 'lucide-react';
import { PLANETS, SUN_DATA } from '@/data/planets';
import type { SceneHandle } from '@/components/SolarSystemScene';

interface Props {
  sceneRef: React.RefObject<SceneHandle | null>;
  onPlanetFocus: (planetId: string | null) => void;
  onClose: () => void;
}

const SEQUENCE = ['sun', ...PLANETS.map(p => p.id)];

function getPlanetName(id: string): string {
  if (id === 'sun') return 'El Sol';
  return PLANETS.find(p => p.id === id)?.name ?? id;
}

function getNarration(id: string): string {
  if (id === 'sun') return `Iniciamos nuestro viaje en el corazón del Sistema Solar. ${SUN_DATA.description} ${SUN_DATA.fact}`;
  const planet = PLANETS.find(p => p.id === id);
  return planet?.narration ?? '';
}

function getPlanetColor(id: string): string {
  if (id === 'sun') return '#FDB813';
  return PLANETS.find(p => p.id === id)?.color ?? '#ffffff';
}

export default function TravelMode({ sceneRef, onPlanetFocus, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [narrationText, setNarrationText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentId = SEQUENCE[step];
  const planetName = getPlanetName(currentId);
  const color = getPlanetColor(currentId);
  const isLast = step >= SEQUENCE.length - 1;

  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'es-ES';
    utt.rate = 0.88;
    utt.pitch = 1.05;
    utt.volume = 1;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => { setIsSpeaking(false); onEnd?.(); };
    utt.onerror = () => { setIsSpeaking(false); onEnd?.(); };
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, []);

  const goToStep = useCallback((idx: number, autoPlay: boolean) => {
    clearAutoAdvance();
    stopSpeech();
    const id = SEQUENCE[idx];
    setStep(idx);
    setNarrationText(getNarration(id));

    // Focus planet in info panel
    onPlanetFocus(id === 'sun' ? null : id);

    // Travel camera
    sceneRef.current?.travelTo(id, () => {
      if (autoPlay) {
        const text = getNarration(id);
        speak(text, () => {
          // Auto-advance after speech ends
          if (idx < SEQUENCE.length - 1) {
            autoAdvanceRef.current = setTimeout(() => {
              goToStep(idx + 1, true);
            }, 1500);
          } else {
            setPlaying(false);
          }
        });
      }
    });
  }, [clearAutoAdvance, stopSpeech, onPlanetFocus, sceneRef, speak]);

  const handleStart = useCallback(() => {
    setPlaying(true);
    goToStep(step, true);
  }, [goToStep, step]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    clearAutoAdvance();
    stopSpeech();
  }, [clearAutoAdvance, stopSpeech]);

  const handleSkip = useCallback(() => {
    if (isLast) return;
    clearAutoAdvance();
    stopSpeech();
    const next = step + 1;
    goToStep(next, playing);
  }, [isLast, step, playing, goToStep, clearAutoAdvance, stopSpeech]);

  const handleClose = useCallback(() => {
    clearAutoAdvance();
    stopSpeech();
    onClose();
  }, [clearAutoAdvance, stopSpeech, onClose]);

  // Init narration text
  useEffect(() => {
    setNarrationText(getNarration(SEQUENCE[0]));
    sceneRef.current?.setTravelMode(true);
    sceneRef.current?.travelTo('sun');
    onPlanetFocus(null);
    return () => {
      clearAutoAdvance();
      stopSpeech();
      sceneRef.current?.setTravelMode(false);
    };
  }, []); // eslint-disable-line

  return (
    <div className="travel-overlay">
      {/* Header */}
      <div className="travel-header">
        <div className="travel-title-row">
          <div className="travel-badge">
            <Radio size={13} />
            MODO VIAJE
          </div>
          <button onClick={handleClose} className="travel-close-btn">✕</button>
        </div>

        {/* Progress */}
        <div className="travel-progress">
          {SEQUENCE.map((id, i) => (
            <button
              key={id}
              className={`progress-dot ${i === step ? 'active' : ''} ${i < step ? 'visited' : ''}`}
              style={{ '--dot-color': getPlanetColor(id) } as React.CSSProperties}
              onClick={() => goToStep(i, playing)}
              title={getPlanetName(id)}
            />
          ))}
        </div>
      </div>

      {/* Current planet */}
      <div className="travel-planet-card">
        <div className="travel-planet-indicator" style={{ backgroundColor: color + '22', borderColor: color + '55' }}>
          <div className="travel-planet-dot" style={{ backgroundColor: color, boxShadow: `0 0 14px ${color}` }} />
        </div>
        <div>
          <div className="travel-step-label">
            {step + 1} / {SEQUENCE.length}
          </div>
          <div className="travel-planet-name" style={{ color }}>
            {planetName}
          </div>
        </div>
        {isSpeaking && (
          <div className="speaking-indicator">
            <span /><span /><span />
          </div>
        )}
      </div>

      {/* Narration text */}
      <div className="travel-narration">
        <p>{narrationText}</p>
      </div>

      {/* Controls */}
      <div className="travel-controls">
        {!playing ? (
          <button className="travel-btn primary" onClick={handleStart}>
            <Play size={16} />
            {step === 0 ? 'Iniciar viaje' : 'Continuar'}
          </button>
        ) : (
          <button className="travel-btn" onClick={handlePause}>
            <Pause size={16} />
            Pausar
          </button>
        )}
        <button className="travel-btn" onClick={handleSkip} disabled={isLast}>
          <SkipForward size={16} />
          Siguiente
        </button>
        <button className="travel-btn danger" onClick={handleClose}>
          <Square size={16} />
          Salir
        </button>
      </div>
    </div>
  );
}
