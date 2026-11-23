
const API = "https://api.open-meteo.com/v1/forecast";
const GEO = "https://geocoding-api.open-meteo.com/v1/search";

let city = {
  name: "Москва",
  latitude: 55.7558,
  longitude: 37.6173
};

let weather = null;
let celsius = true;
let rating = 0;
let selectedTags = [];

const $ = id => document.getElementById(id);

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

function temp(value) {
  return Math.round(celsius ? value : value * 9 / 5 + 32);
}

function unit() {
  return celsius ? "°" : "°F";
}

function condition(code) {
  const data = {
    0:["Ясно","☀️"],1:["Преимущественно ясно","🌤️"],
    2:["Переменная облачность","⛅"],3:["Пасмурно","☁️"],
    45:["Туман","🌫️"],48:["Туман","🌫️"],
    51:["Морось","🌦️"],53:["Морось","🌦️"],
    55:["Сильная морось","🌧️"],61:["Небольшой дождь","🌧️"],
    63:["Дождь","🌧️"],65:["Сильный дождь","🌧️"],
    71:["Небольшой снег","🌨️"],73:["Снег","❄️"],
    75:["Сильный снег","❄️"],80:["Ливень","🌦️"],
    81:["Сильный ливень","🌧️"],82:["Очень сильный ливень","⛈️"],
    85:["Снегопад","🌨️"],86:["Сильный снегопад","❄️"],
    95:["Гроза","⛈️"],96:["Гроза с градом","⛈️"],
    99:["Сильная гроза","⛈️"]
  };
  return data[code] || ["Переменная погода","🌡️"];
}

function dateText(value, options) {
  return new Intl.DateTimeFormat("ru-RU", options).format(new Date(value));
}

async function loadWeather() {
  $("cityName").textContent = city.name;
  $("weatherDescription").textContent = "Обновление погоды...";

  const params = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7",
    forecast_hours: "24"
  });

  try {
    const response = await fetch(`${API}?${params}`);
    if (!response.ok) throw new Error("API error");

    weather = await response.json();

    renderCurrent();
    renderHourly();
    renderDaily();
  } catch (error) {
    console.error(error);
    toast("Не удалось получить погодные данные");
    $("weatherDescription").textContent = "Ошибка загрузки";
  }
}

function renderCurrent() {
  const data = weather.current;
  const info = condition(data.weather_code);

  $("cityName").textContent = city.name;
  $("currentDate").textContent = dateText(data.time, {
    weekday:"long",day:"numeric",month:"long"
  });

  $("weatherIcon").textContent = info[1];
  $("temperature").textContent = temp(data.temperature_2m);
  $("weatherDescription").textContent = info[0];
  $("humidity").textContent = data.relative_humidity_2m + "%";
  $("wind").textContent = Math.round(data.wind_speed_10m) + " км/ч";
  $("feels").textContent = temp(data.apparent_temperature) + unit();
  document.querySelector(".degree").textContent = unit();
}

function renderHourly() {
  const data = weather.hourly;
  const now = weather.current.time;
  let start = data.time.findIndex(t => t >= now);
  if (start < 0) start = 0;

  $("hourlyForecast").innerHTML =
    data.time.slice(start, start + 12).map((time, n) => {
      const i = start + n;
      const info = condition(data.weather_code[i]);

      return `
        <div class="hour-card ${n === 0 ? "active" : ""}">
          <small>${n === 0 ? "Сейчас" : time.slice(11,16)}</small>
          <div class="icon">${info[1]}</div>
          <strong>${temp(data.temperature_2m[i])}${unit()}</strong>
          <span class="rain">💧 ${data.precipitation_probability[i] ?? 0}%</span>
        </div>`;
    }).join("");
}

function renderDaily() {
  const data = weather.daily;

  $("dailyForecast").innerHTML = data.time.map((date, i) => {
    const info = condition(data.weather_code[i]);
    const day = i === 0 ? "Сегодня" :
      i === 1 ? "Завтра" :
      dateText(date + "T12:00:00", {weekday:"long"});

    return `
      <div class="day-row">
        <div class="day-name">${day}</div>
        <div class="day-icon">${info[1]}</div>
        <div class="day-desc">${info[0]}</div>
        <div class="day-temps">
          <strong>${temp(data.temperature_2m_max[i])}°</strong>
          <span>${temp(data.temperature_2m_min[i])}°</span>
        </div>
      </div>`;
  }).join("");
}

