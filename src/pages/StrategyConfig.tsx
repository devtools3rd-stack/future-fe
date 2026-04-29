export function StrategyConfig() {
  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Rules</p>
          <h2>Strategy Config</h2>
        </div>
        <button type="button" className="primary-button">
          Save Strategy
        </button>
      </div>

      <form className="compact-form">
        <label>
          Strategy name
          <input defaultValue="Momentum Breakout" />
        </label>
        <label>
          Timeframe
          <select defaultValue="15m">
            <option value="5m">5 minutes</option>
            <option value="15m">15 minutes</option>
            <option value="1h">1 hour</option>
          </select>
        </label>
        <label>
          Risk per trade
          <input defaultValue="1.5" type="number" min="0" step="0.1" />
        </label>
        <label className="checkbox-row">
          <input defaultChecked type="checkbox" />
          Enable alerts
        </label>
      </form>
    </section>
  )
}
