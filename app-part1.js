let config = JSON.parse(localStorage.getItem('weather_app_lock_v5')) || { lang: 'uz', temp: 'C', wind: 'm/s' };
let searchHistory = JSON.parse(localStorage.getItem('weather_search_history')) || ["Beruniy"];
let currentCity = searchHistory[0] || "Beruniy";
let globalWeatherData = null;
let lastUpdated = null;
let canvas, ctx, animationFrameId;
let particles = [];

// --- Splash screen taglines (one shown at random on every launch) ---
const SPLASH_TAGLINES = [
    "🌤 Ob-havo har kuni o'zgaradi.",
    "🌍 Dunyoni ob-havo orqali kashf eting.",
    "☀️ Har kun yangi imkoniyat.",
    "🌦 Weather X bilan har doim tayyor bo'ling.",
    "🌧 Yomg'ir ham tabiat go'zalligining bir qismi.",
    "❄ Har faslning o'z zavqi bor.",
    "⚡ Momaqaldiroqni oldindan biling.",
    "🌈 Ob-havo – kayfiyatning bir qismi.",
    "💙 Weather X siz uchun tayyor.",
    "📍 Istalgan shahar ob-havosini kuzating."
];

// --- Onboarding / coach-mark tutorial steps ---
// Professional, extensible structure: each step is its own object so new steps
// can be added/removed/reordered without touching the engine below.
const TUTORIAL_STEPS = [
    { id: 'search', type: 'coach', target: '#cityInput', titleKey: 'tutSearchTitle', textKey: 'tutSearchText' },
    { id: 'refresh', type: 'coach', target: '#manualRefreshBtn', titleKey: 'tutRefreshTitle', textKey: 'tutRefreshText' },
    { id: 'advice', type: 'coach', target: '.menu-trigger[onclick="openAdvice()"]', titleKey: 'tutAdviceTitle', textKey: 'tutAdviceText' },
    { id: 'weekly', type: 'coach', target: '#weeklyWarningCard', titleKey: 'tutWeeklyTitle', textKey: 'tutWeeklyText' },
    { id: 'settings', type: 'coach', target: '.menu-trigger[onclick="openSettings()"]', titleKey: 'tutSettingsTitle', textKey: 'tutSettingsText' },
    { id: 'locationPermission', type: 'permission' }
];

const ONBOARDING_STORAGE_KEY = 'weatherx_onboarding_done_v1';
const GEO_PREF_STORAGE_KEY = 'weatherx_geo_pref_v1';
let tutorialStepIndex = 0;
let currentTutorialTarget = null;
let tutorialScrollSyncActive = false;
let scrollSyncRAF = null;

