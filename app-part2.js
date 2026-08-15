// ============================================================
// CITY-LOCAL TIME HELPERS
// The selected city's UTC offset (the `utc_offset_seconds` field the
// weather API returns for that location, which already accounts for
// DST on the current date) is used for every "what hour/day is it
// right now in this city" calculation — never the phone's own system
// timezone. Switching cities updates this the moment new data loads.
// ============================================================
let globalUtcOffsetSeconds = 0;

function getCityNowDate() {
    const offsetMs = (typeof globalUtcOffsetSeconds === 'number' ? globalUtcOffsetSeconds : 0) * 1000;
    return new Date(Date.now() + offsetMs);
}

function getCityCurrentHour() {
    // Using the UTC getter on a Date shifted by the city's offset yields the
    // city's local wall-clock hour, regardless of the phone's own timezone.
    return getCityNowDate().getUTCHours();
}

function parseApiDateUTC(dateStr) {
    // The API's daily "time" values are date-only strings (e.g. "2026-08-16")
    // representing a calendar date in the city's own timezone. Parsing them
    // as UTC (instead of letting the browser apply its own local timezone)
    // keeps the weekday/date calculation stable no matter where the phone is.
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

let currentAlerts = [];
let alertRotationIndex = 0;
let alertRotationTimer = null;

function setActiveAlerts(alertsArray) {
    currentAlerts = alertsArray;
    alertRotationIndex = 0;
    const alertBox = document.getElementById('extremeAlert');

    if (alertRotationTimer) {
        clearInterval(alertRotationTimer);
        alertRotationTimer = null;
    }

    if (currentAlerts.length === 0) {
        alertBox.style.display = 'none';
        return;
    }

    alertBox.style.display = 'block';
    alertBox.textContent = currentAlerts[0];

    if (currentAlerts.length > 1) {
        alertRotationTimer = setInterval(() => {
            alertBox.classList.add('alert-fading');
            setTimeout(() => {
                alertRotationIndex = (alertRotationIndex + 1) % currentAlerts.length;
                alertBox.textContent = currentAlerts[alertRotationIndex];
                alertBox.classList.remove('alert-fading');
            }, 350);
        }, 4000);
    }
}

function setCardSub(elementId, text, level) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const cls = level === 'good' ? 'status-good' : (level === 'bad' ? 'status-bad' : 'status-normal');
    el.innerHTML = `<span class="mini-badge ${cls}">${text}</span>`;
}

function updateLastUpdatedLabel() {
    const el = document.getElementById('lastUpdatedLabel');
    if (!el) return;
    const lbl = dict[config.lang].lastUpdated;
    if (lastUpdated) {
        const timeStr = lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const now = new Date();
        const isSameDay = lastUpdated.getFullYear() === now.getFullYear() &&
                           lastUpdated.getMonth() === now.getMonth() &&
                           lastUpdated.getDate() === now.getDate();
        if (isSameDay) {
            el.textContent = `${lbl}: ${timeStr}`;
        } else {
            const dd = String(lastUpdated.getDate()).padStart(2, '0');
            const mm = String(lastUpdated.getMonth() + 1).padStart(2, '0');
            const yyyy = lastUpdated.getFullYear();
            el.textContent = `${lbl}: ${dd}.${mm}.${yyyy} ${timeStr}`;
        }
    } else {
        el.textContent = `${lbl}: --:--`;
    }
}

function setRefreshState(isRefreshing) {
    const icon = document.getElementById('refreshIcon');
    const label = document.getElementById('refreshBtnLabel');
    const btn = document.getElementById('manualRefreshBtn');
    if (!icon || !label || !btn) return;
    if (isRefreshing) {
        icon.style.display = 'inline-block';
        icon.style.animation = 'spin 0.8s linear infinite';
        btn.style.opacity = '0.6';
        label.textContent = dict[config.lang].refreshing;
    } else {
        icon.style.animation = 'none';
        btn.style.opacity = '1';
        label.textContent = dict[config.lang].refresh;
    }
}

function renderHistoryTags() {
    const container = document.getElementById('historyContainer');
    container.innerHTML = '';
    searchHistory.forEach(city => {
        const chip = document.createElement('div');
        chip.className = 'history-tag';
        chip.textContent = city;

        let longPressTimer = null;
        let longPressTriggered = false;

        const startPress = () => {
            longPressTriggered = false;
            longPressTimer = setTimeout(() => {
                longPressTriggered = true;
                confirmDeleteHistoryCity(city);
            }, 550);
        };
        const cancelPress = () => {
            clearTimeout(longPressTimer);
        };

        chip.addEventListener('mousedown', startPress);
        chip.addEventListener('mouseup', cancelPress);
        chip.addEventListener('mouseleave', cancelPress);
        chip.addEventListener('touchstart', startPress, { passive: true });
        chip.addEventListener('touchend', cancelPress);
        chip.addEventListener('touchmove', cancelPress);
        chip.addEventListener('click', () => {
            if (longPressTriggered) return;
            selectHistoryCity(city);
        });

        container.appendChild(chip);
    });
}

function confirmDeleteHistoryCity(city) {
    const d = dict[config.lang];
    showDialog({
        title: d.historyDeleteTitle,
        text: `${d.historyDeleteText} (${city})`,
        buttons: [
            { label: d.historyDeleteCancel, className: 'dialog-btn-cancel' },
            { label: d.historyDeleteConfirm, className: 'dialog-btn-confirm', onClick: () => deleteHistoryCity(city) }
        ]
    });
}

function deleteHistoryCity(city) {
    searchHistory = searchHistory.filter(c => c !== city);
    localStorage.setItem('weather_search_history', JSON.stringify(searchHistory));
    renderHistoryTags();
}

function selectHistoryCity(city) {
    currentCity = city;
    fetchWeatherData(city, null, 'search');
}

function clearHistory() {
    searchHistory = ["Beruniy"];
    localStorage.setItem('weather_search_history', JSON.stringify(searchHistory));
    renderHistoryTags();
    closeSettings();
}

