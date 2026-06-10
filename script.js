/* ================================================
   WEATHERVS INDIA — script.js
   Created with love by Om Kute
================================================ */

const API_KEY = "dca11a2a8809e299aa33182738db53fd";

/* ========================
   DOM REFERENCES
======================== */

const cityInput      = document.getElementById("cityInput");
const searchBtn      = document.getElementById("searchBtn");

const cityName       = document.getElementById("cityName");
const cityRegion     = document.getElementById("cityRegion");
const weatherIcon    = document.getElementById("weatherIcon");
const temperature    = document.getElementById("temperature");
const weatherDesc    = document.getElementById("weatherDescription");

const feelsLike      = document.getElementById("feelsLike");
const humidity       = document.getElementById("humidity");
const windSpeed      = document.getElementById("windSpeed");
const pressure       = document.getElementById("pressure");
const visibility     = document.getElementById("visibility");
const uvIndex        = document.getElementById("uvIndex");
const uvLabel        = document.getElementById("uvLabel");

const sunrise        = document.getElementById("sunrise");
const sunset         = document.getElementById("sunset");
const lastUpdated    = document.getElementById("lastUpdated");

const forecastContainer = document.getElementById("forecastContainer");
const weatherStatus     = document.getElementById("weatherStatus");
const loadingState      = document.getElementById("loadingState");
const weatherContent    = document.getElementById("weatherContent");

const alertsList     = document.getElementById("alertsList");
const recentSearches = document.getElementById("recentSearches");

const themeToggle    = document.getElementById("themeToggle");
const themeIcon      = document.getElementById("themeIcon");
const themeText      = document.getElementById("themeText");

const splashScreen   = document.getElementById("splashScreen");

/* ========================
   SPLASH SCREEN
======================== */

window.addEventListener("load", () => {
  // Wait for splash animation to complete then dismiss
  setTimeout(() => {
    if (splashScreen) {
      splashScreen.classList.add("splash-exit");
      setTimeout(() => {
        splashScreen.style.display = "none";
      }, 500);
    }
    cityInput.focus();
  }, 2200);
});

/* ========================
   THEME
======================== */

loadTheme();

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem("theme", dark ? "dark" : "light");
  updateThemeUI();
});

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
  }
  updateThemeUI();
}

function updateThemeUI() {
  const dark = document.body.classList.contains("dark");
  themeIcon.textContent = dark ? "☀️" : "🌙";
  themeText.textContent = dark ? "Light Mode" : "Dark Mode";
}

/* ========================
   SEARCH EVENTS
======================== */

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) getWeather(city);
});

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();
    if (city) getWeather(city);
  }
});

document.querySelectorAll(".city-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const city = chip.dataset.city;
    cityInput.value = city;
    getWeather(city);
  });
});

/* ========================
   WEATHER API — MAIN
======================== */