const dict = {
    uz: {
        menuTitle: "Sozlamalar", cfgLang: "TIL", cfgTemp: "HARORAT", cfgWind: "SHAMOL TEZLIGI", cfgHistory: "TARIXNI BOSHQARISH", btnClearHist: "Qidiruv tarixini tozalash",
        panelAdviceTitle: "Aqlli Tavsiyalar", placeholder: "Shahar qidirish...", searchBtn: "Qidirish", today: "Bugun", titleHourly: "Soatlik ob-havo",
        titleActivities: "Faoliyat uchun qulaylik", titleWeekly: "7 kunlik ob-havo", lblFeels: "Hissiyot", lblWind: "Shamol tezligi", lblHumidity: "Namlik",
        lblUv: "UV Indeksi", lblSunrise: "☀️ Quyosh chiqishi", lblSunset: "🌙 Quyosh botishi", lblAqi: "Havo sifati (AQI)", lblDew: "Shudring nuqtasi", errorCity: "Topilmadi!",
        aqi_good: "Yaxshi", aqi_moderate: "O'rtacha", aqi_sensitive: "Sezgir guruhlar uchun zararli", aqi_unhealthy: "Zararli", aqi_veryUnhealthy: "Juda zararli", aqi_hazardous: "Xavfli", windDirLabel: "Yo'nalish",
        clear: "Ochiq osmon", partlyCloudy: "Qisman bulutli", cloudy: "Bulutli", rainy: "Yomg'irli", snowy: "Qorli", stormy: "Momaqaldiroq", foggy: "Tumanli",
        rainLight: "Yengil yomg'ir", rainModerate: "O'rtacha yomg'ir", rainHeavy: "Kuchli yomg'ir",
        weekWarnHeat: "juda issiq", weekWarnCold: "juda sovuq", weekWarnStorm: "Momaqaldiroq", weekWarnRain: "kuchli yomg'ir", weekWarnWind: "kuchli shamol",
        weekWarnHeavySnow: "kuchli qor", weekWarnFrost: "muzlash ehtimoli", weekWarnFog: "tuman", weekWarnUV: "yuqori UV", weekWarnLowVis: "past ko'rinish",
        weekendTemplate: "Dam olish kunlari %CONDS% kutilmoqda.",
        weeklyCardTitle: "⚠️ Haftalik ogohlantirishlar", weeklyCardCountTemplate: "⚠️ Kelgusi haftada %N% ta muhim ob-havo hodisasi kutilmoqda.",
        weeklyDetailsBtn: "Batafsil →", weeklyModalTitle: "Haftalik ogohlantirishlar",
        weeklyNoneMsg: "✅ Kelgusi haftada xavfli ob-havo hodisalari kutilmaydi.", weeklyNoneSub: "Ob-havo barqaror bo'lishi kutilmoqda.",
        weekTemplate: "%DAY% kuni %CONDS% kutilmoqda.", weekRangeTemplate: "%START%dan %END%gacha %CONDS% kutilmoqda.", weekSectionTitle: "Haftalik ogohlantirishlar", andWord: "va",
        dayToday: "Bugun", dayTomorrow: "Ertaga",
        adviceClothTitle: "Kiyim tavsiyasi", adviceUmbrellaTitle: "Soyabon kerakmi", adviceUvTitle: "UV tavsiyasi", adviceSportTitle: "Sport uchun qulaylik",
        clothHot: "Yengil, havo o'tkazuvchan kiyim kiying.", clothMild: "Yengil kurtka yoki jemper mos keladi.", clothCold: "Issiq kiyim, palto va sharf kiying.",
        umbrellaYes: "Ha, ehtiyot bo'lib soyabon oling.", umbrellaNo: "Kerak emas, yomg'ir kutilmayapti.",
        uvLowMsg: "UV past, qo'shimcha himoya shart emas.", uvModMsg: "UV o'rtacha, quyosh kremi tavsiya etiladi.", uvHighMsg: "UV yuqori, quyosh kremi va ko'zoynak shart.",
        sportGood: "Sport bilan shug'ullanish uchun ajoyib sharoit.", sportCaution: "Mumkin, lekin ehtiyot choralarini ko'ring.", sportBad: "Ochiq havoda sport tavsiya etilmaydi.",
        good: "Yaxshi", normal: "Qoniqarli", bad: "Yomon", act1: "Yurish", act2: "Bog'dorchilik", act3: "Velosport", act4: "Yugurish", act5: "Keyingi 3s",
        carT: "Haydash", carM_good: "Yo'llar ochiq, ko'rinish a'lo.", carM_bad: "Ehtiyot bo'ling! Noqulay ob-havo sharoiti.",
        avT: "Aviatsiya/Parvozlar", avM_good: "Parvoz uchun ideal sharoit.", avM_bad: "Kuchli shamol xavfi bor.",
        clothT: "Kiyim va Quyosh", clothM_good: "Yengil kiyim.", clothM_bad: "Yuqori UV - quyosh kremi va ko'zoynak taqing.",
        extremeHot: "⚠️ JUDA ISSIQ!", extremeCold: "⚠️ JUDA SOVUQ!", extremeWind: "⚠️ KUCHLI SHAMOL!", extremeStorm: "⚠️ MOMAQALDIROQ XAVFI!",
        extremeRain: "⚠️ KUCHLI YOMG'IR!", extremeSnow: "⚠️ KUCHLI QOR!", moderateRain: "🌧️ O'rtacha yomg'ir", lightRain: "🌦️ Yengil yomg'ir",
        lastUpdated: "Oxirgi yangilanish", refresh: "Yangilash", refreshing: "Yangilanmoqda...", fetchError: "⚠️ Ma'lumotlarni olishda xatolik yuz berdi", retry: "Qayta urinish",
        lblPressure: "Bosim", lblVisibility: "Ko'rinish", day: "Kun", night: "Tun", low: "Past", moderate: "O'rtacha", high: "Yuqori", exc: "A'lo", lim: "Cheklangan",
        cfgLocation: "JOYLASHUV", autoLocationLabel: "📍 Joylashuvni avtomatik aniqlash", cfgTutorial: "YO'RIQNOMA", btnReplayTutorial: "🔄 Yo'riqnomani qayta ko'rsatish",
        tutSearchTitle: "Shahar qidiruvi", tutSearchText: "Istalgan shaharni shu yerda qidiring.",
        tutRefreshTitle: "Yangilash tugmasi", tutRefreshText: "Ob-havo ma'lumotlarini istalgan payt qo'lda yangilang.",
        tutAdviceTitle: "Aqlli tavsiyalar", tutAdviceText: "Ob-havoga mos kiyim, UV, sayohat va boshqa tavsiyalar shu yerda.",
        tutWeeklyTitle: "Haftalik ogohlantirishlar", tutWeeklyText: "Kelgusi haftadagi muhim ob-havo hodisalari shu yerda ko'rsatiladi.",
        tutSettingsTitle: "Sozlamalar", tutSettingsText: "Til, birliklar va boshqa sozlamalarni shu yerda boshqarishingiz mumkin.",
        onboardingPermTitle: "📍 Joylashuvingizni aniqlashga ruxsat berasizmi?",
        onboardingPermText: "Weather X sizning joriy joylashuvingizni aniqlab, ob-havo ma'lumotlarini avtomatik ko'rsatishi mumkin. Bu ixtiyoriy. Siz istalgan vaqtda Sozlamalar orqali bu ruxsatni o'zgartirishingiz mumkin.",
        onboardingPermExampleNote: "Shahar nomlarini ingliz tilida kiriting. Masalan: Tashkent, Samarkand, Bukhara, London, Tokyo, New York.",
        onboardingPermAllowBtn: "📍 Ruxsat berish", onboardingPermLaterBtn: "⌨️ Keyinroq qo'lda kiritaman",
        historyDeleteTitle: "Qidiruv tarixidan o'chirish", historyDeleteText: "Bu shaharni qidiruv tarixidan o'chirmoqchimisiz?",
        historyDeleteCancel: "Bekor qilish", historyDeleteConfirm: "O'chirish",
        snackWeatherUpdated: "✅ Ob-havo muvaffaqiyatli yangilandi.", snackLocationDetected: "📍 Joylashuv aniqlandi.",
        snackCityNotFound: "❌ Shahar topilmadi. Inglizcha nomini yozib ko'ring.", snackNoInternet: "🌐 Internet mavjud emas.",
        snackServerError: "⚠️ Server bilan bog'lanib bo'lmadi.", snackGpsDisabled: "📍 GPS o'chirilgan. Uni Sozlamalarda yoqing.",
        snackRefreshFailed: "Yangilab bo'lmadi.", snackOfflineShowingCached: "🌐 Oflayn: oxirgi saqlangan ma'lumotlar ko'rsatilmoqda.",
        snackOpenSettingsBtn: "Sozlamalarni ochish", snackRetryBtn: "Qayta urinish",
        gpsDialogTitle: "📍 Joylashuv xizmati o'chirilgan", gpsDialogText: "Joylashuv xizmati o'chirilgan. Uni Sozlamalarda yoqing.",
        geoDetecting: "📍 Aniqlanmoqda...",
        onboardingLocatedTemplate: "✅ %CITY% aniqlandi.", onboardingManualFallback: "🌍 Muammo emas. Siz shaharni qidiruv orqali qo'lda ham kiritishingiz mumkin.",
        dialogOk: "Tushunarli"
    },
    ru: {
        menuTitle: "Настройки", cfgLang: "ЯЗЫК", cfgTemp: "ТЕМПЕРАТУРА", cfgWind: "СКОРОСТЬ ВЕТРА", cfgHistory: "ИСТОРИЯ", btnClearHist: "Очистить историю",
        panelAdviceTitle: "Умные Советы", placeholder: "Поиск города...", searchBtn: "Поиск", today: "Сегодня", titleHourly: "Почасовая погода",
        titleActivities: "Удобство для занятий", titleWeekly: "Погода на 7 дней", lblFeels: "Ощущается", lblWind: "Скорость ветра", lblHumidity: "Влажность",
        lblUv: "УФ-Индекс", lblSunrise: "☀️ Рассвет", lblSunset: "🌙 Закат", lblAqi: "Качество воздуха (AQI)", lblDew: "Точка росы", errorCity: "Не найдено!",
        aqi_good: "Хорошее", aqi_moderate: "Умеренное", aqi_sensitive: "Вредно для чувствительных групп", aqi_unhealthy: "Вредное", aqi_veryUnhealthy: "Очень вредное", aqi_hazardous: "Опасное", windDirLabel: "Направление",
        clear: "Ясно", partlyCloudy: "Переменная облачность", cloudy: "Облачно", rainy: "Дождь", snowy: "Снег", stormy: "Гроза", foggy: "Туман",
        rainLight: "Небольшой дождь", rainModerate: "Умеренный дождь", rainHeavy: "Сильный дождь",
        weekWarnHeat: "сильная жара", weekWarnCold: "сильный холод", weekWarnStorm: "гроза", weekWarnRain: "сильный дождь", weekWarnWind: "сильный ветер",
        weekWarnHeavySnow: "сильный снегопад", weekWarnFrost: "риск гололеда", weekWarnFog: "туман", weekWarnUV: "высокий УФ", weekWarnLowVis: "плохая видимость",
        weekendTemplate: "В выходные дни ожидается %CONDS%.",
        weeklyCardTitle: "⚠️ Недельные предупреждения", weeklyCardCountTemplate: "⚠️ На следующей неделе ожидается %N% значимых погодных событий.",
        weeklyDetailsBtn: "Подробнее →", weeklyModalTitle: "Недельные предупреждения",
        weeklyNoneMsg: "✅ На следующей неделе опасных погодных явлений не ожидается.", weeklyNoneSub: "Ожидается стабильная погода.",
        weekTemplate: "%DAY%: ожидается %CONDS%.", weekRangeTemplate: "С %START% по %END%: ожидается %CONDS%.", weekSectionTitle: "Недельные предупреждения", andWord: "и",
        dayToday: "Сегодня", dayTomorrow: "Завтра",
        adviceClothTitle: "Совет по одежде", adviceUmbrellaTitle: "Нужен ли зонт", adviceUvTitle: "УФ рекомендация", adviceSportTitle: "Удобство для спорта",
        clothHot: "Легкая, дышащая одежда.", clothMild: "Легкая куртка или свитер подойдут.", clothCold: "Теплая одежда, пальто и шарф.",
        umbrellaYes: "Да, возьмите зонт на всякий случай.", umbrellaNo: "Не нужен, дождь не ожидается.",
        uvLowMsg: "УФ низкий, доп. защита не обязательна.", uvModMsg: "УФ умеренный, рекомендуется солнцезащитный крем.", uvHighMsg: "УФ высокий, крем и очки обязательны.",
        sportGood: "Отличные условия для занятий спортом.", sportCaution: "Можно, но соблюдайте осторожность.", sportBad: "Занятия на улице не рекомендуются.",
        good: "Хорошо", normal: "Удовлетворительно", bad: "Плохо", act1: "Прогулка", act2: "Садоводство", act3: "Велоспорт", act4: "Пробежка", act5: "След. 3ч",
        carT: "Вождение", carM_good: "Дороги чистые, отличная видимость.", carM_bad: "Внимание! Плохие погодные условия.",
        avT: "Aвиация/Полеты", avM_good: "Идеальные условия для полетов.", avM_bad: "Опасность сильного ветра.",
        clothT: "Одежда и Солнце", clothM_good: "Легкая одежда.", clothM_bad: "Высокий УФ - используйте крем и очки.",
        extremeHot: "⚠️ ОЧЕНЬ ЖАРКО!", extremeCold: "⚠️ ОЧЕНЬ ХОЛОДНО!", extremeWind: "⚠️ СИЛЬНЫЙ ВЕТЕР!", extremeStorm: "⚠️ ОПАСНОСТЬ ГРОЗЫ!",
        extremeRain: "⚠️ СИЛЬНЫЙ ЛИВЕНЬ!", extremeSnow: "⚠️ СИЛЬНЫЙ СНЕГОПАД!", moderateRain: "🌧️ Умеренный дождь", lightRain: "🌦️ Небольшой дождь",
        lastUpdated: "Последнее обновление", refresh: "Обновить", refreshing: "Обновление...", fetchError: "⚠️ Не удалось загрузить данные", retry: "Повторить",
        lblPressure: "Давление", lblVisibility: "Видимость", day: "Дн", night: "Нч", low: "Низкий", moderate: "Умеренный", high: "Высокий", exc: "Отличная", lim: "Ограниченная",
        cfgLocation: "ЛОКАЦИЯ", autoLocationLabel: "📍 Автоматически определять местоположение", cfgTutorial: "ОБУЧЕНИЕ", btnReplayTutorial: "🔄 Показать обучение снова",
        tutSearchTitle: "Поиск города", tutSearchText: "Ищите любой город здесь.",
        tutRefreshTitle: "Кнопка обновления", tutRefreshText: "Обновляйте данные о погоде вручную в любое время.",
        tutAdviceTitle: "Умные советы", tutAdviceText: "Советы по одежде, УФ, поездкам и другому — здесь.",
        tutWeeklyTitle: "Недельные предупреждения", tutWeeklyText: "Важные погодные события на следующую неделю показаны здесь.",
        tutSettingsTitle: "Настройки", tutSettingsText: "Управляйте языком, единицами измерения и другими настройками здесь.",
        onboardingPermTitle: "📍 Разрешить определение местоположения?",
        onboardingPermText: "Weather X может определить ваше текущее местоположение и автоматически показать данные о погоде. Это необязательно. Вы можете изменить это разрешение в любое время в Настройках.",
        onboardingPermExampleNote: "Вводите названия городов на английском языке. Например: Tashkent, Samarkand, Bukhara, London, Tokyo, New York.",
        onboardingPermAllowBtn: "📍 Разрешить", onboardingPermLaterBtn: "⌨️ Введу вручную позже",
        historyDeleteTitle: "Удаление из истории", historyDeleteText: "Удалить этот город из истории поиска?",
        historyDeleteCancel: "Отмена", historyDeleteConfirm: "Удалить",
        snackWeatherUpdated: "✅ Погода успешно обновлена.", snackLocationDetected: "📍 Местоположение определено.",
        snackCityNotFound: "❌ Город не найден. Попробуйте ввести название на английском.", snackNoInternet: "🌐 Нет подключения к интернету.",
        snackServerError: "⚠️ Не удалось связаться с сервером.", snackGpsDisabled: "📍 GPS отключен. Включите его в настройках.",
        snackRefreshFailed: "Не удалось обновить.", snackOfflineShowingCached: "🌐 Офлайн: показаны последние сохраненные данные.",
        snackOpenSettingsBtn: "Открыть настройки", snackRetryBtn: "Повторить",
        gpsDialogTitle: "📍 Служба геолокации отключена", gpsDialogText: "Служба геолокации отключена. Включите ее в настройках.",
        geoDetecting: "📍 Определение...",
        onboardingLocatedTemplate: "✅ %CITY% определен.", onboardingManualFallback: "🌍 Не проблема. Вы можете ввести город вручную через поиск.",
        dialogOk: "Понятно"
    },
    en: {
        menuTitle: "Settings", cfgLang: "LANGUAGE", cfgTemp: "TEMPERATURE", cfgWind: "WIND SPEED", cfgHistory: "HISTORY", btnClearHist: "Clear History",
        panelAdviceTitle: "Smart Advice", placeholder: "Search city...", searchBtn: "Search", today: "Today", titleHourly: "Hourly Weather",
        titleActivities: "Activity Suitability", titleWeekly: "7-Day Weather", lblFeels: "Feels like", lblWind: "Wind Speed", lblHumidity: "Humidity",
        lblUv: "UV Index", lblSunrise: "☀️ Sunrise", lblSunset: "🌙 Sunset", lblAqi: "Air Quality (AQI)", lblDew: "Dew Point", errorCity: "Not found!",
        aqi_good: "Good", aqi_moderate: "Moderate", aqi_sensitive: "Unhealthy for sensitive groups", aqi_unhealthy: "Unhealthy", aqi_veryUnhealthy: "Very unhealthy", aqi_hazardous: "Hazardous", windDirLabel: "Direction",
        clear: "Clear Sky", partlyCloudy: "Partly Cloudy", cloudy: "Cloudy", rainy: "Rainy", snowy: "Snowy", stormy: "Thunderstorm", foggy: "Foggy",
        rainLight: "Light rain", rainModerate: "Moderate rain", rainHeavy: "Heavy rain",
        weekWarnHeat: "extreme heat", weekWarnCold: "extreme cold", weekWarnStorm: "a thunderstorm", weekWarnRain: "heavy rain", weekWarnWind: "strong wind",
        weekWarnHeavySnow: "heavy snow", weekWarnFrost: "risk of frost", weekWarnFog: "fog", weekWarnUV: "high UV", weekWarnLowVis: "low visibility",
        weekendTemplate: "This weekend: %CONDS% expected.",
        weeklyCardTitle: "⚠️ Weekly Warnings", weeklyCardCountTemplate: "⚠️ %N% significant weather events expected next week.",
        weeklyDetailsBtn: "Details →", weeklyModalTitle: "Weekly Warnings",
        weeklyNoneMsg: "✅ No hazardous weather expected next week.", weeklyNoneSub: "Weather is expected to remain stable.",
        weekTemplate: "%DAY%: %CONDS% expected.", weekRangeTemplate: "From %START% to %END%: %CONDS% expected.", weekSectionTitle: "Weekly Warnings", andWord: "and",
        dayToday: "Today", dayTomorrow: "Tomorrow",
        adviceClothTitle: "Clothing Advice", adviceUmbrellaTitle: "Need an Umbrella?", adviceUvTitle: "UV Advice", adviceSportTitle: "Sport Suitability",
        clothHot: "Light, breathable clothing.", clothMild: "A light jacket or sweater works well.", clothCold: "Warm clothing, coat and scarf.",
        umbrellaYes: "Yes, bring an umbrella just in case.", umbrellaNo: "Not needed, no rain expected.",
        uvLowMsg: "UV is low, no extra protection needed.", uvModMsg: "UV is moderate, sunscreen recommended.", uvHighMsg: "UV is high, sunscreen and sunglasses required.",
        sportGood: "Great conditions for outdoor sports.", sportCaution: "Possible, but take precautions.", sportBad: "Outdoor sports not recommended.",
        good: "Good", normal: "Satisfactory", bad: "Bad", act1: "Walking", act2: "Gardening", act3: "Cycling", act4: "Running", act5: "Next 3h",
        carT: "Driving", carM_good: "Roads are clear, great visibility.", carM_bad: "Warning! Unfavorable weather conditions.",
        avT: "Aviation/Flights", avM_good: "Ideal conditions for flights.", avM_bad: "High wind warning.",
        clothT: "Clothing & Sun", clothM_good: "Light clothing.", clothM_bad: "High UV - wear sunscreen and sunglasses.",
        extremeHot: "⚠️ EXTREMELY HOT!", extremeCold: "⚠️ EXTREMELY COLD!", extremeWind: "⚠️ STRONG WIND!", extremeStorm: "⚠️ THUNDERSTORM DANGER!",
        extremeRain: "⚠️ HEAVY RAIN!", extremeSnow: "⚠️ HEAVY SNOW!", moderateRain: "🌧️ Moderate rain", lightRain: "🌦️ Light rain",
        lastUpdated: "Last updated", refresh: "Refresh", refreshing: "Refreshing...", fetchError: "⚠️ Failed to fetch weather data", retry: "Retry",
        lblPressure: "Pressure", lblVisibility: "Visibility", day: "Day", night: "Night", low: "Low", moderate: "Moderate", high: "High", exc: "Excellent", lim: "Limited",
        cfgLocation: "LOCATION", autoLocationLabel: "📍 Auto-detect my location", cfgTutorial: "TUTORIAL", btnReplayTutorial: "🔄 Show tutorial again",
        tutSearchTitle: "City search", tutSearchText: "Search for any city right here.",
        tutRefreshTitle: "Refresh button", tutRefreshText: "Manually refresh the weather data any time.",
        tutAdviceTitle: "Smart advice", tutAdviceText: "Clothing, UV, travel, and other advice live here.",
        tutWeeklyTitle: "Weekly warnings", tutWeeklyText: "Important weather events for the coming week are shown here.",
        tutSettingsTitle: "Settings", tutSettingsText: "Manage language, units, and other settings here.",
        onboardingPermTitle: "📍 Allow access to your location?",
        onboardingPermText: "Weather X can detect your current location and automatically show weather data for it. This is optional. You can change this permission any time in Settings.",
        onboardingPermExampleNote: "Enter city names in English. For example: Tashkent, Samarkand, Bukhara, London, Tokyo, New York.",
        onboardingPermAllowBtn: "📍 Allow", onboardingPermLaterBtn: "⌨️ I'll type it in later",
        historyDeleteTitle: "Remove from history", historyDeleteText: "Remove this city from your search history?",
        historyDeleteCancel: "Cancel", historyDeleteConfirm: "Delete",
        snackWeatherUpdated: "✅ Weather updated successfully.", snackLocationDetected: "📍 Location detected.",
        snackCityNotFound: "❌ City not found. Try the English spelling.", snackNoInternet: "🌐 No internet connection.",
        snackServerError: "⚠️ Couldn't reach the server.", snackGpsDisabled: "📍 GPS is off. Turn it on in Settings.",
        snackRefreshFailed: "Couldn't refresh.", snackOfflineShowingCached: "🌐 Offline: showing the last saved data.",
        snackOpenSettingsBtn: "Open Settings", snackRetryBtn: "Retry",
        gpsDialogTitle: "📍 Location services are off", gpsDialogText: "Location services are turned off. Turn them on in Settings.",
        geoDetecting: "📍 Detecting...",
        onboardingLocatedTemplate: "✅ %CITY% detected.", onboardingManualFallback: "🌍 No problem. You can enter a city manually via search.",
        dialogOk: "Got it"
    }
};