function changeLang(langCode) {
    config.lang = langCode;
    localStorage.setItem('weather_app_lock_v5', JSON.stringify(config));
    document.querySelectorAll('#settingsPanel .radio-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn_${langCode}`).classList.add('active');
    
    const langData = dict[langCode];
    for (let id in langData) {
        let element = document.getElementById(id);
        if (element) element.textContent = langData[id];
    }
    document.getElementById('cityInput').placeholder = langData.placeholder;
    document.getElementById('searchBtn').textContent = langData.searchBtn;
    
    document.getElementById('titleHourly').textContent = langData.titleHourly;
    document.getElementById('titleActivities').textContent = langData.titleActivities;
    document.getElementById('titleWeekly').textContent = langData.titleWeekly;
    document.getElementById('lblFeels').textContent = langData.lblFeels;
    document.getElementById('lblWind').textContent = langData.lblWind;
    document.getElementById('lblHumidity').textContent = langData.lblHumidity;
    document.getElementById('lblUv').textContent = langData.lblUv;
    document.getElementById('lblSunrise').textContent = langData.lblSunrise;
    document.getElementById('lblSunset').textContent = langData.lblSunset;
    document.getElementById('lblAqi').textContent = langData.lblAqi;
    document.getElementById('lblPressure').textContent = langData.lblPressure;
    document.getElementById('lblVisibility').textContent = langData.lblVisibility;
    document.getElementById('fetchErrorText').textContent = langData.fetchError;
    document.getElementById('fetchErrorRetryBtn').textContent = langData.retry;
    document.getElementById('refreshBtnLabel').textContent = langData.refresh;
    updateLastUpdatedLabel();

    fetchWeatherData(currentCity);
}

function changeUnit(type, value) {
    config[type] = value;
    localStorage.setItem('weather_app_lock_v5', JSON.stringify(config));
    if(type === 'temp') {
        document.getElementById('btn_C').classList.remove('active');
        document.getElementById('btn_F').classList.remove('active');
        document.getElementById(`btn_${value}`).classList.add('active');
    } else {
        document.getElementById('btn_ms').classList.remove('active');
        document.getElementById('btn_kmh').classList.remove('active');
        document.getElementById(`btn_${value === 'm/s' ? 'ms' : 'kmh'}`).classList.add('active');
    }
    fetchWeatherData(currentCity);
}

async function searchCity() {
    let city = document.getElementById('cityInput').value.trim();
    if(city) {
        currentCity = city.charAt(0).toUpperCase() + city.slice(1);
        if(!searchHistory.includes(currentCity)) {
            searchHistory.unshift(currentCity);
            if(searchHistory.length > 8) searchHistory.pop();
            localStorage.setItem('weather_search_history', JSON.stringify(searchHistory));
        }
        renderHistoryTags();
        document.getElementById('suggestionsBox').style.display = 'none';
        fetchWeatherData(currentCity, null, 'search');
    }
}

function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

const fetchCitySuggestions = debounce(async (query) => {
    const box = document.getElementById('suggestionsBox');
    if (!query || query.trim().length < 2) {
        box.style.display = 'none';
        return;
    }
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=${config.lang === 'uz' ? 'en' : config.lang}`);
        if (!res.ok) throw new Error('suggestion fetch failed');
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            box.style.display = 'none';
            return;
        }
        box.innerHTML = '';
        data.results.forEach(r => {
            const region = r.admin1 ? `, ${r.admin1}` : '';
            const item = document.createElement('div');
            item.style.cssText = 'padding:12px 14px; cursor:pointer; font-size:14px; border-bottom:1px solid rgba(255,255,255,0.05);';
            item.textContent = `${r.name}${region} (${r.country})`;
            item.onmousedown = (e) => {
                e.preventDefault();
                selectSuggestion(r.name, r.latitude, r.longitude);
            };
            box.appendChild(item);
        });
        box.style.display = 'block';
    } catch (err) {
        console.error("Suggestion fetch error:", err);
        box.style.display = 'none';
    }
}, 300);

function selectSuggestion(name, lat, lon) {
    currentCity = name;
    if (!searchHistory.includes(name)) {
        searchHistory.unshift(name);
        if (searchHistory.length > 8) searchHistory.pop();
        localStorage.setItem('weather_search_history', JSON.stringify(searchHistory));
    }
    renderHistoryTags();
    document.getElementById('cityInput').value = '';
    document.getElementById('suggestionsBox').style.display = 'none';
    fetchWeatherData(name, { name, lat, lon }, 'search');
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('cityInput');
    input.addEventListener('input', (e) => fetchCitySuggestions(e.target.value));
    document.addEventListener('click', (e) => {
        const box = document.getElementById('suggestionsBox');
        if (!input.contains(e.target) && !box.contains(e.target)) {
            box.style.display = 'none';
        }
    });
});

const CITY_CACHE_KEY = 'weatherx_city_cache_v1';
const CITY_CACHE_MAX_ENTRIES = 20;

function loadCityCacheStore() {
    try {
        return JSON.parse(localStorage.getItem(CITY_CACHE_KEY)) || {};
    } catch (e) {
        console.error('City cache read failed:', e);
        return {};
    }
}

function getCityCache(cityKey) {
    const store = loadCityCacheStore();
    return store[cityKey] || null;
}

function saveCityCache(cityKey, entry) {
    try {
        const store = loadCityCacheStore();
        store[cityKey] = { ...entry, ts: Date.now() };

        const keys = Object.keys(store);
        if (keys.length > CITY_CACHE_MAX_ENTRIES) {
            keys.sort((a, b) => (store[a].ts || 0) - (store[b].ts || 0));
            const toRemove = keys.slice(0, keys.length - CITY_CACHE_MAX_ENTRIES);
            toRemove.forEach(k => delete store[k]);
        }

        localStorage.setItem(CITY_CACHE_KEY, JSON.stringify(store));
    } catch (e) {
        console.error('City cache save failed:', e);
    }
}

async function fetchWeatherData(cityName, presetCoords, context = 'auto') {
    const isFirstLoad = !globalWeatherData;
    const cacheKey = (cityName || '').trim().toLowerCase();
    const cached = cacheKey ? getCityCache(cacheKey) : null;

    document.getElementById('fetchErrorBanner').style.display = 'none';

    let paintedFromCache = false;
    if (cached) {
        applyWeatherData(cached.data, cached.realAqi, cached.cityName, new Date(cached.ts), cached.realPm10);
        paintedFromCache = true;
    }

    setRefreshState(true);

    if (!navigator.onLine) {
        setRefreshState(false);
        if (context === 'manual') {
            showSnackbar(dict[config.lang].snackRefreshFailed, 'error');
        } else if (paintedFromCache) {
            showSnackbar(dict[config.lang].snackOfflineShowingCached, 'info');
        } else {
            showSnackbar(dict[config.lang].snackNeedsFirstLoad, 'error');
        }
        return;
    }

    try {
        let lat, lon, formattedName;
        if (presetCoords) {
            lat = presetCoords.lat;
            lon = presetCoords.lon;
            formattedName = presetCoords.name;
        } else if (cached && typeof cached.lat === 'number' && typeof cached.lon === 'number') {
            lat = cached.lat;
            lon = cached.lon;
            formattedName = cached.cityName;
        } else {
            let geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${cityName}&count=1&language=en`);
            if (!geoRes.ok) throw new Error(`Geocoding API error: ${geoRes.status}`);
            let geoData = await geoRes.json();
            if (!geoData.results || geoData.results.length === 0) {
                document.getElementById('cityInput').placeholder = dict[config.lang].errorCity;
                document.getElementById('cityInput').value = '';
                setRefreshState(false);
                if (!paintedFromCache) showSnackbar(dict[config.lang].snackCityNotFound, 'error');
                return;
            }
            document.getElementById('cityInput').placeholder = dict[config.lang].placeholder;
            lat = geoData.results[0].latitude;
            lon = geoData.results[0].longitude;
            formattedName = geoData.results[0].name;
        }
        
        let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,uv_index,precipitation,is_day&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,dew_point_2m,visibility,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=auto&wind_speed_unit=kmh`;
        let aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10`;
        
        let weatherRes = await fetch(url);
        if (!weatherRes.ok) throw new Error(`Weather API error: ${weatherRes.status}`);
        let data = await weatherRes.json();
        if (data.error) throw new Error(data.reason || "Weather API returned an error");

        let realAqi = null;
        let realPm10 = null;
        try {
            let aqRes = await fetch(aqUrl);
            if (aqRes.ok) {
                let aqData = await aqRes.json();
                if (aqData.current && typeof aqData.current.us_aqi === 'number') realAqi = aqData.current.us_aqi;
                if (aqData.current && typeof aqData.current.pm10 === 'number') realPm10 = aqData.current.pm10;
            }
        } catch (aqErr) {
            console.error("Air quality fetch failed:", aqErr);
        }

        applyWeatherData(data, realAqi, formattedName, new Date(), realPm10);
        saveCityCache(formattedName.trim().toLowerCase(), { data, realAqi, realPm10, cityName: formattedName, lat, lon });

        if (!isFirstLoad) {
            showSnackbar(dict[config.lang].snackWeatherUpdated, 'success');
        }
    } catch (err) {
        console.error("Xato:", err);
        if (context === 'manual') {
            showSnackbar(dict[config.lang].snackRefreshFailed, 'error');
        } else if (paintedFromCache) {
            showSnackbar(dict[config.lang].snackOfflineShowingCached, 'info');
        } else {
            showSnackbar(dict[config.lang].snackServerError, 'warning', {
                label: dict[config.lang].snackRetryBtn,
                onClick: () => fetchWeatherData(cityName, presetCoords, context)
            });
        }
    } finally {
        setRefreshState(false);
    }
}

