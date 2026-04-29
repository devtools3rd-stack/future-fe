const watchlistRows = [
  { symbol: 'BTCUSDT', price: '$64,240', signal: 'Long', change: '+2.4%' },
  { symbol: 'ETHUSDT', price: '$3,180', signal: 'Wait', change: '+0.8%' },
  { symbol: 'SOLUSDT', price: '$142.50', signal: 'Short', change: '-1.1%' },
]

export function Watchlist() {
  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Live pairs</p>
          <h2>Watchlist</h2>
        </div>
        <button type="button" className="primary-button">
          Add Pair
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Price</th>
              <th>Signal</th>
              <th>24h</th>
            </tr>
          </thead>
          <tbody>
            {watchlistRows.map((row) => (
              <tr key={row.symbol}>
                <td>{row.symbol}</td>
                <td>{row.price}</td>
                <td>
                  <span className={`pill pill-${row.signal.toLowerCase()}`}>
                    {row.signal}
                  </span>
                </td>
                <td>{row.change}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