// ============================================================
// GLOBAL SNACKBAR ENGINE (Material-style, queued, duration-by-type)
// ============================================================
const SNACKBAR_DURATIONS = { success: 3000, info: 4000, error: 5000, warning: 6000 };
let snackbarQueue = [];
let snackbarShowing = false;

function showSnackbar(message, type = 'info', action = null) {
    snackbarQueue.push({ message, type, action });
    processSnackbarQueue();
}

function processSnackbarQueue() {
    if (snackbarShowing || snackbarQueue.length === 0) return;
    snackbarShowing = true;
    const { message, type, action } = snackbarQueue.shift();
    const duration = SNACKBAR_DURATIONS[type] || SNACKBAR_DURATIONS.info;

    const el = document.createElement('div');
    el.className = `snackbar snackbar-${type}`;
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    el.appendChild(textSpan);

    if (action) {
        const btn = document.createElement('button');
        btn.className = 'snackbar-action';
        btn.textContent = action.label;
        btn.onclick = () => {
            action.onClick();
            dismissSnackbar(el);
        };
        el.appendChild(btn);
    }

    document.getElementById('snackbarContainer').appendChild(el);
    requestAnimationFrame(() => el.classList.add('snackbar-visible'));

    const timer = setTimeout(() => dismissSnackbar(el), duration);
    el.dataset.timerId = timer;
}