// ПОИСК ГОРОДОВ

async function searchCity() {
  const query = $("cityInput").value.trim();
  if (query.length < 2) return toast("Введи название города");

  $("searchBtn").disabled = true;

  try {
    const response = await fetch(
      `${GEO}?name=${encodeURIComponent(query)}&count=7&language=ru&format=json`
    );
    const data = await response.json();

    if (!data.results?.length) {
      toast("Город не найден");
      return;
    }

    $("searchResults").innerHTML = data.results.map((c, i) => `
      <button class="search-result" data-index="${i}">
        ${c.name}, ${c.country || ""}
      </button>
    `).join("");

    $("searchResults").classList.add("show");

    $("searchResults").querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => {
        const c = data.results[Number(button.dataset.index)];
        city = {
          name:c.name,
          latitude:c.latitude,
          longitude:c.longitude
        };
        $("searchResults").classList.remove("show");
        $("cityInput").value = "";
        loadWeather();
      });
    });
  } catch {
    toast("Ошибка поиска города");
  } finally {
    $("searchBtn").disabled = false;
  }
}

$("searchBtn").addEventListener("click", searchCity);
$("cityInput").addEventListener("keydown", e => {
  if (e.key === "Enter") searchCity();
});

$("locationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) return toast("Геолокация недоступна");

  navigator.geolocation.getCurrentPosition(
    async position => {
      city = {
        name:"Моё местоположение",
        latitude:position.coords.latitude,
        longitude:position.coords.longitude
      };
      loadWeather();
    },
    () => toast("Разреши доступ к местоположению")
  );
});

$("unitBtn").addEventListener("click", () => {
  celsius = !celsius;
  $("unitBtn").textContent = celsius ? "°C" : "°F";
  if (weather) {
    renderCurrent();
    renderHourly();
    renderDaily();
  }
});

// ПОДПИСКА

$("subscribeBtn").addEventListener("click", () => {
  openModal(
    "ATMOS PREMIUM",
    "Стоимость подписки — 6 599 ₽. Это демонстрационная версия оформления заказа. Реальное списание средств не производится.",
    "Посмотреть предложение"
  );
});

// СЛУЧАЙНАЯ РЕКЛАМА

const advertisements = [
  {
    icon:"✈️",
    title:"Время отправляться в путешествие",
    text:"Открой новые города и направления.",
    action:"О путешествиях"
  },
  {
    icon:"☕",
    title:"Согрей свой день",
    text:"Найди уютное место для отдыха.",
    action:"Посмотреть места"
  },
  {
    icon:"🎧",
    title:"Твоя музыка — твоя атмосфера",
    text:"Создай настроение для любой погоды.",
    action:"Подробнее"
  },
  {
    icon:"🏨",
    title:"Найди место для отдыха",
    text:"Посмотри варианты размещения для поездки.",
    action:"Посмотреть"
  },
  {
    icon:"🎟️",
    title:"Не пропускай события",
    text:"Выбирай мероприятия и планируй выходные.",
    action:"К событиям"
  }
];

const ad = advertisements[
  Math.floor(Math.random() * advertisements.length)
];

$("adIcon").textContent = ad.icon;
$("adTitle").textContent = ad.title;
$("adText").textContent = ad.text;
$("adBtn").textContent = ad.action + " ↗";

$("adBtn").addEventListener("click", () => {
  openModal("Рекламное предложение", ad.text,
    "Рекламный переход в демоверсии");
});

// ОЦЕНКА ПОГОДЫ

$("weatherRating").querySelectorAll("button").forEach(button => {
  button.addEventListener("click", () => {
    rating = Number(button.dataset.rating);

    $("weatherRating").querySelectorAll("button")
      .forEach(b => b.classList.toggle("selected", b === button));
  });
});

$("weatherTags").querySelectorAll("button").forEach(button => {
  button.addEventListener("click", () => {
    const tag = button.dataset.tag;

    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag);
      button.classList.remove("selected");
    } else {
      selectedTags.push(tag);
      button.classList.add("selected");
    }
  });
});