async function getWeather(city) {
  try {
    showLoading();

    // Fetch current weather
    const currentURL =
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&units=metric&appid=${API_KEY}`;

    const currentRes  = await fetch(currentURL);
    const currentData = await currentRes.json();

    if (currentData.cod !== 200) {
      throw new Error(currentData.message || "City not found");
    }

    // Fetch UV index using lat/lon
    const { lat, lon } = currentData.coord;
    let uvValue = null;

    try {
      const uvURL = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
      const uvRes  = await fetch(uvURL);
      const uvData = await uvRes.json();
      if (uvData && typeof uvData.value === "number") {
        uvValue = uvData.value;
      }
    } catch (_) {
      // UV fetch failed silently — show N/A
    }

    updateCurrentWeather(currentData, uvValue);
    saveRecentSearch(city);
    generateAlerts(currentData);
    await getForecast(city);

    hideLoading();

  } catch (error) {
    setStatus("Error", "status-error");
    hideLoading();

    // Show a styled inline error instead of alert()
    weatherContent.innerHTML = `
      <div style="text-align:center;padding:24px 0;">
        <p style="font-size:2rem;margin-bottom:12px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="color:var(--red);display:block;margin:0 auto"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </p>
        <p style="font-weight:700;font-size:1.05rem;margin-bottom:6px;">City Not Found</p>
        <p style="color:var(--muted);font-size:0.9rem;">
          We could not find <strong>${escapeHtml(city)}</strong> in India.<br/>
          Check the spelling or try another city name.
        </p>
      </div>
    `;
    weatherContent.classList.remove("hidden");

    console.error("Weather fetch error:", error);
  }
}

/* ========================
   UPDATE CURRENT WEATHER
======================== */

function updateCurrentWeather(data, uvValue) {
  cityName.textContent    = data.name;
  cityRegion.textContent  = `${data.sys.country} · ${formatTime(Date.now() / 1000)} local`;
  temperature.textContent = `${Math.round(data.main.temp)}°C`;

  // Capitalise description
  const desc = data.weather[0].description;
  weatherDesc.textContent = desc.charAt(0).toUpperCase() + desc.slice(1);

  feelsLike.textContent  = `${Math.round(data.main.feels_like)}°C`;
  humidity.textContent   = `${data.main.humidity}%`;
  windSpeed.textContent  = `${Math.round(data.wind.speed * 3.6)} km/h`;
  pressure.textContent   = `${data.main.pressure} hPa`;
  visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;

  // UV Index with level label
  updateUVDisplay(uvValue);

  // Weather icon
  const icon = data.weather[0].icon;
  weatherIcon.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
  weatherIcon.classList.remove("hidden");
  weatherIcon.alt = desc;

  // Sun times
  sunrise.textContent     = formatTime(data.sys.sunrise);
  sunset.textContent      = formatTime(data.sys.sunset);
  lastUpdated.textContent = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit"
  });

  setStatus("Live", "status-live");

  // Reset content area to default markup in case of previous error display
  weatherContent.setAttribute("id", "weatherContent");
}

function updateUVDisplay(value) {
  if (value === null || value === undefined) {
    uvIndex.textContent = "N/A";
    uvLabel.textContent = "";
    uvLabel.className   = "uv-label";
    return;
  }

  const rounded = Math.round(value);
  uvIndex.textContent = rounded;

  let levelText  = "";
  let levelClass = "";

  if (rounded <= 2) {
    levelText = "Low";      levelClass = "";              // green (default)
  } else if (rounded <= 5) {
    levelText = "Moderate"; levelClass = "uv-moderate";
  } else if (rounded <= 7) {
    levelText = "High";     levelClass = "uv-high";
  } else if (rounded <= 10) {
    levelText = "Very High"; levelClass = "uv-very-high";
  } else {
    levelText = "Extreme";  levelClass = "uv-extreme";
  }

  uvLabel.textContent = levelText;
  uvLabel.className   = `uv-label${levelClass ? " " + levelClass : ""}`;
}

/* ========================
   5-DAY FORECAST
======================== */

async function getForecast(city) {
  try {
    const forecastURL =
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)},IN&units=metric&appid=${API_KEY}`;

    const res  = await fetch(forecastURL);
    const data = await res.json();

    if (!data.list) return;

    // Take one entry per day around midday
    const daily = data.list.filter(item => item.dt_txt.includes("12:00:00"));

    forecastContainer.innerHTML = "";

    daily.slice(0, 5).forEach((day, i) => {
      const date = new Date(day.dt_txt);
      const card = document.createElement("div");
      card.className = "forecast-day";
      card.style.animationDelay = `${i * 0.07}s`;

      const weekday = date.toLocaleDateString("en-IN", { weekday: "short" });
      const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const desc    = day.weather[0].description;
      const capDesc = desc.charAt(0).toUpperCase() + desc.slice(1);

      card.innerHTML = `
        <p class="forecast-weekday">${weekday}</p>
        <p class="forecast-date">${dateStr}</p>
        <img class="forecast-icon"
             src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png"
             alt="${capDesc}"
             loading="lazy" />
        <p class="forecast-temp">${Math.round(day.main.temp)}°C</p>
        <p class="forecast-desc">${capDesc}</p>
      `;

      forecastContainer.appendChild(card);
    });

  } catch (err) {
    forecastContainer.innerHTML =
      `<p class="muted placeholder-text">Forecast data unavailable at this time.</p>`;
    console.error("Forecast fetch error:", err);
  }
}

/* ========================
   ALERTS — SMART GENERATION
======================== */