function dismissSnackbar(el) {
    if (!el || !el.parentNode) return;
    clearTimeout(el.dataset.timerId);
    el.classList.remove('snackbar-visible');
    setTimeout(() => {
        el.remove();
        snackbarShowing = false;
        processSnackbarQueue();
    }, 300);
}

// ============================================================
// GLOBAL DIALOG ENGINE (Material-style confirm/info dialog)
// ============================================================
function showDialog({ title, text, buttons }) {
    const overlay = document.getElementById('dialogOverlay');
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogText').textContent = text;

    const btnRow = document.getElementById('dialogButtons');
    btnRow.innerHTML = '';
    buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = `dialog-btn ${b.className || 'dialog-btn-cancel'}`;
        btn.textContent = b.label;
        btn.onclick = () => {
            closeDialog();
            if (b.onClick) b.onClick();
        };
        btnRow.appendChild(btn);
    });

    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('dialog-visible'));
}

function closeDialog() {
    const overlay = document.getElementById('dialogOverlay');
    overlay.classList.remove('dialog-visible');
    setTimeout(() => { overlay.style.display = 'none'; }, 250);
}

function initCanvas() {
    canvas = document.getElementById('weather-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = window.innerHeight;
}

function startWeatherAnimation(code, isDay) {
    cancelAnimationFrame(animationFrameId);
    particles = [];
    let type = 'none';
    const isThunder = code >= 95 && code <= 99;
    const isFog = code === 45 || code === 48;

    if (code === 0) {
        canvas.style.background = isDay
            ? "linear-gradient(180deg, #1e3a8a 0%, #38bdf8 100%)"
            : "linear-gradient(180deg, #0c1033 0%, #030712 100%)";
        if (!isDay) type = 'stars';
    } else if (code >= 1 && code <= 3) {
        canvas.style.background = isDay
            ? "linear-gradient(180deg, #3b5980 0%, #64748b 100%)"
            : "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)";
        if (!isDay) type = 'stars';
    } else if (isFog) {
        type = 'fog';
        canvas.style.background = isDay
            ? "linear-gradient(180deg, #64748b 0%, #94a3b8 100%)"
            : "linear-gradient(180deg, #1f2937 0%, #111827 100%)";
    } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || isThunder) {
        type = isThunder ? 'storm' : 'rain';
        canvas.style.background = "linear-gradient(180deg, #0f172a 0%, #090d16 100%)";
    } else if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
        type = 'snow';
        canvas.style.background = "linear-gradient(180deg, #334155 0%, #0f172a 100%)";
    } else {
        canvas.style.background = "linear-gradient(180deg, #111827 0%, #030712 100%)";
    }
    
    if (type === 'none') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    let maxParticles = type === 'rain' || type === 'storm' ? 60 : (type === 'stars' ? 60 : (type === 'fog' ? 6 : 35));
    for (let i = 0; i < maxParticles; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            v: (type === 'rain' || type === 'storm') ? (Math.random() * 5 + 5) : (Math.random() * 1 + 0.5),
            r: (type === 'rain' || type === 'storm') ? Math.random() * 1 + 1 : Math.random() * 2 + 1,
            drift: Math.random() * 0.5 - 0.25,
            twinkle: Math.random() * Math.PI * 2
        });
    }

    let lastFlash = 0;
    function animate(ts) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (type === 'stars') {
            particles.forEach(p => {
                const alpha = 0.4 + Math.abs(Math.sin((ts || 0) * 0.001 + p.twinkle)) * 0.6;
                ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
                ctx.fill();
            });
        } else if (type === 'fog') {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            particles.forEach(p => {
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, 140, 40, 0, 0, Math.PI * 2);
                ctx.fill();
                p.x += 0.3;
                if (p.x > canvas.width + 150) p.x = -150;
            });
        } else {
            ctx.fillStyle = (type === 'rain' || type === 'storm') ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.7)';
            particles.forEach(p => {
                ctx.beginPath();
                if (type === 'rain' || type === 'storm') {
                    ctx.rect(p.x, p.y, p.r, p.v * 1.5);
                } else {
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                }
                ctx.fill();

                p.y += p.v;
                p.x += p.drift;

                if (p.y > canvas.height) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                }
            });

            if (type === 'storm' && ts && ts - lastFlash > (1200 + Math.random() * 2500)) {
                lastFlash = ts;
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
        animationFrameId = requestAnimationFrame(animate);
    }
    animate();
}

