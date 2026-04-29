const historyRows = [
  {
    time: '09:40',
    symbol: 'BTCUSDT',
    side: 'Long',
    status: 'Hit TP',
    confidence: '82%',
  },
  {
    time: '08:15',
    symbol: 'ETHUSDT',
    side: 'Short',
    status: 'Closed',
    confidence: '74%',
  },
  {
    time: 'Yesterday',
    symbol: 'SOLUSDT',
    side: 'Long',
    status: 'Stopped',
    confidence: '68%',
  },
]

export function SignalHistory() {
  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Archive</p>
          <h2>Signal History</h2>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Pair</th>
              <th>Side</th>
              <th>Status</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {historyRows.map((row) => (
              <tr key={`${row.time}-${row.symbol}`}>
                <td>{row.time}</td>
                <td>{row.symbol}</td>
                <td>{row.side}</td>
                <td>{row.status}</td>
                <td>{row.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