// Distinct wording for the main "current weather" condition line (id="weatherDesc"):
// plain rain states use "Yomg'ir" / "Kuchli yomg'ir" (not the list-style "Yomg'irli"),
// and thunder / snow / strong-wind override the generic code-based description when they apply.
function getMainConditionDesc(code, lang, windKmh, precipAmount, currentPrecipMm) {
    const l = dict[lang];
    const isThunder = code >= 95 && code <= 99;
    if (isThunder) {
        const hasRain = (typeof precipAmount === 'number' && precipAmount > 0) || (typeof currentPrecipMm === 'number' && currentPrecipMm > 0);
        return hasRain ? l.mainCondThunderRain : l.mainCondThunder;
    }
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return l.mainCondSnow;
    if ([65, 67, 82].includes(code) || (typeof currentPrecipMm === 'number' && currentPrecipMm >= 7.6)) return l.mainRainHeavy;
    if ([63, 66, 81, 53].includes(code) || (typeof currentPrecipMm === 'number' && currentPrecipMm >= 2.5)) return l.mainRainNormal;
    if ([51, 55, 56, 57, 61, 80].includes(code) || (typeof currentPrecipMm === 'number' && currentPrecipMm > 0)) return l.mainRainLight;
    const isPlainSky = code >= 0 && code <= 3;
    if (isPlainSky && typeof windKmh === 'number' && windKmh > STRONG_WIND_THRESHOLD_KMH) return l.mainCondWind;
    return getWeatherDesc(code, lang);
}