function getWeatherDesc(code, lang) {
    if (code === 0) return dict[lang].clear;
    if (code >= 1 && code <= 3) return dict[lang].partlyCloudy;
    if (code === 45 || code === 48) return dict[lang].foggy;
    if ([65, 67, 82].includes(code)) return dict[lang].rainHeavy;
    if ([63, 66, 81, 53].includes(code)) return dict[lang].rainModerate;
    if ([51, 55, 56, 57, 61, 80].includes(code)) return dict[lang].rainLight;
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return dict[lang].snowy;
    if (code >= 95 && code <= 99) return dict[lang].stormy;
    return dict[lang].cloudy;
}

// Weather-type icon rules stay exactly as before; only how "is it night?" is determined changes below.
const STRONG_WIND_THRESHOLD_KMH = 30;

// Determines day/night for a given hourly timestamp using that day's real sunrise/sunset,
// instead of any hardcoded clock hours. Falls back to `fallbackIsNight` for polar day/night
// (where a given date has no sunrise or sunset at all) or if the date isn't found in dailyData.
function isNightAtTime(timeStr, dailyData, fallbackIsNight) {
    if (!timeStr || !dailyData || !dailyData.time) return fallbackIsNight;
    const dateStr = timeStr.slice(0, 10); // "YYYY-MM-DD"
    const dayIdx = dailyData.time.indexOf(dateStr);
    if (dayIdx === -1) return fallbackIsNight;

    const sunriseStr = dailyData.sunrise ? dailyData.sunrise[dayIdx] : null;
    const sunsetStr = dailyData.sunset ? dailyData.sunset[dayIdx] : null;
    if (!sunriseStr || !sunsetStr) return fallbackIsNight; // polar day/night: no rise/set that day

    const t = new Date(timeStr).getTime();
    const sunrise = new Date(sunriseStr).getTime();
    const sunset = new Date(sunsetStr).getTime();
    return t < sunrise || t >= sunset;
}