function generateAlerts(data) {
  alertsList.innerHTML = "";

  const alerts  = [];
  const temp    = data.main.temp;
  const hum     = data.main.humidity;
  const wind    = data.wind.speed;           // m/s
  const desc    = data.weather[0].description.toLowerCase();
  const code    = data.weather[0].id;

  // Temperature alerts
  if (temp >= 42) {
    alerts.push({ cls: "alert-heat",     text: "Severe heat warning — temperature exceeds 42°C. Stay indoors and keep hydrated." });
  } else if (temp >= 37) {
    alerts.push({ cls: "alert-heat",     text: "High temperature alert — feels very hot today. Limit outdoor activity during peak hours." });
  } else if (temp <= 5) {
    alerts.push({ cls: "alert-cold",     text: "Cold wave alert — temperatures are near or below 5°C. Dress in warm layers." });
  }

  // Wind alerts (converted from m/s to km/h)
  const windKmh = wind * 3.6;
  if (windKmh >= 60) {
    alerts.push({ cls: "alert-storm",    text: `Strong wind advisory — gusts up to ${Math.round(windKmh)} km/h. Avoid open ground.` });
  } else if (windKmh >= 30) {
    alerts.push({ cls: "alert-wind",     text: `Windy conditions — ${Math.round(windKmh)} km/h. Secure loose outdoor objects.` });
  }

  // Humidity
  if (hum >= 90) {
    alerts.push({ cls: "alert-humidity", text: `Very high humidity (${hum}%). Expect heavy discomfort and possible fog.` });
  } else if (hum >= 75) {
    alerts.push({ cls: "alert-humidity", text: `High humidity (${hum}%). Conditions feel muggy — stay cool indoors.` });
  }

  // Rain / Thunderstorm by weather code
  if (code >= 200 && code <= 232) {
    alerts.push({ cls: "alert-storm",    text: "Thunderstorm activity reported. Avoid travel and seek shelter." });
  } else if (code >= 300 && code <= 321) {
    alerts.push({ cls: "alert-rain",     text: "Drizzle conditions — carry an umbrella." });
  } else if (code >= 500 && code <= 531) {
    if (code >= 502) {
      alerts.push({ cls: "alert-rain",   text: "Heavy rainfall expected. Road flooding may occur — drive carefully." });
    } else {
      alerts.push({ cls: "alert-rain",   text: "Rain expected today. Carry an umbrella and plan for slow commutes." });
    }
  }

  // Fog / Mist (codes 701–741)
  if (code >= 701 && code <= 741) {
    alerts.push({ cls: "alert-fog",      text: "Low visibility due to fog or mist. Drive slowly with headlights on." });
  }

  // All clear
  if (alerts.length === 0) {
    alerts.push({ cls: "safe",           text: "All clear — weather conditions in this city are calm today." });
  }

  alerts.forEach((a, i) => {
    const div = document.createElement("div");
    div.className = `alert-item ${a.cls}`;
    div.style.animationDelay = `${i * 0.08}s`;
    div.textContent = a.text;
    alertsList.appendChild(div);
  });
}

/* ========================
   RECENT SEARCHES
======================== */

function saveRecentSearch(city) {
  let searches = JSON.parse(localStorage.getItem("recentCities")) || [];

  // Remove duplicate (case-insensitive)
  searches = searches.filter(
    item => item.toLowerCase() !== city.toLowerCase()
  );

  searches.unshift(city);
  searches = searches.slice(0, 10);

  localStorage.setItem("recentCities", JSON.stringify(searches));
  renderRecentSearches();
}

function deleteRecentSearch(city) {
  let searches = JSON.parse(localStorage.getItem("recentCities")) || [];
  searches = searches.filter(
    item => item.toLowerCase() !== city.toLowerCase()
  );
  localStorage.setItem("recentCities", JSON.stringify(searches));
  renderRecentSearches();
}

function renderRecentSearches() {
  const searches = JSON.parse(localStorage.getItem("recentCities")) || [];

  recentSearches.innerHTML = "";

  if (searches.length === 0) {
    recentSearches.innerHTML =
      `<p class="muted placeholder-text">No recent searches yet.</p>`;
    return;
  }

  searches.forEach((city, i) => {
    const item = document.createElement("div");
    item.className = "recent-item";
    item.style.animationDelay = `${i * 0.05}s`;

    // City name + clock icon
    const nameEl = document.createElement("div");
    nameEl.className = "recent-city-name";
    nameEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      ${escapeHtml(city)}
    `;
    nameEl.addEventListener("click", () => {
      cityInput.value = city;
      getWeather(city);
    });

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.className = "delete-recent";
    delBtn.setAttribute("aria-label", `Remove ${city} from recent searches`);
    delBtn.innerHTML = `&times;`;
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteRecentSearch(city);
    });

    item.appendChild(nameEl);
    item.appendChild(delBtn);
    recentSearches.appendChild(item);
  });
}

/* ========================
   LOADING STATES
======================== */

function showLoading() {
  loadingState.classList.remove("hidden");
  weatherContent.classList.add("hidden");
  setStatus("Loading", "status-loading");
}

function hideLoading() {
  loadingState.classList.add("hidden");
  weatherContent.classList.remove("hidden");
}

function setStatus(text, cls) {
  weatherStatus.textContent = text;
  weatherStatus.className   = `section-tag status-tag ${cls}`;
}

/* ========================
   UTILITIES
======================== */

function formatTime(unix) {
  return new Date(unix * 1000).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}

/* ========================
   STARTUP
======================== */

renderRecentSearches();