function applyWeatherData(data, realAqi, formattedName, fetchedAt, realPm10) {
        globalWeatherData = data;
        globalRealAqi = (typeof realAqi === 'number') ? realAqi : null;
        // Every "now" calculation below uses THIS city's UTC offset, not the phone's.
        globalUtcOffsetSeconds = (typeof data.utc_offset_seconds === 'number') ? data.utc_offset_seconds : 0;
        document.getElementById('navCity').textContent = formattedName;
        document.getElementById('mainCityName').textContent = formattedName;
        
        let currentTemp = Math.round(data.current.temperature_2m);
        let feelsTemp = Math.round(data.current.apparent_temperature);
        let currentCode = data.current.weather_code;
        let currentWindKmh = data.current.wind_speed_10m;
        let currentPrecip = data.current.precipitation || 0;
        let currentHourIdxForAlerts = getCityCurrentHour();
        let currentUvNow = (typeof data.current.uv_index === 'number') ? data.current.uv_index : data.daily.uv_index_max[0];
        let currentVisKm = data.hourly.visibility ? (data.hourly.visibility[currentHourIdxForAlerts] / 1000) : null;

        // --- Extreme weather detection (real values drive every state; nothing is hardcoded) ---
        const isThunder = [95, 96, 99].includes(currentCode);
        const isHeavySnow = [75, 86].includes(currentCode);
        const isLightSnow = [71, 73, 77, 85].includes(currentCode);
        const isHeavyRain = [65, 67, 82].includes(currentCode) || currentPrecip >= 7.6;
        const isModerateRain = [63, 66, 81, 53].includes(currentCode) || (currentPrecip >= 2.5 && currentPrecip < 7.6);
        const isLightRain = [51, 55, 56, 57, 61, 80].includes(currentCode) || (currentPrecip > 0 && currentPrecip < 2.5);
        const isFogNow = currentCode === 45 || currentCode === 48;
        const isStrongWindNow = currentWindKmh > STRONG_WIND_THRESHOLD_KMH;
        const isVeryLowVis = currentVisKm !== null && currentVisKm < 1;
        const isLowVis = currentVisKm !== null && currentVisKm < 5 && !isVeryLowVis;

        // Ordered by priority per the app's severity ranking (highest first). Badges rotate
        // through the extreme-alert pill, so this order controls which one is shown first.
        let activeAlerts = [];
        if (isThunder) activeAlerts.push(currentPrecip > 0 ? dict[config.lang].extremeStorm : dict[config.lang].extremeStorm);
        if (isHeavyRain) activeAlerts.push(dict[config.lang].extremeRain);
        if (isStrongWindNow) activeAlerts.push(dict[config.lang].extremeWind);
        if (isVeryLowVis) activeAlerts.push(dict[config.lang].condVeryLowVis);
        if (currentTemp >= 38) activeAlerts.push(dict[config.lang].tempVeryHot);
        if (currentTemp <= -10) activeAlerts.push(dict[config.lang].tempVeryCold);
        if (isModerateRain) activeAlerts.push(dict[config.lang].moderateRain);
        else if (isLightRain) activeAlerts.push(dict[config.lang].lightRain);
        if (currentTemp >= 35 && currentTemp < 38) activeAlerts.push(dict[config.lang].tempHot);
        if (currentTemp > -10 && currentTemp <= 5) activeAlerts.push(dict[config.lang].tempCold);
        if (currentUvNow >= 8) activeAlerts.push(dict[config.lang].condHighUV);
        if (typeof realAqi === 'number' && realAqi > 150) activeAlerts.push(dict[config.lang].condBadAQI);
        else if (typeof realAqi === 'number' && realAqi > 100) activeAlerts.push(dict[config.lang].condBadAQI);
        if (currentTemp <= -15) activeAlerts.push(dict[config.lang].extremeFrost);
        if (isHeavySnow || isLightSnow) activeAlerts.push(dict[config.lang].extremeSnow);
        if (isFogNow) activeAlerts.push(dict[config.lang].condFog);
        if (isLowVis) activeAlerts.push(dict[config.lang].condLowVis);

        setActiveAlerts(activeAlerts);
        
        startWeatherAnimation(data.current.weather_code, data.current.is_day === 1);
        
        let displayTemp = currentTemp;
        let displayFeels = feelsTemp;
        if(config.temp === 'F') {
            displayTemp = Math.round((currentTemp * 9/5) + 32);
            displayFeels = Math.round((feelsTemp * 9/5) + 32);
        }
        
        document.getElementById('mainTemp').textContent = `${displayTemp}°`;
        document.getElementById('valFeels').textContent = `${displayFeels}°`;
        document.getElementById('weatherDesc').textContent = getMainConditionDesc(data.current.weather_code, config.lang, currentWindKmh, currentPrecip, currentPrecip);
        
        let currentHourIdx = getCityCurrentHour();
        let currentRainProb = data.hourly.precipitation_probability[currentHourIdx];
        let currentRainMm = data.hourly.precipitation[currentHourIdx];
        if (currentRainProb > 0) {
            document.getElementById('mainPrecip').textContent = `💧 ${currentRainProb}% (${currentRainMm} mm)`;
        } else {
            document.getElementById('mainPrecip').textContent = '';
        }
        
        let uvVal = (typeof data.current.uv_index === 'number') ? data.current.uv_index : data.daily.uv_index_max[0];
        document.getElementById('valUv').textContent = uvVal.toFixed(1);
        let uvLabel, uvLevel;
        if (uvVal < 3) { uvLabel = dict[config.lang].low; uvLevel = 'good'; }
        else if (uvVal < 6) { uvLabel = dict[config.lang].moderate; uvLevel = 'normal'; }
        else if (uvVal < 8) { uvLabel = dict[config.lang].high; uvLevel = 'bad'; }
        else if (uvVal < 11) { uvLabel = dict[config.lang].uvVeryHigh; uvLevel = 'bad'; }
        else { uvLabel = dict[config.lang].uvExtreme; uvLevel = 'bad'; }
        setCardSub('subUv', uvLabel, uvLevel);
        
        document.getElementById('valHumidity').textContent = `${data.current.relative_humidity_2m}%`;
        
        let dewPoint = Math.round(data.hourly.dew_point_2m[currentHourIdx]);
        if(config.temp === 'F') dewPoint = Math.round((dewPoint * 9/5) + 32);
        document.getElementById('valDew').textContent = `${dict[config.lang].lblDew} ${dewPoint}°`;

        if (typeof data.current.wind_direction_10m === 'number') {
            document.getElementById('valWindDir').textContent = `${dict[config.lang].windDirLabel}: ${degToCompass(data.current.wind_direction_10m, config.lang)}`;
        }
        
        if (realAqi !== null) {
            const aqiVal = Math.round(realAqi);
            let aqiLabel, aqiLevel;
            if (aqiVal <= 50) { aqiLabel = dict[config.lang].aqi_good; aqiLevel = 'good'; }
            else if (aqiVal <= 100) { aqiLabel = dict[config.lang].aqi_moderate; aqiLevel = 'normal'; }
            else if (aqiVal <= 150) { aqiLabel = dict[config.lang].aqi_sensitive; aqiLevel = 'bad'; }
            else if (aqiVal <= 200) { aqiLabel = dict[config.lang].aqi_unhealthy; aqiLevel = 'bad'; }
            else if (aqiVal <= 300) { aqiLabel = dict[config.lang].aqi_veryUnhealthy; aqiLevel = 'bad'; }
            else { aqiLabel = dict[config.lang].aqi_hazardous; aqiLevel = 'bad'; }
            document.getElementById('valAqi').textContent = aqiVal;
            setCardSub('subAqi', aqiLabel, aqiLevel);
        } else {
            document.getElementById('valAqi').textContent = '--';
            document.getElementById('subAqi').innerHTML = '';
        }
        
        // wind_speed_unit=kmh above guarantees data.current.wind_speed_10m is already km/h
        let windSpeedKmhRaw = data.current.wind_speed_10m;
        let windSpeed = windSpeedKmhRaw;
        if(config.wind === 'm/s') windSpeed = (windSpeed / 3.6).toFixed(1);
        else windSpeed = windSpeed.toFixed(1);
        let windUnitLabel = config.wind === 'm/s' ? 'm/s' : 'km/h';
        document.getElementById('valWind').textContent = `${windSpeed} ${windUnitLabel}`;
        document.getElementById('valWindMini').textContent = `${windSpeed} ${windUnitLabel}`;
        
        let pressureVal = Math.round(data.current.surface_pressure);
        document.getElementById('valPressure').textContent = `${pressureVal} hPa`;
        let pressureLabel, pressureLevel;
        if (pressureVal < 1000) { pressureLabel = dict[config.lang].low; pressureLevel = 'bad'; }
        else if (pressureVal <= 1012) { pressureLabel = dict[config.lang].pressureSlightlyLow; pressureLevel = 'normal'; }
        else if (pressureVal <= 1025) { pressureLabel = dict[config.lang].normal; pressureLevel = 'good'; }
        else if (pressureVal <= 1035) { pressureLabel = dict[config.lang].pressureSlightlyHigh; pressureLevel = 'normal'; }
        else { pressureLabel = dict[config.lang].high; pressureLevel = 'bad'; }
        setCardSub('subPressure', pressureLabel, pressureLevel);

        let rawVisibilityKm = data.hourly.visibility ? (data.hourly.visibility[currentHourIdx] / 1000) : 10;
        const VIS_CAP_KM = 20; // realistic naked-eye visibility ceiling; models can report much higher values that aren't meaningful to a person
        let visibilityValDisplay = Math.min(rawVisibilityKm, VIS_CAP_KM).toFixed(1);
        document.getElementById('valVisibility').textContent = rawVisibilityKm > VIS_CAP_KM ? `${VIS_CAP_KM}+ km` : `${visibilityValDisplay} km`;

        // 5-tier visibility status: Excellent(>=20) / Good(10-19.9) / Satisfactory(5-9.9) / Limited(1-4.9) / Very low(<1)
        let visLabel, visLevel;
        if (rawVisibilityKm >= 20) { visLabel = dict[config.lang].visExcellent; visLevel = 'good'; }
        else if (rawVisibilityKm >= 10) { visLabel = dict[config.lang].visGood; visLevel = 'good'; }
        else if (rawVisibilityKm >= 5) { visLabel = dict[config.lang].visSatisfactory; visLevel = 'normal'; }
        else if (rawVisibilityKm >= 1) { visLabel = dict[config.lang].visLimited; visLevel = 'bad'; }
        else { visLabel = dict[config.lang].visVeryLow; visLevel = 'bad'; }
        setCardSub('subVisibility', visLabel, visLevel);

        let sunriseTime = data.daily.sunrise[0].split("T")[1].substring(0, 5);
        let sunsetTime = data.daily.sunset[0].split("T")[1].substring(0, 5);
        document.getElementById('valSunrise').textContent = sunriseTime;
        document.getElementById('valSunset').textContent = sunsetTime;
        
        renderHourly(data.hourly, data.daily, data.current.is_day === 0);
        renderWeekly(data.daily, data.hourly);
        renderActivities(data);
        renderWeeklyWarningCard(data.daily, data.hourly);
        document.getElementById('cityInput').value = '';

        lastUpdated = fetchedAt instanceof Date ? fetchedAt : new Date();
        updateLastUpdatedLabel();
}