function degToCompass(deg, lang) {
    const dirsByLang = {
        uz: ["Shimol", "Shimoli-sharq", "Sharq", "Janubi-sharq", "Janub", "Janubi-g'arb", "G'arb", "Shimoli-g'arb"],
        ru: ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"],
        en: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    };
    const dirs = dirsByLang[lang] || dirsByLang.en;
    const idx = Math.round((deg % 360) / 45) % 8;
    return dirs[idx];
}

function getWeatherEmoji(code, isNight, windKmh) {
    // Strong-wind override: only for otherwise "plain sky" conditions (clear/partly cloudy/overcast).
    // Rain, storm, snow, and fog icons are more diagnostic and are never replaced by the wind icon.
    const isPlainSky = code >= 0 && code <= 3;
    if (isPlainSky && typeof windKmh === 'number' && windKmh >= STRONG_WIND_THRESHOLD_KMH) {
        return "🌬️";
    }
    if (code === 0) return isNight ? "🌙" : "☀️";
    if (code >= 1 && code <= 3) return isNight ? "☁️" : "🌤️";
    if (code === 45 || code === 48) return "🌫️";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "❄️";
    if (code >= 95 && code <= 99) return "⚡";
    return "☁️";
}

// ============================================================
// SPLASH SCREEN
// ============================================================
function initSplashScreen() {
    const tagline = SPLASH_TAGLINES[Math.floor(Math.random() * SPLASH_TAGLINES.length)];
    const taglineEl = document.getElementById('splashTagline');
    if (taglineEl) taglineEl.textContent = tagline;
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        const app = document.querySelector('.app-container');
        if (splash) splash.classList.add('splash-hide');
        if (app) app.classList.add('app-fade-in');
    }, 3000);
}

// ============================================================
// GEOLOCATION ("use my location" + auto-location preference)
// ============================================================
function setAutoLocationUI(enabled) {
    const stateEl = document.getElementById('autoLocationState');
    if (stateEl) stateEl.textContent = enabled ? 'ON' : 'OFF';
}

function getGeoPref() {
    try {
        return JSON.parse(localStorage.getItem(GEO_PREF_STORAGE_KEY)) || { enabled: false };
    } catch (e) {
        return { enabled: false };
    }
}

