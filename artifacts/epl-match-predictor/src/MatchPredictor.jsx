import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Moon, Sun, Trophy } from 'lucide-react';

const API_BASE_URL = 'https://epl2-match-predictor-api-1.onrender.com';

function formatTime() {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}

function formatSeason(season) {
  return typeof season === 'string' ? season.replace('-', '–') : '2023–24';
}

async function getApiErrorMessage(response, action) {
  let detail = '';
  try {
    const body = await response.json();
    detail = typeof body?.detail === 'string'
      ? body.detail
      : typeof body?.message === 'string'
        ? body.message
        : '';
  } catch {
    // Fall back to the HTTP status when the API response is not JSON.
  }
  return detail
    ? `${action}: ${detail}`
    : `${action} (HTTP ${response.status}). Please try again.`;
}

function PredictionCard({ prediction, index }) {
  return (
    <article className="recent-item" data-testid={`prediction-item-${index}`}>
      <div>
        <div className="recent-match">{prediction.home} <span aria-hidden="true">–</span> {prediction.away}</div>
        <div className="recent-date">{prediction.time}</div>
      </div>
      <div className="recent-outcome">
        <span className="recent-confidence">{prediction.values[0]} / {prediction.values[1]} / {prediction.values[2]}</span>
        <span className="recent-tag" title="Home win / Draw / Away win">{prediction.label}</span>
      </div>
    </article>
  );
}