function renderActivities(data) {
    const container = document.getElementById('activityContainer');
    container.innerHTML = '';
    let temp = data.current.temperature_2m;
    let uv = data.daily.uv_index_max[0];
    let wind = data.current.wind_speed_10m;
    
    let act1Status = (temp > 38 || uv > 8) ? 'bad' : (temp > 30 ? 'normal' : 'good');
    let act2Status = (temp > 40) ? 'bad' : (temp > 35 ? 'normal' : 'good');
    let act3Status = (wind > 25 || temp > 37) ? 'bad' : (temp > 32 ? 'normal' : 'good');
    let act4Status = (temp > 35 || uv > 7) ? 'bad' : (temp > 28 ? 'normal' : 'good');
    
    let currentHour = getCityCurrentHour();
    let next3hRain = false;
    for(let i = currentHour + 1; i <= currentHour + 3; i++) {
        if(data.hourly.precipitation_probability[i] > 30) next3hRain = true;
    }
    let act5Status = next3hRain ? 'bad' : 'good';
    
    let statuses = { good: dict[config.lang].good, normal: dict[config.lang].normal, bad: dict[config.lang].bad };
    
    let items = [
        { icon: "🚶", label: dict[config.lang].act1, status: act1Status },
        { icon: "🌿", label: dict[config.lang].act2, status: act2Status },
        { icon: "🚴", label: dict[config.lang].act3, status: act3Status },
        { icon: "🏃", label: dict[config.lang].act4, status: act4Status },
        { icon: "⏳", label: dict[config.lang].act5, status: act5Status }
    ];

    items.forEach(item => {
        container.innerHTML += `
            <div class="activity-item fade-in-card">
                <span class="activity-icon">${item.icon}</span>
                <span class="activity-name">${item.label}</span>
                <span class="activity-status-badge status-${item.status}">${statuses[item.status]}</span>
            </div>
        `;
    });
}

function pickVariant(pool, key) {
    if (!pool || pool.length === 0) return '';
    if (pool.length === 1) return pool[0];
    const storageKey = `weatherx_variant_${key}`;
    let lastIdx = -1;
    try { lastIdx = parseInt(sessionStorage.getItem(storageKey), 10); } catch (e) { /* ignore */ }
    let idx;
    do {
        idx = Math.floor(Math.random() * pool.length);
    } while (idx === lastIdx && pool.length > 1);
    try { sessionStorage.setItem(storageKey, idx); } catch (e) { /* ignore */ }
    return pool[idx];
}