async function reverseGeocodeCity(lat, lon) {
    try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        if (!res.ok) throw new Error('reverse geocode failed');
        const data = await res.json();
        return data.city || data.locality || data.principalSubdivision || 'My Location';
    } catch (err) {
        console.error('Reverse geocode error:', err);
        return 'My Location';
    }
}

function setGeoStatus(text) {
    const el = document.getElementById('autoLocationStatus');
    if (!el) return;
    if (!text) {
        el.style.display = 'none';
        el.textContent = '';
    } else {
        el.style.display = 'block';
        el.textContent = text;
    }
}

function openLocationSettingsBestEffort() {
    // A generic web page cannot reliably open a device's system Location Settings screen.
    // This is a best-effort attempt for Android WebView/Chrome contexts; it's silently
    // ignored if unsupported, and the dialog text already tells the user where to look.
    try {
        window.location.href = 'android-app://com.android.settings/.Settings$LocationSettingsActivity';
    } catch (e) {
        console.error('Could not open location settings:', e);
    }
}

function showGpsDisabledDialog() {
    const d = dict[config.lang];
    showDialog({
        title: d.gpsDialogTitle,
        text: d.gpsDialogText,
        buttons: [
            { label: d.dialogOk, className: 'dialog-btn-cancel' },
            { label: d.snackOpenSettingsBtn, className: 'dialog-btn-primary', onClick: openLocationSettingsBestEffort }
        ]
    });
}

function handleGeoError(err) {
    setAutoLocationUI(false);
    setGeoStatus('');
    // GeolocationPositionError codes: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
    if (err && err.code === 1) {
        showGpsDisabledDialog();
    } else {
        showSnackbar(dict[config.lang].snackServerError, 'warning');
    }
}

function useMyLocation() {
    if (!navigator.geolocation) {
        showSnackbar(dict[config.lang].snackServerError, 'warning');
        return;
    }
    setGeoStatus(dict[config.lang].geoDetecting);
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        const cityName = await reverseGeocodeCity(lat, lon);
        localStorage.setItem(GEO_PREF_STORAGE_KEY, JSON.stringify({ enabled: true, lat, lon, name: cityName }));
        setAutoLocationUI(true);
        setGeoStatus('');
        currentCity = cityName;
        if (!searchHistory.includes(cityName)) {
            searchHistory.unshift(cityName);
            if (searchHistory.length > 8) searchHistory.pop();
            localStorage.setItem('weather_search_history', JSON.stringify(searchHistory));
        }
        renderHistoryTags();
        fetchWeatherData(cityName, { name: cityName, lat, lon }, 'search');
        showSnackbar(dict[config.lang].snackLocationDetected, 'success');
    }, (err) => {
        console.error('Geolocation error:', err);
        handleGeoError(err);
    }, { timeout: 8000, enableHighAccuracy: false });
}

function toggleAutoLocation() {
    const pref = getGeoPref();
    if (!pref.enabled) {
        useMyLocation();
    } else {
        localStorage.setItem(GEO_PREF_STORAGE_KEY, JSON.stringify({ enabled: false }));
        setAutoLocationUI(false);
        setGeoStatus('');
    }
}

// ============================================================
// ONBOARDING / COACH-MARK TUTORIAL ENGINE
// Each step lives in TUTORIAL_STEPS as its own object — add, remove,
// or reorder steps there without touching any of the logic below.
// ============================================================
function startTutorial() {
    tutorialStepIndex = 0;
    document.getElementById('onboardingOverlay').style.display = 'block';
    showTutorialStep(0);
}

function showTutorialStep(idx) {
    tutorialStepIndex = idx;
    const step = TUTORIAL_STEPS[idx];
    const total = TUTORIAL_STEPS.length;
    const tooltip = document.getElementById('onboardingTooltip');
    const permCard = document.getElementById('onboardingPermissionCard');
    const spotlight = document.getElementById('onboardingSpotlight');
    const arrow = document.getElementById('onboardingArrow');

    document.getElementById('onboardingProgressText').textContent = `${idx + 1} / ${total}`;
    document.getElementById('onboardingDots').innerHTML =
        TUTORIAL_STEPS.map((_, i) => `<span class="${i <= idx ? 'dot-active' : ''}"></span>`).join('');

    if (step.type === 'permission') {
        detachScrollSync();
        tooltip.classList.remove('tt-visible');
        tooltip.style.display = 'none';
        spotlight.style.display = 'none';
        arrow.style.display = 'none';
        document.getElementById('onboardingPermFeedback').style.display = 'none';
        permCard.style.display = 'block';
        return;
    }

    permCard.style.display = 'none';
    spotlight.style.display = 'block';
    arrow.style.display = 'block';
    tooltip.style.display = 'block';

    document.getElementById('onboardingTitle').textContent = dict[config.lang][step.titleKey];
    document.getElementById('onboardingText').textContent = dict[config.lang][step.textKey];

    positionSpotlightForStep(step);
}

function positionSpotlightForStep(step) {
    const el = document.querySelector(step.target);
    if (!el) {
        // Target isn't in the DOM for some reason — don't get the user stuck, just move on.
        tutorialNext();
        return;
    }
    currentTutorialTarget = el;
    attachScrollSync();
    scrollElementIntoComfortableView(el, () => placeSpotlight(el));
}

function scrollElementIntoComfortableView(el, callback) {
    const container = document.getElementById('appScroll');
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Comfortable = target sits in the upper third of the screen, leaving room below for the arrow + tooltip.
    const alreadyComfortable = rect.top >= 70 && rect.top <= window.innerHeight * 0.4 && rect.bottom <= window.innerHeight - 40;
    if (alreadyComfortable) {
        callback();
        return;
    }

    const elTopWithinContainer = rect.top - containerRect.top + container.scrollTop;
    const desiredViewportOffset = window.innerHeight * 0.25;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const targetScrollTop = Math.max(0, Math.min(elTopWithinContainer - desiredViewportOffset, maxScroll));

    container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    // The live scroll-sync listener keeps things aligned during the animation; this just settles the final placement.
    setTimeout(callback, 550);
}

