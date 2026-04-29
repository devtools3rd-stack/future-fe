export function Settings() {
  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">App</p>
          <h2>Settings</h2>
        </div>
        <button type="button" className="primary-button">
          Save Settings
        </button>
      </div>

      <form className="compact-form">
        <label>
          Quote currency
          <select defaultValue="USDT">
            <option value="USDT">USDT</option>
            <option value="USDC">USDC</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label>
          Refresh interval
          <select defaultValue="30">
            <option value="10">10 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">60 seconds</option>
          </select>
        </label>
        <label>
          Webhook URL
          <input placeholder="https://example.com/webhook" />
        </label>
        <label className="checkbox-row">
          <input defaultChecked type="checkbox" />
          Show only high confidence signals
        </label>
      </form>
    </section>
  )
}
