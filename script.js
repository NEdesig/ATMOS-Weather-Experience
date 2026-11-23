
const API = "https://api.open-meteo.com/v1/forecast";
const GEO = "https://geocoding-api.open-meteo.com/v1/search";

let currentCity = {
  name: "Москва",
  country: "Россия",
  latitude: 55.7558,
  longitude: 37.6173
};

let weatherData = null;
let celsius = true;

const $ = id => document.getElementById(id);

function weatherInfo(code) {
  const conditions = {
    0: ["Ясное небо", "☀️"],
    1: ["Преимущественно ясно", "🌤️"],
    2: ["Переменная облачность", "⛅"],
    3: ["Пасмурно", "☁️"],
    45: ["Туман", "🌫️"],
    48: ["Изморозь и туман", "🌫️"],
    51: ["Лёгкая морось", "🌦️"],
    53: ["Морось", "🌦️"],
    55: ["Сильная морось", "🌧️"],
    56: ["Ледяная морось", "🌧️"],
    57: ["Сильная ледяная морось", "🌧️"],
    61: ["Небольшой дождь", "🌧️"],
    63: ["Умеренный дождь", "🌧️"],
    65: ["Сильный дождь", "🌧️"],
    66: ["Ледяной дождь", "🌧️"],
    67: ["Сильный ледяной дождь", "🌧️"],
    71: ["Небольшой снег", "🌨️"],
    73: ["Снег", "❄️"],
    75: ["Сильный снегопад", "❄️"],
    77: ["Снежная крупа", "🌨️"],
    80: ["Ливневый дождь", "🌦️"],
    81: ["Сильный ливень", "🌧️"],
    82: ["Очень сильный ливень", "⛈️"],
    85: ["Снегопад", "🌨️"],
    86: ["Сильный снегопад", "❄️"],
    95: ["Гроза", "⛈️"],
    96: ["Гроза с градом", "⛈️"],
    99: ["Сильная гроза с градом", "⛈️"]
  };

  return conditions[code] || ["Неизвестно", "🌡️"];
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function displayTemp(value) {
  return Math.round(celsius ? value : value * 9 / 5 + 32);
}

function unitLabel() {
  return celsius ? "°" : "°F";
}

function formatDay(date, index) {
  if (index === 0) return "Сегодня";
  if (index === 1) return "Завтра";

  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long"
  }).format(new Date(date + "T12:00:00"));
}

function formatTime(date) {
  return date.slice(11, 16);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(date));
}

async function loadWeather() {
  $("cityName").textContent = currentCity.name;
  $("currentDate").textContent = "Обновляем данные...";
  $("weatherDescription").textContent = "Загрузка погоды...";
  $("hourlyForecast").innerHTML =
    '<div class="loading">Загружаем почасовой прогноз...</div>';
  $("dailyForecast").innerHTML =
    '<div class="loading">Загружаем прогноз на неделю...</div>';

  const params = new URLSearchParams({
    latitude: currentCity.latitude,
    longitude: currentCity.longitude,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "wind_speed_10m"
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "weather_code"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max"
    ].join(","),
    timezone: "auto",
    forecast_days: 7,
    forecast_hours: 24
  });

  try {
    const response = await fetch(`${API}?${params}`);

    if (!response.ok) {
      throw new Error("Ошибка получения данных");
    }

    weatherData = await response.json();

    renderCurrent();
    renderHourly();
    renderDaily();

  } catch (error) {
    console.error(error);
    $("weatherDescription").textContent = "Не удалось загрузить погоду";
    showToast("Ошибка соединения. Попробуй ещё раз.");
  }
}

function renderCurrent() {
  const data = weatherData.current;
  const info = weatherInfo(data.weather_code);

  $("cityName").textContent = currentCity.name;
  $("currentDate").textContent = formatDate(data.time);
  $("weatherIcon").textContent = info[1];
  $("temperature").textContent = displayTemp(data.temperature_2m);
  $("weatherDescription").textContent = info[0];

  $("humidity").textContent = `${data.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(data.wind_speed_10m)} км/ч`;
  $("feels").textContent =
    `${displayTemp(data.apparent_temperature)}${unitLabel()}`;

  document.querySelector(".temperature .degree").textContent =
    unitLabel();
}