function attachScrollSync() {
    if (tutorialScrollSyncActive) return;
    tutorialScrollSyncActive = true;
    const container = document.getElementById('appScroll');
    container.addEventListener('scroll', onTutorialScrollSync);
    window.addEventListener('resize', onTutorialScrollSync);
}

function detachScrollSync() {
    if (!tutorialScrollSyncActive) return;
    tutorialScrollSyncActive = false;
    const container = document.getElementById('appScroll');
    container.removeEventListener('scroll', onTutorialScrollSync);
    window.removeEventListener('resize', onTutorialScrollSync);
    currentTutorialTarget = null;
}

function onTutorialScrollSync() {
    if (!currentTutorialTarget) return;
    if (scrollSyncRAF) cancelAnimationFrame(scrollSyncRAF);
    scrollSyncRAF = requestAnimationFrame(() => placeSpotlight(currentTutorialTarget));
}

function placeSpotlight(el) {
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const spotlight = document.getElementById('onboardingSpotlight');
    spotlight.style.top = `${rect.top - pad}px`;
    spotlight.style.left = `${rect.left - pad}px`;
    spotlight.style.width = `${rect.width + pad * 2}px`;
    spotlight.style.height = `${rect.height + pad * 2}px`;

    const arrow = document.getElementById('onboardingArrow');
    const tooltip = document.getElementById('onboardingTooltip');
    const tooltipHeight = 190;

    // Default (and preferred) layout: arrow sits BELOW the target pointing UP at it, tooltip below the arrow.
    // Our scroll targeting keeps the element in the upper part of the screen so this fits almost always.
    let arrowTop = rect.bottom + 6;
    let tooltipTop = rect.bottom + 44;
    arrow.textContent = '👆';

    if (tooltipTop + tooltipHeight > window.innerHeight) {
        // Rare fallback for elements too close to the bottom edge: flip everything above the target instead.
        arrow.textContent = '👇';
        arrowTop = rect.top - 34;
        tooltipTop = Math.max(70, rect.top - tooltipHeight - 12);
    }

    arrow.style.top = `${arrowTop}px`;
    arrow.style.left = `${rect.left + rect.width / 2 - 13}px`;
    tooltip.style.top = `${tooltipTop}px`;

    tooltip.classList.remove('tt-visible');
    requestAnimationFrame(() => tooltip.classList.add('tt-visible'));
}

function tutorialNext() {
    if (tutorialStepIndex < TUTORIAL_STEPS.length - 1) {
        showTutorialStep(tutorialStepIndex + 1);
    } else {
        finishTutorial();
    }
}

function tutorialSkip() {
    finishTutorial();
}

function finishTutorial() {
    detachScrollSync();
    document.getElementById('onboardingOverlay').style.display = 'none';
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
}

function restartTutorial() {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    startTutorial();
}

function tutorialAllowLocation() {
    const feedback = document.getElementById('onboardingPermFeedback');
    feedback.style.display = 'block';
    feedback.textContent = dict[config.lang].geoDetecting;

    if (!navigator.geolocation) {
        feedback.textContent = dict[config.lang].onboardingManualFallback;
        setTimeout(finishTutorial, 1800);
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        const cityName = await reverseGeocodeCity(lat, lon);
        localStorage.setItem(GEO_PREF_STORAGE_KEY, JSON.stringify({ enabled: true, lat, lon, name: cityName }));
        setAutoLocationUI(true);
        currentCity = cityName;
        fetchWeatherData(cityName, { name: cityName, lat, lon }, 'search');
        feedback.textContent = dict[config.lang].onboardingLocatedTemplate.replace('%CITY%', cityName);
        setTimeout(finishTutorial, 1200);
    }, (err) => {
        console.error('Geolocation error:', err);
        feedback.textContent = dict[config.lang].onboardingManualFallback;
        localStorage.setItem(GEO_PREF_STORAGE_KEY, JSON.stringify({ enabled: false }));
        setAutoLocationUI(false);
        setTimeout(finishTutorial, 2200);
    }, { timeout: 8000, enableHighAccuracy: false });
}

function tutorialDeclineLocation() {
    localStorage.setItem(GEO_PREF_STORAGE_KEY, JSON.stringify({ enabled: false }));
    setAutoLocationUI(false);
    finishTutorial();
}

let openModalCount = 0;

let savedScrollTop = 0;

function lockAppScroll() {
    const container = document.getElementById('appScroll');
    if (openModalCount === 0) {
        savedScrollTop = container.scrollTop;
    }
    openModalCount++;
    container.style.overflow = 'hidden';
}

function unlockAppScroll() {
    openModalCount = Math.max(0, openModalCount - 1);
    if (openModalCount === 0) {
        const container = document.getElementById('appScroll');
        container.style.overflow = '';
        container.scrollTop = savedScrollTop;
    }
}

function openModalEl(el) {
    el.scrollTop = 0;
    el.style.display = 'flex';
    lockAppScroll();
    requestAnimationFrame(() => el.classList.add('modal-open'));
}

function closeModalEl(el) {
    el.classList.remove('modal-open');
    unlockAppScroll();
    setTimeout(() => { el.style.display = 'none'; }, 250);
}

function openWeeklyModal() {
    const card = document.getElementById('weeklyWarningCard');
    const rect = card ? card.getBoundingClientRect() : null;
    const alreadyVisible = rect && rect.top >= 60 && rect.bottom <= window.innerHeight - 20;

    if (card && !alreadyVisible) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => openModalEl(document.getElementById('weeklyModal')), 350);
    } else {
        openModalEl(document.getElementById('weeklyModal'));
    }
}
function closeWeeklyModal() {
    closeModalEl(document.getElementById('weeklyModal'));
}

function openSettings() {
    setAutoLocationUI(getGeoPref().enabled);
    setGeoStatus('');
    openModalEl(document.getElementById('settingsPanel'));
}
function closeSettings() {
    closeModalEl(document.getElementById('settingsPanel'));
}
function openAdvice() {
    openModalEl(document.getElementById('advicePanel'));
    generateSmartAdvice();
}
function closeAdvice() {
    closeModalEl(document.getElementById('advicePanel'));
}