$("sendWeather").addEventListener("click", () => {
  if (!rating && !selectedTags.length && !$("weatherComment").value.trim()) {
    return toast("Сначала добавь оценку или наблюдение");
  }

  const report = {
    city:city.name,
    rating,
    tags:selectedTags,
    comment:$("weatherComment").value,
    date:new Date().toISOString()
  };

  const reports = JSON.parse(
    localStorage.getItem("atmosWeatherReports") || "[]"
  );

  reports.push(report);
  localStorage.setItem("atmosWeatherReports", JSON.stringify(reports));

  $("feedbackStatus").textContent =
    "Спасибо! Наблюдение сохранено на этом устройстве.";

  rating = 0;
  selectedTags = [];
  $("weatherComment").value = "";

  $("weatherRating").querySelectorAll("button")
    .forEach(b => b.classList.remove("selected"));

  $("weatherTags").querySelectorAll("button")
    .forEach(b => b.classList.remove("selected"));
});

// БИЛЕТЫ

const events = [
  {
    icon:"🎵",
    name:"Музыкальный вечер",
    description:"Концерт и живое выступление",
    price:1500
  },
  {
    icon:"🏒",
    name:"Хоккейный матч",
    description:"Спортивное событие",
    price:900
  },
  {
    icon:"🎭",
    name:"Театральный вечер",
    description:"Спектакль на большой сцене",
    price:1200
  },
  {
    icon:"🎬",
    name:"Киносеанс",
    description:"Большой экран и новые фильмы",
    price:650
  }
];

$("eventsList").innerHTML = events.map((event, index) => `
  <div class="event-card">
    <div class="event-icon">${event.icon}</div>
    <h3>${event.name}</h3>
    <p>${event.description}</p>
    <strong>${event.price.toLocaleString("ru-RU")} ₽</strong>
    <button class="primary-btn ticket-btn" data-index="${index}">
      Выбрать билет
    </button>
  </div>
`).join("");

document.querySelectorAll(".ticket-btn").forEach(button => {
  button.addEventListener("click", () => {
    const event = events[Number(button.dataset.index)];

    openModal(
      event.name,
      `Стоимость билета: ${event.price} ₽. Это демонстрационный заказ. Билет не выпущен, оплата не производится.`,
      "Подтвердить выбор"
    );
  });
});

// ТАКСИ

$("taxiBtn").addEventListener("click", () => {
  const from = $("taxiFrom").value.trim();
  const to = $("taxiTo").value.trim();

  if (!from || !to) return toast("Укажи оба адреса");

  const multiplier = Number($("taxiClass").value);
  const estimated = Math.round((250 + Math.random() * 350) * multiplier);

  $("taxiResult").textContent =
    `Предварительная стоимость: ${estimated.toLocaleString("ru-RU")} ₽. Демонстрационный расчёт, водитель не вызван.`;

  saveAction("taxi", {from,to,estimated});
});

// ДОСТАВКА

$("deliveryBtn").addEventListener("click", () => {
  const address = $("deliveryAddress").value.trim();
  const type = $("deliveryType").value;

  if (!address) return toast("Укажи адрес доставки");

  const price = {
    "Документы":250,
    "Продукты":350,
    "Посылка":400,
    "Еда":200
  }[type];

  $("deliveryResult").textContent =
    `Предварительная стоимость: ${price} ₽. Заявка не отправлена курьеру.`;

  saveAction("delivery", {address,type,price});
});

// СОХРАНЕНИЕ ДЕЙСТВИЙ

function saveAction(type, data) {
  const actions = JSON.parse(
    localStorage.getItem("atmosActions") || "[]"
  );

  actions.push({
    type,
    data,
    date:new Date().toISOString()
  });

  localStorage.setItem("atmosActions", JSON.stringify(actions));
}

// МОДАЛЬНОЕ ОКНО

function openModal(title, text, action) {
  $("modalTitle").textContent = title;
  $("modalText").textContent = text;
  $("modalAction").textContent = action;
  $("modal").classList.add("show");
}

function closeModal() {
  $("modal").classList.remove("show");
}

$("closeModal").addEventListener("click", closeModal);

$("modal").addEventListener("click", e => {
  if (e.target === $("modal")) closeModal();
});

$("modalAction").addEventListener("click", () => {
  closeModal();
  toast("Это демонстрационная функция ATMOS");
});

document.addEventListener("click", e => {
  if (!e.target.closest(".search-wrap")) {
    $("searchResults").classList.remove("show");
  }
});

// ЗАПУСК

loadWeather();