function renderHourly() {
  const hourly = weatherData.hourly;
  const now = weatherData.current.time;

  let startIndex = hourly.time.findIndex(time => time >= now);

  if (startIndex < 0) startIndex = 0;

  const items = hourly.time.slice(startIndex, startIndex + 12);

  $("hourlyForecast").innerHTML = items.map((time, index) => {
    const i = startIndex + index;
    const info = weatherInfo(hourly.weather_code[i]);
    const probability =
      hourly.precipitation_probability[i] ?? 0;

    const label = index === 0 ? "Сейчас" : formatTime(time);

    return `
      <div class="hour-card ${index === 0 ? "active" : ""}">
        <small>${label}</small>
        <div class="icon">${info[1]}</div>
        <strong>${displayTemp(hourly.temperature_2m[i])}${unitLabel()}</strong>
        <span class="rain">💧 ${probability}%</span>
      </div>
    `;
  }).join("");
}

function renderDaily() {
  const daily = weatherData.daily;

  $("dailyForecast").innerHTML = daily.time.map((date, i) => {
    const info = weatherInfo(daily.weather_code[i]);
    const max = displayTemp(daily.temperature_2m_max[i]);
    const min = displayTemp(daily.temperature_2m_min[i]);

    return `
      <div class="day-row">
        <div class="day-name">${formatDay(date, i)}</div>
        <div class="day-icon">${info[1]}</div>
        <div class="day-desc">${info[0]}</div>
        <div class="day-temps">
          <strong>${max}°</strong>
          <span>${min}°</span>
        </div>
      </div>
    `;
  }).join("");
}

async function searchCity() {
  const query = $("cityInput").value.trim();

  if (query.length < 2) {
    showToast("Введи название города");
    return;
  }

  $("searchBtn").disabled = true;
  $("searchBtn").textContent = "...";

  try {
    const response = await fetch(
      `${GEO}?name=${encodeURIComponent(query)}&count=7&language=ru&format=json`
    );

    if (!response.ok) throw new Error();

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      showToast("Город не найден");
      $("searchResults").classList.remove("show");
      return;
    }

    const results = data.results;

    $("searchResults").innerHTML = results.map((city, i) => `
      <button class="search-result" data-index="${i}">
        <strong>${city.name}</strong>
        <span style="color:#8996aa">
          — ${city.admin1 || ""} ${city.country || ""}
        </span>
      </button>
    `).join("");

    $("searchResults").classList.add("show");

    $("searchResults").querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => {
        const city = results[Number(button.dataset.index)];

        currentCity = {
          name: city.name,
          country: city.country,
          latitude: city.latitude,
          longitude: city.longitude
        };

        $("cityInput").value = "";
        $("searchResults").classList.remove("show");

        loadWeather();
      });
    });

  } catch (error) {
    showToast("Не удалось выполнить поиск");
  } finally {
    $("searchBtn").disabled = false;
    $("searchBtn").textContent = "Найти";
  }
}

function getLocation() {
  if (!navigator.geolocation) {
    showToast("Геолокация не поддерживается");
    return;
  }

  showToast("Определяем местоположение...");

  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const response = await fetch(
          `${GEO}?name=${lat},${lon}&count=1&language=ru&format=json`
        );

        const data = await response.json();
        const city = data.results?.[0];

        currentCity = {
          name: city?.name || "Моё местоположение",
          country: city?.country || "",
          latitude: lat,
          longitude: lon
        };

      } catch {
        currentCity = {
          name: "Моё местоположение",
          country: "",
          latitude: lat,
          longitude: lon
        };
      }

      loadWeather();
    },
    error => {
      showToast("Разреши доступ к геолокации");
    },
    {
      enableHighAccuracy: false,
      timeout: 12000
    }
  );
}

$("searchBtn").addEventListener("click", searchCity);

$("cityInput").addEventListener("keydown", event => {
  if (event.key === "Enter") searchCity();
});

$("locationBtn").addEventListener("click", getLocation);

$("unitBtn").addEventListener("click", () => {
  celsius = !celsius;
  $("unitBtn").textContent = celsius ? "°C" : "°F";

  if (weatherData) {
    renderCurrent();
    renderHourly();
    renderDaily();
  }
});

document.addEventListener("click", event => {
  if (!event.target.closest(".search-wrap")) {
    $("searchResults").classList.remove("show");
  }
});

loadWeather();
