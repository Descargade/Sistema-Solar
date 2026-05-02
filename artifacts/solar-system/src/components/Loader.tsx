export default function Loader() {
  return (
    <div className="loader-overlay">
      <div className="loader-content">
        <div className="loader-solar">
          <div className="loader-sun" />
          <div className="loader-orbit loader-orbit-1">
            <div className="loader-planet lp-1" />
          </div>
          <div className="loader-orbit loader-orbit-2">
            <div className="loader-planet lp-2" />
          </div>
          <div className="loader-orbit loader-orbit-3">
            <div className="loader-planet lp-3" />
          </div>
        </div>
        <p className="loader-text">Cargando Sistema Solar</p>
        <div className="loader-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