function getTimeOfDay(hour) {
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'midday';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

function joinWithAnd(arr, andWord) {
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]} ${andWord} ${arr[1]}`;
    return `${arr.slice(0, -1).join(', ')} ${andWord} ${arr[arr.length - 1]}`;
}

function buildWeeklyWarnings(dailyData, hourlyData, lang) {
    const days = 7;
    const dayLabel = (i) => {
        if (i === 0) return dict[lang].today;
        const locale = lang === 'uz' ? 'uz-UZ' : (lang === 'ru' ? 'ru-RU' : 'en-US');
        let s = parseApiDateUTC(dailyData.time[i]).toLocaleDateString(locale, { weekday: 'long', timeZone: 'UTC' });
        return s.charAt(0).toUpperCase() + s.slice(1);
    };
    const weekdayNum = (i) => parseApiDateUTC(dailyData.time[i]).getUTCDay(); // 0=Sun ... 6=Sat

    const avgVisibilityForDay = (i) => {
        if (!hourlyData || !hourlyData.visibility) return null;
        const start = i * 24, end = start + 24;
        const slice = hourlyData.visibility.slice(start, end).filter(v => typeof v === 'number');
        if (slice.length === 0) return null;
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    };

    // Rain and strong-wind on the SAME day get merged into one combined "🌧💨" sentence,
    // so we detect that overlap first and route those days into a dedicated condition.
    // Light/drizzle-only codes are deliberately excluded from weekly warnings altogether —
    // the weekly warnings list should only ever mention "yomg'ir" (moderate) or "kuchli yomg'ir"
    // (heavy), never "yengil yomg'ir".
    const LIGHT_RAIN_ONLY_CODES = [51, 55, 56, 57, 61, 80]; // drizzle / slight rain / light showers
    const MODERATE_RAIN_CODES = [53, 63, 66, 81];
    const isRainDay = i => [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(dailyData.weather_code[i]) || (dailyData.precipitation_sum && dailyData.precipitation_sum[i] > 0);
    const isWindDay = i => dailyData.wind_speed_10m_max && dailyData.wind_speed_10m_max[i] > STRONG_WIND_THRESHOLD_KMH;
    const isStormDay = i => [95, 96, 99].includes(dailyData.weather_code[i]);

    const condDefs = [
        { key: 'stormRain', icon: '⛈️', severity: 'danger', check: i => isStormDay(i) && dailyData.precipitation_sum && dailyData.precipitation_sum[i] > 0, label: dict[lang].weekWarnStormRain },
        { key: 'stormDry', icon: '🌩️', severity: 'danger', check: i => isStormDay(i) && !(dailyData.precipitation_sum && dailyData.precipitation_sum[i] > 0), label: dict[lang].weekWarnStormDry },
        { key: 'rainWind', icon: '🌧💨', severity: 'serious', check: i => !isStormDay(i) && isRainDay(i) && isWindDay(i), label: dict[lang].weekWarnRainWind },
        { key: 'heavyRain', icon: '🌧️', severity: 'serious', check: i => !isStormDay(i) && !isWindDay(i) && ([65, 67, 82].includes(dailyData.weather_code[i]) || (dailyData.precipitation_sum && dailyData.precipitation_sum[i] >= 20)), label: dict[lang].weekWarnRain },
        { key: 'rainNormal', icon: '🌧️', severity: 'info', check: i => !isStormDay(i) && !isWindDay(i) && MODERATE_RAIN_CODES.includes(dailyData.weather_code[i]), label: dict[lang].weekWarnRainNormal },
        { key: 'heat', icon: '☀️', severity: 'danger', check: i => dailyData.temperature_2m_max[i] >= 38, label: dict[lang].weekWarnHeat },
        { key: 'cold', icon: '🥶', severity: 'danger', check: i => dailyData.temperature_2m_min[i] <= 0, label: dict[lang].weekWarnCold },
        { key: 'wind', icon: '💨', severity: 'warning', check: i => !isRainDay(i) && isWindDay(i), label: dict[lang].weekWarnWind },
        { key: 'heavySnow', icon: '🌨️', severity: 'serious', check: i => (dailyData.weather_code[i] >= 71 && dailyData.weather_code[i] <= 77) || [85, 86].includes(dailyData.weather_code[i]), label: dict[lang].weekWarnHeavySnow },
        { key: 'frost', icon: '🧊', severity: 'warning', check: i => dailyData.temperature_2m_min[i] > 0 && dailyData.temperature_2m_min[i] <= 3, label: dict[lang].weekWarnFrost },
        { key: 'fog', icon: '🌫️', severity: 'warning', check: i => [45, 48].includes(dailyData.weather_code[i]), label: dict[lang].weekWarnFog },
        { key: 'highUV', icon: '☀️', severity: 'warning', check: i => dailyData.uv_index_max[i] >= 8, label: dict[lang].weekWarnUV },
        { key: 'lowVis', icon: '👁️', severity: 'warning', check: i => { const v = avgVisibilityForDay(i); return v !== null && v < 3000; }, label: dict[lang].weekWarnLowVis },
        { key: 'tempSwing', icon: '🌡️', severity: 'info', check: i => i > 0 && Math.abs(dailyData.temperature_2m_max[i] - dailyData.temperature_2m_max[i - 1]) >= 8, label: dict[lang].weekWarnTempSwing }
    ];

    const matrix = condDefs.map(def => Array.from({ length: days }, (_, i) => def.check(i)));
    const covered = condDefs.map(() => Array(days).fill(false));
    const ranges = [];
    let rawEventCount = 0;
    matrix.forEach(row => row.forEach(v => { if (v) rawEventCount++; }));

    // Step 1: find consecutive runs (2+ days) of the SAME condition type only — different event types are never merged
    condDefs.forEach((def, ci) => {
        let i = 0;
        while (i < days) {
            if (matrix[ci][i]) {
                let j = i;
                while (j + 1 < days && matrix[ci][j + 1]) j++;
                if (j > i) {
                    ranges.push({ ci, start: i, end: j });
                    for (let k = i; k <= j; k++) covered[ci][k] = true;
                }
                i = j + 1;
            } else {
                i++;
            }
        }
    });

    ranges.sort((a, b) => a.start - b.start);
    const items = ranges.map(r => {
        const def = condDefs[r.ci];
        const span = r.end - r.start; // 1 = two days, 2+ = three or more days
        const isWeekend = (span === 1) && weekdayNum(r.start) === 6 && weekdayNum(r.end) === 0;
        let text;
        if (isWeekend) {
            text = dict[lang].weekendTemplate.replace('%CONDS%', def.label);
        } else if (span === 1) {
            text = dict[lang].weekTwoDayTemplate.replace('%DAY1%', dayLabel(r.start)).replace('%DAY2%', dayLabel(r.end)).replace('%CONDS%', def.label);
        } else {
            text = dict[lang].weekRangeTemplate.replace('%START%', dayLabel(r.start)).replace('%END%', dayLabel(r.end)).replace('%CONDS%', def.label);
        }
        return { icon: def.icon, severity: def.severity, text };
    });

    // Step 2: any remaining single, unmerged (day,type) cells each get their own standalone message — never combined with a different type
    for (let i = 0; i < days; i++) {
        condDefs.forEach((def, ci) => {
            if (matrix[ci][i] && !covered[ci][i]) {
                const text = dict[lang].weekTemplate.replace('%DAY%', dayLabel(i)).replace('%CONDS%', def.label);
                items.push({ icon: def.icon, severity: def.severity, text, sortKey: i });
            }
        });
    }
    items.sort((a, b) => (a.sortKey === undefined ? -1 : a.sortKey) - (b.sortKey === undefined ? -1 : b.sortKey));

    return { count: rawEventCount, items };
}

function buildDayAdviceCards(dayLabel, maxTemp, windMax, uvNow, precipProb, code, activeL, isNight, realAqi, visibilityKm) {
    const isStorm = [95, 96, 99].includes(code);
    const isFog = code === 45 || code === 48;
    const isSnowCode = (code >= 71 && code <= 77) || code === 85 || code === 86 || code === 66 || code === 67;
    const isHeavyRainCode = [65, 67, 82].includes(code);
    const isRainCode = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
    const isBadAQI = typeof realAqi === 'number' && realAqi > 100;
    const isLowVis = typeof visibilityKm === 'number' && visibilityKm < 3;
    const isStrongWind = windMax > STRONG_WIND_THRESHOLD_KMH;

    // Clothing (6 tiers by temperature; the "very hot" message drops all sun references at night):
    //  <= -6      : Juda sovuq
    //  -5 .. 7    : Sovuq
    //   8 .. 17   : Salqin
    //  18 .. 29   : qulay / mo'tadil (never says "issiq"/"sovuq")
    //  30 .. 37   : Issiq
    //  >= 38      : Juda issiq
    let clothMessage;
    if (maxTemp <= -6) clothMessage = activeL.clothVeryCold;
    else if (maxTemp <= 7) clothMessage = activeL.clothCold;
    else if (maxTemp <= 17) clothMessage = activeL.clothCool;
    else if (maxTemp < 30) clothMessage = activeL.clothMild;
    else if (maxTemp <= 37) clothMessage = activeL.clothHot;
    else clothMessage = isNight ? activeL.clothVeryHotNight : activeL.clothVeryHot;

    // Umbrella (5 tiers: snow takes priority, then rain probability)
    let umbrellaMessage;
    if (isSnowCode) umbrellaMessage = activeL.umbrellaSnow;
    else if (isHeavyRainCode || precipProb >= 70) umbrellaMessage = activeL.umbrellaHeavy;
    else if (precipProb >= 40) umbrellaMessage = activeL.umbrellaYes;
    else if (precipProb >= 15) umbrellaMessage = activeL.umbrellaMaybe;
    else umbrellaMessage = activeL.umbrellaNo;

    // Driving (priority: storm > low visibility > strong wind > rain > good — never says "comfortable" over a real hazard)
    let carMessage;
    if (isStorm || isHeavyRainCode) carMessage = activeL.carStorm;
    else if (isLowVis || isFog) carMessage = activeL.carLowVis;
    else if (isStrongWind) carMessage = activeL.carWind;
    else if (isRainCode) carMessage = activeL.carRain;
    else carMessage = activeL.carGood;

    // Aviation (priority: storm > low visibility > strong wind > light wind > good)
    let avMessage;
    if (isStorm) avMessage = activeL.avStorm;
    else if (isLowVis || isFog) avMessage = activeL.avLowVis;
    else if (isStrongWind) avMessage = activeL.avStrongWind;
    else if (windMax >= 20) avMessage = activeL.avLightWind;
    else avMessage = activeL.avGood;

    // UV (5 tiers, but at night there's simply no UV exposure — no sun-protection wording ever appears then)
    let uvMessage;
    if (isNight) uvMessage = activeL.uvNightMsg;
    else if (uvNow < 3) uvMessage = activeL.uvLowMsg;
    else if (uvNow < 6) uvMessage = activeL.uvModMsg;
    else if (uvNow < 8) uvMessage = activeL.uvHighMsg;
    else if (uvNow < 11) uvMessage = activeL.uvVeryHighMsg;
    else uvMessage = activeL.uvExtremeMsg;

    // Sport: temperature tiers mirror the clothing tiers (very cold / hot / very hot are hazards),
    // then follows the overall hazard priority (storm > heavy rain > strong wind > bad AQI >
    // extreme temp > low visibility > high UV > rain > hot > good), so "good time for sport"
    // can never appear alongside any of those hazards — each gets its own specific caution.
    let sportMessage;
    if (isStorm) sportMessage = activeL.sportBad;
    else if (isHeavyRainCode) sportMessage = activeL.sportRain;
    else if (isStrongWind) sportMessage = activeL.sportWind;
    else if (isBadAQI) sportMessage = activeL.sportAQIBad;
    else if (maxTemp <= -6 || maxTemp >= 38) sportMessage = activeL.sportBad;
    else if (isLowVis) sportMessage = activeL.sportBad;
    else if (!isNight && uvNow >= 8) sportMessage = activeL.sportUVBad;
    else if (isRainCode) sportMessage = activeL.sportRain;
    else if (maxTemp >= 30) sportMessage = activeL.sportHot;
    else sportMessage = activeL.sportGood;

    return `
        <div style="margin: 16px 0 10px 0; font-size: 12px; color: #e5e7eb; font-weight: bold;">${dayLabel}</div>
        <div class="advice-card fade-in-card"><h5>👕 ${activeL.adviceClothTitle}</h5><p>${clothMessage}</p></div>
        <div class="advice-card fade-in-card"><h5>☂️ ${activeL.adviceUmbrellaTitle}</h5><p>${umbrellaMessage}</p></div>
        <div class="advice-card fade-in-card"><h5>🚗 ${activeL.carT}</h5><p>${carMessage}</p></div>
        <div class="advice-card fade-in-card"><h5>✈️ ${activeL.avT}</h5><p>${avMessage}</p></div>
        <div class="advice-card fade-in-card"><h5>☀️ ${activeL.adviceUvTitle}</h5><p>${uvMessage}</p></div>
        <div class="advice-card fade-in-card"><h5>🏃 ${activeL.adviceSportTitle}</h5><p>${sportMessage}</p></div>
    `;
}

function renderWeeklyWarningCard(dailyData, hourlyData) {
    const activeL = dict[config.lang];
    const result = buildWeeklyWarnings(dailyData, hourlyData, config.lang);
    const summaryEl = document.getElementById('weeklyWarningSummary');
    const subEl = document.getElementById('weeklyWarningSub');
    const btnEl = document.getElementById('weeklyDetailsBtn');
    const modalContent = document.getElementById('weeklyModalContent');

    if (result.count === 0) {
        summaryEl.textContent = activeL.weeklyNoneMsg;
        subEl.textContent = activeL.weeklyNoneSub;
        btnEl.style.display = 'none';
        modalContent.innerHTML = `<div class="advice-card sev-info"><p>${activeL.weeklyNoneMsg}</p><p style="margin-top:4px;">${activeL.weeklyNoneSub}</p></div>`;
        return;
    }

    summaryEl.textContent = activeL.weeklyCardCountTemplate.replace('%N%', result.count);
    subEl.textContent = '';
    btnEl.style.display = 'inline-block';

    modalContent.innerHTML = result.items.map(item => `
        <div class="advice-card sev-${item.severity} fade-in-card" style="display:flex; align-items:center;">
            <span class="sev-dot"></span>
            <p style="margin:0;">${item.icon} ${item.text}</p>
        </div>
    `).join('');
}

function generateSmartAdvice() {
    const content = document.getElementById('adviceContent');
    if (!globalWeatherData) return;
    const activeL = dict[config.lang];
    const daily = globalWeatherData.daily;

    const todayUvNow = (typeof globalWeatherData.current.uv_index === 'number') ? globalWeatherData.current.uv_index : daily.uv_index_max[0];
    const todayIsNight = globalWeatherData.current.is_day === 0;
    const currentHourIdxForAdvice = getCityCurrentHour();
    const todayVisKm = globalWeatherData.hourly.visibility ? (globalWeatherData.hourly.visibility[currentHourIdxForAdvice] / 1000) : 10;
    const todayHtml = buildDayAdviceCards(
        activeL.dayToday,
        globalWeatherData.current.temperature_2m,
        Math.max(globalWeatherData.current.wind_speed_10m, daily.wind_speed_10m_max ? daily.wind_speed_10m_max[0] : 0),
        todayUvNow,
        daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0,
        globalWeatherData.current.weather_code,
        activeL,
        todayIsNight,
        globalRealAqi,
        todayVisKm
    );

    const tomorrowHtml = buildDayAdviceCards(
        activeL.dayTomorrow,
        daily.temperature_2m_max[1],
        daily.wind_speed_10m_max ? daily.wind_speed_10m_max[1] : 0,
        daily.uv_index_max[1],
        daily.precipitation_probability_max ? daily.precipitation_probability_max[1] : 0,
        daily.weather_code[1],
        activeL,
        false,
        globalRealAqi,
        10
    );

    content.innerHTML = todayHtml + tomorrowHtml;
}

function renderHourly(hourlyData, dailyData, fallbackIsNight) {
    const container = document.getElementById('hourlyContainer');
    container.innerHTML = '';
    let currentHourIndex = getCityCurrentHour();
    
    for (let i = currentHourIndex; i < currentHourIndex + 24; i++) {
        let hourValue = i % 24;
        let timeStr = hourValue.toString().padStart(2, '0') + ':00';
        let isNight = isNightAtTime(hourlyData.time ? hourlyData.time[i] : null, dailyData, fallbackIsNight);
        let code = hourlyData.weather_code[i];
        let hourWindKmh = hourlyData.wind_speed_10m ? hourlyData.wind_speed_10m[i] : undefined;
        let hourPrecip = hourlyData.precipitation ? hourlyData.precipitation[i] : undefined;
        let emoji = getWeatherEmoji(code, isNight, hourWindKmh, hourPrecip);
        
        let temp = Math.round(hourlyData.temperature_2m[i]);
        if(config.temp === 'F') temp = Math.round((temp * 9/5) + 32);
        
        let rainProb = hourlyData.precipitation_probability[i];
        let rainMm = hourlyData.precipitation[i];
        let rainBadge = rainProb > 0 ? `<span class="rain-chance-badge">💧${rainProb}%<br>${rainMm}mm</span>` : '';
        
        container.innerHTML += `
            <div class="hourly-item">
                <div style="opacity: 0.6; margin-bottom:4px;">${timeStr}</div>
                <div style="font-size: 20px; margin-bottom:4px;">${emoji}</div>
                <strong>${temp}°</strong>
                ${rainBadge}
            </div>
        `;
    }
}

function weatherCodeSeverityRank(code) {
    if (code >= 95 && code <= 99) return 100;
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 90;
    if ([65, 67, 82].includes(code)) return 85;
    if ([63, 66, 81, 53].includes(code)) return 75;
    if ([51, 55, 56, 57, 61, 80].includes(code)) return 65;
    if (code === 45 || code === 48) return 40;
    if (code === 3) return 20;
    if (code === 1 || code === 2) return 10;
    if (code === 0) return 0;
    return -1;
}

function computeDayNightPeriodConditions(dailyData, hourlyData, dayIndex) {
    const targetDate = dailyData.time[dayIndex];
    const fallbackIsNightForDate = false;
    let dayBest = { code: null, rank: -2 };
    let nightBest = { code: null, rank: -2 };
    let dayWind = 0, nightWind = 0, dayPrecip = 0, nightPrecip = 0;

    if (hourlyData && hourlyData.time && hourlyData.weather_code) {
        for (let h = 0; h < hourlyData.time.length; h++) {
            if (hourlyData.time[h].slice(0, 10) !== targetDate) continue;
            const hCode = hourlyData.weather_code[h];
            const hIsNight = isNightAtTime(hourlyData.time[h], dailyData, fallbackIsNightForDate);
            const hWind = hourlyData.wind_speed_10m ? hourlyData.wind_speed_10m[h] : 0;
            const hPrecip = hourlyData.precipitation ? hourlyData.precipitation[h] : 0;
            const rank = weatherCodeSeverityRank(hCode);

            if (hIsNight) {
                if (rank > nightBest.rank) nightBest = { code: hCode, rank };
                if (hWind > nightWind) nightWind = hWind;
                nightPrecip += hPrecip;
            } else {
                if (rank > dayBest.rank) dayBest = { code: hCode, rank };
                if (hWind > dayWind) dayWind = hWind;
                dayPrecip += hPrecip;
            }
        }
    }

    const fallbackCode = dailyData.weather_code[dayIndex];
    const fallbackWind = dailyData.wind_speed_10m_max ? dailyData.wind_speed_10m_max[dayIndex] : undefined;
    const fallbackPrecip = dailyData.precipitation_sum ? dailyData.precipitation_sum[dayIndex] : undefined;

    return {
        dayCode: dayBest.code !== null ? dayBest.code : fallbackCode,
        dayWind: dayBest.code !== null ? dayWind : fallbackWind,
        dayPrecip: dayBest.code !== null ? dayPrecip : fallbackPrecip,
        nightCode: nightBest.code !== null ? nightBest.code : fallbackCode,
        nightWind: nightBest.code !== null ? nightWind : fallbackWind,
        nightPrecip: nightBest.code !== null ? nightPrecip : fallbackPrecip
    };
}

function renderWeekly(dailyData, hourlyData) {
    const container = document.getElementById('weeklyContainer');
    container.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        let dayName = "";
        if (i === 0) {
            dayName = dict[config.lang].today;
        } else {
            let locale = config.lang === 'uz' ? 'uz-UZ' : (config.lang === 'ru' ? 'ru-RU' : 'en-US');
            dayName = parseApiDateUTC(dailyData.time[i]).toLocaleDateString(locale, { weekday: 'long', timeZone: 'UTC' });
            dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        }
        
        let tempMin = Math.round(dailyData.temperature_2m_min[i]);
        let tempMax = Math.round(dailyData.temperature_2m_max[i]);
        if(config.temp === 'F') {
            tempMin = Math.round((tempMin * 9/5) + 32);
            tempMax = Math.round((tempMax * 9/5) + 32);
        }
        
        let conditions = computeDayNightPeriodConditions(dailyData, hourlyData, i);
        let dayEmoji = getWeatherEmoji(conditions.dayCode, false, conditions.dayWind, conditions.dayPrecip);
        let nightEmoji = getWeatherEmoji(conditions.nightCode, true, conditions.nightWind, conditions.nightPrecip);
        let descText = getWeatherDesc(dailyData.weather_code[i], config.lang);
        
        let rainProb = dailyData.precipitation_probability_max ? dailyData.precipitation_probability_max[i] : 0;
        let precipText = rainProb > 0 ? ` <span style="color:#38bdf8; font-size:11px;">💧 ${rainProb}%</span>` : '';
        
        container.innerHTML += `
            <div class="weekly-row">
                <div class="weekly-day">${dayName}</div>
                <div class="weekly-text">
                    <span class="weekly-desc-line">${descText}</span>
                    ${precipText}
                </div>
                <div class="weekly-emoji-container">
                    <div class="weekly-emoji-sub"><span>${dayEmoji}</span><small>${dict[config.lang].day}</small></div>
                    <div class="weekly-emoji-sub"><span>${nightEmoji}</span><small>${dict[config.lang].night}</small></div>
                </div>
                <div class="weekly-temps">${tempMin}° <strong>${tempMax}°</strong></div>
            </div>
        `;
    }
}

// ============================================================
// APP BOOT SEQUENCE
// ============================================================

try { initSplashScreen(); } catch (e) { console.error('Splash init failed:', e); }

try {
    updateOfflineBadge();
} catch (e) { console.error('Offline badge init failed:', e); }

try {
    document.getElementById(`btn_${config.lang}`).classList.add('active');
    document.getElementById(`btn_${config.temp}`).classList.add('active');
    document.getElementById(`btn_${config.wind === 'm/s' ? 'ms' : 'kmh'}`).classList.add('active');
} catch (e) { console.error('Settings toggle init failed:', e); }

try { initCanvas(); } catch (e) { console.error('Canvas init failed:', e); }
try { renderHistoryTags(); } catch (e) { console.error('History render failed:', e); }

try {
    setAutoLocationUI(getGeoPref().enabled);
    const _geoPref = getGeoPref();
    if (_geoPref.enabled && _geoPref.name) {
        currentCity = _geoPref.name;
    }
} catch (e) { console.error('Geo preference init failed:', e); }

try {
    changeLang(config.lang);
} catch (e) { console.error('Initial weather load failed:', e); }

try { registerNetworkWatchdog(); } catch (e) { console.error('Network watchdog init failed:', e); }

setTimeout(() => { try { prewarmHistoryCache(); } catch (e) { console.error('Cache pre-warm failed:', e); } }, 4000);

setInterval(() => { try { fetchWeatherData(currentCity); } catch (e) { console.error('Auto-refresh failed:', e); } }, 60 * 60 * 1000);

setTimeout(() => {
    try {
        if (!localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
            startTutorial();
        }
    } catch (e) { console.error('Tutorial start failed:', e); }
}, 3300);
