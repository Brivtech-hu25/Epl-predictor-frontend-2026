import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Moon, Sun, Trophy } from 'lucide-react';

const clubs = [
  'Arsenal',
  'Liverpool',
  'Manchester City',
  'Chelsea',
  'Manchester United',
  'Tottenham',
  'Newcastle United',
  'Aston Villa',
  'Brighton',
  'Everton',
];

const startingPredictions = [
  { home: 'Arsenal', away: 'Chelsea', values: [48, 27, 25], label: 'Home edge', time: 'DEMO EXAMPLE' },
  { home: 'Liverpool', away: 'Aston Villa', values: [55, 24, 21], label: 'Home edge', time: 'DEMO EXAMPLE' },
  { home: 'Everton', away: 'Tottenham', values: [29, 25, 46], label: 'Away edge', time: 'DEMO EXAMPLE' },
];

function getProbabilities(home, away) {
  const homeIndex = clubs.indexOf(home);
  const awayIndex = clubs.indexOf(away);
  const tilt = ((homeIndex * 13 + awayIndex * 7) % 19) - 9;
  const homeWin = Math.max(22, Math.min(61, 42 + tilt));
  const draw = 24 + ((homeIndex + awayIndex) % 8);
  return [homeWin, draw, 100 - homeWin - draw];
}

function formatTime() {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function PredictionCard({ prediction, index }) {
  const labels = ['Home win', 'Draw', 'Away win'];
  return (
    <article className="recent-item" data-testid={`prediction-item-${index}`}>
      <div>
        <div className="recent-match">{prediction.home} <span aria-hidden="true">–</span> {prediction.away}</div>
        <div className="recent-date">{prediction.time}</div>
      </div>
      <div className="recent-outcome">
        <span className="recent-confidence">{prediction.values[0]} / {prediction.values[1]} / {prediction.values[2]}</span>
        <span className="recent-tag" title={`${labels[0]} / ${labels[1]} / ${labels[2]}`}>{prediction.label}</span>
      </div>
    </article>
  );
}

function MatchPredictor() {
  const [home, setHome] = useState('Arsenal');
  const [away, setAway] = useState('Liverpool');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [predictions, setPredictions] = useState(startingPredictions);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('epl-predictor-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('epl-predictor-theme', theme);
    } catch {
      // The interface still works when browser storage is unavailable.
    }
  }, [theme]);

  function predictMatch(event) {
    event.preventDefault();
    if (home === away) {
      setError('Choose two different clubs to compare.');
      setResult(null);
      return;
    }
    setError('');
    const values = getProbabilities(home, away);
    const prediction = { home, away, values, label: 'DEMO', time: `JUST NOW · ${formatTime()}` };
    setResult(prediction);
    setPredictions((current) => [prediction, ...current]);
  }

  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="topbar">
        <div className="brand" data-testid="brand-name">
          <div className="brand-mark" aria-hidden="true"><Activity /></div>
          <div>EPL MATCH PREDICTOR <small>PREMIER LEAGUE LAB</small></div>
        </div>
        <button
          type="button"
          className="theme-button"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          data-testid="button-theme-toggle"
        >
          {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </header>

      <main className="main-content">
        <section className="intro" aria-labelledby="page-title">
          <div className="eyebrow">Matchday, your way</div>
          <h1 id="page-title">What if your<br /><span>club played?</span></h1>
          <p>Explore a matchup, compare the possibilities, and make the fixture yours. Just a football sandbox — no stakes, no certainty.</p>
        </section>

        <div className="dashboard-grid">
          <section className="panel predict-panel" aria-labelledby="predict-title">
            <div className="panel-heading">
              <div>
                <h2 id="predict-title">Build a fixture</h2>
                <p>Pick a home side and an away side to get started.</p>
              </div>
              <span className="demo-chip">Demo only</span>
            </div>

            <form onSubmit={predictMatch} data-testid="form-predict-match">
              <div className="matchup">
                <div>
                  <label className="field-label" htmlFor="home-club">Home team</label>
                  <div className="select-wrap">
                    <select
                      id="home-club"
                      className="team-select"
                      value={home}
                      onChange={(event) => { setHome(event.target.value); setError(''); }}
                      data-testid="select-home-team"
                    >
                      {clubs.map((club) => <option key={club} value={club}>{club}</option>)}
                    </select>
                  </div>
                </div>
                <div className="versus" aria-hidden="true">VS</div>
                <div>
                  <label className="field-label" htmlFor="away-club">Away team</label>
                  <div className="select-wrap">
                    <select
                      id="away-club"
                      className="team-select"
                      value={away}
                      onChange={(event) => { setAway(event.target.value); setError(''); }}
                      data-testid="select-away-team"
                    >
                      {clubs.map((club) => <option key={club} value={club}>{club}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {error && <p className="form-error" role="alert" data-testid="status-validation-error">{error}</p>}
              <button className="predict-button" type="submit" data-testid="button-predict-match">
                <Trophy aria-hidden="true" /> Predict match <ArrowRight aria-hidden="true" />
              </button>
            </form>

            {result && (
              <section className="result-area" aria-live="polite" aria-labelledby="result-heading" data-testid="prediction-result">
                <div className="result-topline">
                  <div className="result-title" id="result-heading">{result.home} vs {result.away}</div>
                  <div className="result-demo">Illustration · not a forecast</div>
                </div>
                <div className="probability-list">
                  {['Home win', 'Draw', 'Away win'].map((label, index) => (
                    <div className="probability-row" key={label} data-testid={`probability-${index}`}>
                      <span className="probability-label">{label}</span>
                      <div className="probability-track" aria-hidden="true">
                        <div className="probability-fill" style={{ width: `${result.values[index]}%` }} />
                      </div>
                      <strong>{result.values[index]}%</strong>
                    </div>
                  ))}
                </div>
                <p className="result-note">Illustrative percentages only. This demo uses a simple deterministic formula, not a trained model or live football data.</p>
              </section>
            )}
          </section>

          <aside className="side-stack">
            <section className="panel recent-panel" aria-labelledby="recent-title">
              <div className="recent-heading">
                <h2 id="recent-title">Recent predictions</h2>
                <span data-testid="prediction-count">{predictions.length} TOTAL</span>
              </div>
              <div className="recent-list" data-testid="recent-predictions-list">
                {predictions.map((prediction, index) => <PredictionCard key={`${prediction.home}-${prediction.away}-${index}`} prediction={prediction} index={index} />)}
              </div>
            </section>
            <section className="method-panel" aria-label="About these predictions" data-testid="demo-disclaimer">
              <div className="method-title"><Activity aria-hidden="true" /> A note on the numbers</div>
              <p>Every percentage here is a demo illustration for exploring matchups. Nothing is trained, live, or intended as betting advice.</p>
            </section>
          </aside>
        </div>
        <footer className="footer-note">
          <span>AN UNOFFICIAL FOOTBALL SANDBOX</span>
          <strong>For curiosity, not certainty.</strong>
        </footer>
      </main>
    </div>
  );
}

export default MatchPredictor;