function MatchPredictor() {
  const [teams, setTeams] = useState([]);
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [teamError, setTeamError] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState([]);
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

  useEffect(() => {
    const controller = new AbortController();

    async function loadTeams() {
      setIsLoadingTeams(true);
      setTeamError('');
      try {
        const response = await fetch(`${API_BASE_URL}/teams`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, 'Unable to load teams'));
        }
        const data = await response.json();
        if (!Array.isArray(data?.teams) || data.teams.length < 2
          || !data.teams.every((team) => typeof team === 'string' && team.trim())) {
          throw new Error('The teams service returned an invalid team list.');
        }
        setTeams(data.teams);
        setHome(data.teams[0]);
        setAway(data.teams[1]);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setTeams([]);
          setTeamError(loadError instanceof TypeError
            ? 'Unable to reach the teams service. Check your connection and refresh to try again.'
            : loadError instanceof Error
              ? loadError.message
              : 'Unable to load teams. Please refresh the page and try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTeams(false);
        }
      }
    }

    loadTeams();
    return () => controller.abort();
  }, []);

  async function predictMatch(event) {
    event.preventDefault();
    if (isPredicting || isLoadingTeams || teamError || teams.length < 2) return;

    if (home === away) {
      setError('Choose two different clubs to compare.');
      setResult(null);
      return;
    }

    setError('');
    setResult(null);
    setIsPredicting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home_team: home, away_team: away }),
      });
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Unable to get a prediction'));
      }
      const data = await response.json();
      const probabilities = data?.probabilities;
      const values = [
        probabilities?.home_win,
        probabilities?.draw,
        probabilities?.away_win,
      ];
      if (typeof data?.home_team !== 'string' || typeof data?.away_team !== 'string'
        || !values.every((value) => typeof value === 'number' && Number.isFinite(value)
          && value >= 0 && value <= 100)) {
        throw new Error('The prediction service returned an invalid result. Please try again.');
      }
      const prediction = {
        home: data.home_team,
        away: data.away_team,
        values,
        season: data.historical_data_season,
        label: 'ESTIMATE',
        time: `JUST NOW · ${formatTime()}`,
      };
      setResult(prediction);
      setPredictions((current) => [prediction, ...current]);
    } catch (predictionError) {
      setError(predictionError instanceof TypeError
        ? 'Unable to reach the prediction service. Check your connection and try again.'
        : predictionError instanceof Error
          ? predictionError.message
          : 'Unable to get a prediction. Check your connection and try again.');
    } finally {
      setIsPredicting(false);
    }
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
          <p>Explore a matchup using historical 2023–24 Premier League data. Predictions are estimates, not guaranteed results.</p>
        </section>

        <div className="dashboard-grid">
          <section className="panel predict-panel" aria-labelledby="predict-title">
            <div className="panel-heading">
              <div>
                <h2 id="predict-title">Build a fixture</h2>
                <p>Pick a home side and an away side to get started.</p>
              </div>
              <span className="demo-chip">2023–24 data</span>
            </div>

            <form
              onSubmit={predictMatch}
              data-testid="form-predict-match"
              aria-busy={isPredicting || isLoadingTeams}
            >
              <div className="matchup">
                <div>
                  <label className="field-label" htmlFor="home-club">Home team</label>
                  <div className="select-wrap">
                    <select
                      id="home-club"
                      className="team-select"
                      value={home}
                      disabled={isPredicting || isLoadingTeams || teams.length === 0}
                      onChange={(event) => {
                        const selectedHome = event.target.value;
                        if (selectedHome === away) {
                          setError('Choose two different clubs to compare.');
                          return;
                        }
                        setHome(selectedHome);
                        setError('');
                      }}
                      data-testid="select-home-team"
                    >
                      {isLoadingTeams && <option value="">Loading teams…</option>}
                      {!isLoadingTeams && teams.length === 0 && <option value="">Teams unavailable</option>}
                      {teams.map((club) => (
                        <option key={club} value={club} disabled={club === away}>
                          {club}
                        </option>
                      ))}
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
                      disabled={isPredicting || isLoadingTeams || teams.length === 0}
                      onChange={(event) => {
                        const selectedAway = event.target.value;
                        if (selectedAway === home) {
                          setError('Choose two different clubs to compare.');
                          return;
                        }
                        setAway(selectedAway);
                        setError('');
                      }}
                      data-testid="select-away-team"
                    >
                      {isLoadingTeams && <option value="">Loading teams…</option>}
                      {!isLoadingTeams && teams.length === 0 && <option value="">Teams unavailable</option>}
                      {teams.map((club) => (
                        <option key={club} value={club} disabled={club === home}>
                          {club}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {(error || teamError) && <p className="form-error" role="alert" data-testid="status-validation-error">{error || teamError}</p>}
              <button
                className="predict-button"
                type="submit"
                disabled={isPredicting || isLoadingTeams || teams.length < 2 || Boolean(teamError)}
                aria-live="polite"
                data-testid="button-predict-match"
              >
                {isPredicting ? (
                  <>
                    <span className="loading-spinner" aria-hidden="true" />
                    Getting prediction…
                  </>
                ) : (
                  <>
                    <Trophy aria-hidden="true" />
                    {isLoadingTeams ? 'Loading teams…' : teamError ? 'Teams unavailable' : 'Predict match'}
                    <ArrowRight aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {result && (
              <section className="result-area" aria-live="polite" aria-labelledby="result-heading" data-testid="prediction-result">
                <div className="result-topline">
                  <div className="result-title" id="result-heading">{result.home} vs {result.away}</div>
                  <div className="result-demo">{formatSeason(result.season)} data · estimate</div>
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
                <p className="result-note">Based on historical {formatSeason(result.season)} data. These probabilities are estimates, not guaranteed results.</p>
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
                {predictions.length === 0
                  ? <p className="recent-date">Predictions you make will appear here.</p>
                  : predictions.map((prediction, index) => <PredictionCard key={`${prediction.home}-${prediction.away}-${index}`} prediction={prediction} index={index} />)}
              </div>
            </section>
            <section className="method-panel" aria-label="About these predictions" data-testid="demo-disclaimer">
              <div className="method-title"><Activity aria-hidden="true" /> A note on the numbers</div>
              <p>Predictions use historical 2023–24 data. They are estimates and are not guaranteed results.</p>
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
