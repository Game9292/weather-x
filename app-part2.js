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
        el.textContent = `${lbl}: ${timeStr}`;
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
            if (longPressTriggered) return; // long-press already handled it, don't also navigate
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
            // Evict the oldest entries first so the cache doesn't grow without bound
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

    // --- STEP 1: instant paint from cache, if we have it, so the user is never staring at a spinner ---
    let paintedFromCache = false;
    if (cached) {
        applyWeatherData(cached.data, cached.realAqi, cached.cityName, new Date(cached.ts), cached.realPm10);
        paintedFromCache = true;
    }

    setRefreshState(true);

    // --- STEP 2: if there's no connection at all, we're done — cache (if any) is already on screen ---
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

    // --- STEP 3: refresh from the network in the background (this is what actually re-renders with live data) ---
    try {
        let lat, lon, formattedName;
        if (presetCoords) {
            lat = presetCoords.lat;
            lon = presetCoords.lon;
            formattedName = presetCoords.name;
        } else if (cached && typeof cached.lat === 'number' && typeof cached.lon === 'number') {
            // Skip the geocoding round-trip entirely for cities we already know — this is the main speed win.
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

        // Air quality is fetched separately; if it fails we fall back gracefully instead of blocking the whole view
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

function applyWeatherData(data, realAqi, formattedName, fetchedAt, realPm10) {
        globalWeatherData = data;
        document.getElementById('navCity').textContent = formattedName;
        document.getElementById('mainCityName').textContent = formattedName;
        
        let currentTemp = Math.round(data.current.temperature_2m);
        let feelsTemp = Math.round(data.current.apparent_temperature);
        let currentCode = data.current.weather_code;
        let currentWindKmh = data.current.wind_speed_10m;
        let currentPrecip = data.current.precipitation || 0;
        let currentHourIdxForAlerts = new Date().getHours();
        let currentUvNow = (typeof data.current.uv_index === 'number') ? data.current.uv_index : data.daily.uv_index_max[0];
        let currentVisKm = data.hourly.visibility ? (data.hourly.visibility[currentHourIdxForAlerts] / 1000) : null;

        // --- Expanded extreme weather detection (priority: thunderstorm > heavy snow > heavy rain > heat/cold > wind > moderate/light rain) ---
        const isThunder = [95, 96, 99].includes(currentCode);
        const isHeavySnow = [75, 86].includes(currentCode);
        const isLightSnow = [71, 73, 77, 85].includes(currentCode);
        const isHeavyRain = [65, 67, 82].includes(currentCode) || currentPrecip >= 7.6;
        const isModerateRain = [63, 66, 81, 53].includes(currentCode) || (currentPrecip >= 2.5 && currentPrecip < 7.6);
        const isLightRain = [51, 55, 56, 57, 61, 80].includes(currentCode) || (currentPrecip > 0 && currentPrecip < 2.5);
        const isFogNow = currentCode === 45 || currentCode === 48;

        let alertBox = document.getElementById('extremeAlert');
        let activeAlerts = [];
        if (isThunder) activeAlerts.push(dict[config.lang].extremeStorm);
        if (isHeavySnow) activeAlerts.push(dict[config.lang].extremeSnow);
        else if (isLightSnow) activeAlerts.push(dict[config.lang].extremeSnow);
        if (isHeavyRain) activeAlerts.push(dict[config.lang].extremeRain);
        else if (isModerateRain) activeAlerts.push(dict[config.lang].moderateRain);
        else if (isLightRain) activeAlerts.push(dict[config.lang].lightRain);

        // Temperature tiers (very cold / cold / cool / hot / very hot) — the comfortable 18–25° band shows no alert
        if (currentTemp <= 0) activeAlerts.push(dict[config.lang].tempVeryCold);
        else if (currentTemp < 10) activeAlerts.push(dict[config.lang].tempCold);
        else if (currentTemp < 18) activeAlerts.push(dict[config.lang].tempCool);
        else if (currentTemp >= 34) activeAlerts.push(dict[config.lang].tempVeryHot);
        else if (currentTemp >= 26) activeAlerts.push(dict[config.lang].tempHot);

        if (currentWindKmh >= 50) activeAlerts.push(dict[config.lang].extremeWind);
        if (isFogNow) activeAlerts.push(dict[config.lang].condFog);
        if (currentVisKm !== null && currentVisKm < 2) activeAlerts.push(dict[config.lang].condLowVis);
        if (currentUvNow >= 6) activeAlerts.push(dict[config.lang].condHighUV);
        if (typeof realAqi === 'number' && realAqi > 100) activeAlerts.push(dict[config.lang].condBadAQI);

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
        document.getElementById('weatherDesc').textContent = getWeatherDesc(data.current.weather_code, config.lang);
        
        let currentHourIdx = new Date().getHours();
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
        let windSpeed = data.current.wind_speed_10m;
        if(config.wind === 'm/s') windSpeed = (windSpeed / 3.6).toFixed(1);
        else windSpeed = windSpeed.toFixed(1);
        let windUnitLabel = config.wind === 'm/s' ? 'm/s' : 'km/h';
        document.getElementById('valWind').textContent = `${windSpeed} ${windUnitLabel}`;
        document.getElementById('valWindMini').textContent = `${windSpeed} ${windUnitLabel}`;
        
        let pressureVal = Math.round(data.current.surface_pressure);
        document.getElementById('valPressure').textContent = `${pressureVal} hPa`;
        document.getElementById('subPressure').textContent = pressureVal > 1013 ? dict[config.lang].high : dict[config.lang].normal;

        let rawVisibilityKm = data.hourly.visibility ? (data.hourly.visibility[currentHourIdx] / 1000) : 10;
        const VIS_CAP_KM = 20; // realistic naked-eye visibility ceiling; models can report much higher values that aren't meaningful to a person
        let visibilityVal = Math.min(rawVisibilityKm, VIS_CAP_KM).toFixed(1);
        document.getElementById('valVisibility').textContent = rawVisibilityKm > VIS_CAP_KM ? `${VIS_CAP_KM}+ km` : `${visibilityVal} km`;
        setCardSub('subVisibility', rawVisibilityKm > 8 ? dict[config.lang].exc : dict[config.lang].lim, rawVisibilityKm > 8 ? 'good' : 'bad');

        let sunriseTime = data.daily.sunrise[0].split("T")[1].substring(0, 5);
        let sunsetTime = data.daily.sunset[0].split("T")[1].substring(0, 5);
        document.getElementById('valSunrise').textContent = sunriseTime;
        document.getElementById('valSunset').textContent = sunsetTime;
        
        renderHourly(data.hourly, data.daily, data.current.is_day === 0);
        renderWeekly(data.daily);
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
    
    // Keyingi 3 soatlik prognoz tahlili
    let currentHour = new Date().getHours();
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

// Picks a random phrase from a pool, avoiding whichever one was shown last time for this exact key
// (so the same sentence doesn't repeat back-to-back). Falls back gracefully for pools of 1.
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
        const dateObj = new Date(dailyData.time[i]);
        const locale = lang === 'uz' ? 'uz-UZ' : (lang === 'ru' ? 'ru-RU' : 'en-US');
        let s = dateObj.toLocaleDateString(locale, { weekday: 'long' });
        return s.charAt(0).toUpperCase() + s.slice(1);
    };
    const weekdayNum = (i) => new Date(dailyData.time[i]).getDay(); // 0=Sun ... 6=Sat

    const avgVisibilityForDay = (i) => {
        if (!hourlyData || !hourlyData.visibility) return null;
        const start = i * 24, end = start + 24;
        const slice = hourlyData.visibility.slice(start, end).filter(v => typeof v === 'number');
        if (slice.length === 0) return null;
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    };

    const condDefs = [
        { key: 'stormRain', icon: '⛈️', severity: 'danger', check: i => [95, 96, 99].includes(dailyData.weather_code[i]) && dailyData.precipitation_sum && dailyData.precipitation_sum[i] > 0, label: dict[lang].weekWarnStormRain },
        { key: 'stormDry', icon: '🌩️', severity: 'danger', check: i => [95, 96, 99].includes(dailyData.weather_code[i]) && !(dailyData.precipitation_sum && dailyData.precipitation_sum[i] > 0), label: dict[lang].weekWarnStormDry },
        { key: 'heavyRain', icon: '🌧️', severity: 'serious', check: i => [65, 67, 82].includes(dailyData.weather_code[i]) || (dailyData.precipitation_sum && dailyData.precipitation_sum[i] >= 20), label: dict[lang].weekWarnRain },
        { key: 'sunnyRain', icon: '🌦️', severity: 'info', check: i => [80, 81].includes(dailyData.weather_code[i]), label: dict[lang].weekWarnSunnyRain },
        { key: 'heat', icon: '☀️', severity: 'danger', check: i => dailyData.temperature_2m_max[i] >= 38, label: dict[lang].weekWarnHeat },
        { key: 'cold', icon: '🥶', severity: 'danger', check: i => dailyData.temperature_2m_min[i] <= 0, label: dict[lang].weekWarnCold },
        { key: 'wind', icon: '💨', severity: 'warning', check: i => dailyData.wind_speed_10m_max && dailyData.wind_speed_10m_max[i] >= 50, label: dict[lang].weekWarnWind },
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
    // keep overall chronological-ish ordering: ranges already sorted by start; append single-day items in day order at the end
    items.sort((a, b) => (a.sortKey === undefined ? -1 : a.sortKey) - (b.sortKey === undefined ? -1 : b.sortKey));

    return { count: rawEventCount, items };
}

function buildDayAdviceCards(dayLabel, maxTemp, windMax, uvNow, precipProb, code, activeL) {
    const isStorm = [95, 96, 99].includes(code);
    const isFog = code === 45 || code === 48;
    const isSnowCode = (code >= 71 && code <= 77) || code === 85 || code === 86 || code === 66 || code === 67;
    const isHeavyRainCode = [65, 67, 82].includes(code);
    const isRainCode = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);

    // Clothing (5 tiers by temperature)
    let clothMessage;
    if (maxTemp <= 0) clothMessage = activeL.clothVeryCold;
    else if (maxTemp < 15) clothMessage = activeL.clothCool;
    else if (maxTemp < 26) clothMessage = activeL.clothMild;
    else if (maxTemp < 34) clothMessage = activeL.clothHot;
    else clothMessage = activeL.clothVeryHot;

    // Umbrella (5 tiers: snow takes priority, then rain probability)
    let umbrellaMessage;
    if (isSnowCode) umbrellaMessage = activeL.umbrellaSnow;
    else if (isHeavyRainCode || precipProb >= 70) umbrellaMessage = activeL.umbrellaHeavy;
    else if (precipProb >= 40) umbrellaMessage = activeL.umbrellaYes;
    else if (precipProb >= 15) umbrellaMessage = activeL.umbrellaMaybe;
    else umbrellaMessage = activeL.umbrellaNo;

    // Driving (priority: storm > fog > strong wind > rain > good)
    let carMessage;
    if (isStorm || isHeavyRainCode) carMessage = activeL.carStorm;
    else if (isFog) carMessage = activeL.carFog;
    else if (windMax >= 50) carMessage = activeL.carWind;
    else if (isRainCode) carMessage = activeL.carRain;
    else carMessage = activeL.carGood;

    // Aviation (priority: storm > fog > strong wind > light wind > good)
    let avMessage;
    if (isStorm) avMessage = activeL.avStorm;
    else if (isFog) avMessage = activeL.avFog;
    else if (windMax > 40) avMessage = activeL.avStrongWind;
    else if (windMax >= 20) avMessage = activeL.avLightWind;
    else avMessage = activeL.avGood;

    // UV (5 tiers, using the live/current value so evening or nighttime never shows midday-only wording)
    let uvMessage;
    if (uvNow < 3) uvMessage = activeL.uvLowMsg;
    else if (uvNow < 6) uvMessage = activeL.uvModMsg;
    else if (uvNow < 8) uvMessage = activeL.uvHighMsg;
    else if (uvNow < 11) uvMessage = activeL.uvVeryHighMsg;
    else uvMessage = activeL.uvExtremeMsg;

    // Sport (priority: storm/very cold > rain > strong wind > hot > good)
    let sportMessage;
    if (isStorm || maxTemp <= 0) sportMessage = activeL.sportBad;
    else if (isRainCode) sportMessage = activeL.sportRain;
    else if (windMax >= 40) sportMessage = activeL.sportWind;
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

    // Today: blend live "current" readings with today's daily extremes
    const todayUvNow = (typeof globalWeatherData.current.uv_index === 'number') ? globalWeatherData.current.uv_index : daily.uv_index_max[0];
    const todayHtml = buildDayAdviceCards(
        activeL.dayToday,
        Math.max(globalWeatherData.current.temperature_2m, daily.temperature_2m_max[0]),
        Math.max(globalWeatherData.current.wind_speed_10m, daily.wind_speed_10m_max ? daily.wind_speed_10m_max[0] : 0),
        todayUvNow,
        daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0,
        globalWeatherData.current.weather_code,
        activeL
    );

    // Tomorrow: purely forecast-based
    const tomorrowHtml = buildDayAdviceCards(
        activeL.dayTomorrow,
        daily.temperature_2m_max[1],
        daily.wind_speed_10m_max ? daily.wind_speed_10m_max[1] : 0,
        daily.uv_index_max[1],
        daily.precipitation_probability_max ? daily.precipitation_probability_max[1] : 0,
        daily.weather_code[1],
        activeL
    );

    content.innerHTML = todayHtml + tomorrowHtml;
}

function renderHourly(hourlyData, dailyData, fallbackIsNight) {
    const container = document.getElementById('hourlyContainer');
    container.innerHTML = '';
    let currentHourIndex = new Date().getHours();
    
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

function renderWeekly(dailyData) {
    const container = document.getElementById('weeklyContainer');
    container.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        let dayName = "";
        if (i === 0) {
            dayName = dict[config.lang].today;
        } else {
            let dateObj = new Date(dailyData.time[i]);
            let locale = config.lang === 'uz' ? 'uz-UZ' : (config.lang === 'ru' ? 'ru-RU' : 'en-US');
            dayName = dateObj.toLocaleDateString(locale, { weekday: 'long' });
            dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        }
        
        let tempMin = Math.round(dailyData.temperature_2m_min[i]);
        let tempMax = Math.round(dailyData.temperature_2m_max[i]);
        if(config.temp === 'F') {
            tempMin = Math.round((tempMin * 9/5) + 32);
            tempMax = Math.round((tempMax * 9/5) + 32);
        }
        
        let code = dailyData.weather_code[i];
        let dayWindKmh = dailyData.wind_speed_10m_max ? dailyData.wind_speed_10m_max[i] : undefined;
        let dayPrecip = dailyData.precipitation_sum ? dailyData.precipitation_sum[i] : undefined;
        let dayEmoji = getWeatherEmoji(code, false, dayWindKmh, dayPrecip);
        let nightEmoji = getWeatherEmoji(code, true, dayWindKmh, dayPrecip);
        let descText = getWeatherDesc(code, config.lang);
        
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

document.getElementById(`btn_${config.lang}`).classList.add('active');
document.getElementById(`btn_${config.temp}`).classList.add('active');
document.getElementById(`btn_${config.wind === 'm/s' ? 'ms' : 'kmh'}`).classList.add('active');

initSplashScreen();
initCanvas();
renderHistoryTags();
setAutoLocationUI(getGeoPref().enabled);

// If the user previously granted location access, prefer that city on this launch
const _geoPref = getGeoPref();
if (_geoPref.enabled && _geoPref.name) {
    currentCity = _geoPref.name;
}

changeLang(config.lang);
registerNetworkWatchdog();

// Quietly top up the cache for every other history city a few seconds after boot,
// so switching between them stays instant even without a connection later.
setTimeout(prewarmHistoryCache, 4000);

// Auto-refresh weather data every hour
setInterval(() => fetchWeatherData(currentCity), 60 * 60 * 1000);

// First-launch onboarding: only runs once, replayable anytime from Settings
setTimeout(() => {
    if (!localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
        startTutorial();
    }
}, 3300);
