export type JejuLocation = {
  id: string;
  name: string;
  district: string;
  latitude: number;
  longitude: number;
};

export type HourForecast = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  visibility: number;
};

export type WeatherBundle = {
  source: "Open-Meteo";
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature: number;
    humidity: number;
    apparentTemperature: number;
    isDay: boolean;
    precipitation: number;
    rain: number;
    weatherCode: number;
    cloudCover: number;
    windSpeed: number;
  };
  minutely: Array<{
    time: string;
    precipitation: number;
    rain: number;
    weatherCode: number;
  }>;
  hourly: HourForecast[];
  daily: {
    time: string;
    weatherCode: number;
    temperatureMax: number;
    temperatureMin: number;
    precipitationProbabilityMax: number;
  };
  air: {
    time: string;
    pm10: number;
    pm25: number;
    europeanAqi: number;
  };
  weatherNext: {
    source: "Google WeatherNext 2 via Open-Meteo";
    time: string;
    memberCount: number;
    rainMembers: number;
    rainProbability: number;
    meanPrecipitation: number;
    temperatureMean: number;
    temperatureMin: number;
    temperatureMax: number;
    temperatureThreshold: number;
    warmMembers: number;
    warmProbability: number;
    windMean: number;
    windMin: number;
    windMax: number;
    windThreshold: number;
    windyMembers: number;
    windyProbability: number;
    cloudMean: number;
    cloudThreshold: number;
    cloudyMembers: number;
    cloudyProbability: number;
  } | null;
};

export const JEJU_LOCATIONS: JejuLocation[] = [
  { id: "cheomdan", name: "내 위치 · 첨단로", district: "제주시 첨단로 300 · 63309", latitude: 33.446006, longitude: 126.570715 },
  { id: "ara", name: "제주 아라동", district: "제주시", latitude: 33.49309, longitude: 126.55684 },
  { id: "cityhall", name: "제주 시청", district: "제주시", latitude: 33.49962, longitude: 126.53119 },
  { id: "aewol", name: "애월읍", district: "제주시", latitude: 33.46235, longitude: 126.31155 },
  { id: "seongsan", name: "성산읍", district: "서귀포시", latitude: 33.45806, longitude: 126.94245 },
  { id: "seogwipo", name: "서귀포 시청", district: "서귀포시", latitude: 33.25405, longitude: 126.5601 },
];

type ForecastResponse = {
  latitude: number;
  longitude: number;
  timezone: string;
  current: Record<string, number | string>;
  minutely_15: Record<string, Array<number | string>>;
  hourly: Record<string, Array<number | string>>;
  daily: Record<string, Array<number | string>>;
};

type AirQualityResponse = {
  current: Record<string, number | string>;
};

type EnsembleResponse = {
  hourly: Record<string, Array<number | string>>;
};

function numberAt(values: Array<number | string> | undefined, index: number) {
  const value = Number(values?.[index] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function currentNumber(values: Record<string, number | string>, key: string) {
  const value = Number(values[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function memberValues(hourly: Record<string, Array<number | string>>, variable: string, index: number) {
  return Object.entries(hourly)
    .filter(([key]) => key === variable || key.startsWith(`${variable}_member`))
    .map(([, values]) => numberAt(values, index))
    .filter((value) => Number.isFinite(value));
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchJejuWeather(location: JejuLocation, signal?: AbortSignal): Promise<WeatherBundle> {
  const forecastParams = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m",
    minutely_15: "precipitation,rain,weather_code",
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,visibility",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Asia/Seoul",
    forecast_minutely_15: "16",
    forecast_hours: "12",
    forecast_days: "3",
  });

  const airParams = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "pm10,pm2_5,european_aqi",
    timezone: "Asia/Seoul",
  });

  const weatherNextParams = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: "precipitation,temperature_2m,wind_speed_10m,cloud_cover",
    models: "google_weathernext2_ensemble",
    timezone: "Asia/Seoul",
    forecast_hours: "12",
  });

  const [forecast, air, weatherNext] = await Promise.all([
    getJson<ForecastResponse>(`https://api.open-meteo.com/v1/forecast?${forecastParams}`, signal),
    getJson<AirQualityResponse>(`https://air-quality-api.open-meteo.com/v1/air-quality?${airParams}`, signal),
    getJson<EnsembleResponse>(`https://ensemble-api.open-meteo.com/v1/ensemble?${weatherNextParams}`, signal).catch((error: unknown) => {
      if (signal?.aborted) throw error;
      return null;
    }),
  ]);

  const minutelyTimes = forecast.minutely_15.time ?? [];
  const hourlyTimes = forecast.hourly.time ?? [];
  const weatherNextTime = String(weatherNext?.hourly.time?.[0] ?? "");
  const weatherNextPrecipitation = weatherNext ? memberValues(weatherNext.hourly, "precipitation", 0) : [];
  const weatherNextTemperatures = weatherNext ? memberValues(weatherNext.hourly, "temperature_2m", 0) : [];
  const weatherNextWinds = weatherNext ? memberValues(weatherNext.hourly, "wind_speed_10m", 0) : [];
  const weatherNextClouds = weatherNext ? memberValues(weatherNext.hourly, "cloud_cover", 0) : [];
  const rainMembers = weatherNextPrecipitation.filter((value) => value >= 0.05).length;
  const temperatureThreshold = 27;
  const warmMembers = weatherNextTemperatures.filter((value) => value >= temperatureThreshold).length;
  const windThreshold = 20;
  const windyMembers = weatherNextWinds.filter((value) => value >= windThreshold).length;
  const cloudThreshold = 70;
  const cloudyMembers = weatherNextClouds.filter((value) => value >= cloudThreshold).length;

  return {
    source: "Open-Meteo",
    latitude: forecast.latitude,
    longitude: forecast.longitude,
    timezone: forecast.timezone,
    current: {
      time: String(forecast.current.time ?? ""),
      temperature: currentNumber(forecast.current, "temperature_2m"),
      humidity: currentNumber(forecast.current, "relative_humidity_2m"),
      apparentTemperature: currentNumber(forecast.current, "apparent_temperature"),
      isDay: currentNumber(forecast.current, "is_day") === 1,
      precipitation: currentNumber(forecast.current, "precipitation"),
      rain: currentNumber(forecast.current, "rain"),
      weatherCode: currentNumber(forecast.current, "weather_code"),
      cloudCover: currentNumber(forecast.current, "cloud_cover"),
      windSpeed: currentNumber(forecast.current, "wind_speed_10m"),
    },
    minutely: minutelyTimes.map((time, index) => ({
      time: String(time),
      precipitation: numberAt(forecast.minutely_15.precipitation, index),
      rain: numberAt(forecast.minutely_15.rain, index),
      weatherCode: numberAt(forecast.minutely_15.weather_code, index),
    })),
    hourly: hourlyTimes.map((time, index) => ({
      time: String(time),
      temperature: numberAt(forecast.hourly.temperature_2m, index),
      apparentTemperature: numberAt(forecast.hourly.apparent_temperature, index),
      precipitationProbability: numberAt(forecast.hourly.precipitation_probability, index),
      precipitation: numberAt(forecast.hourly.precipitation, index),
      weatherCode: numberAt(forecast.hourly.weather_code, index),
      visibility: numberAt(forecast.hourly.visibility, index),
    })),
    daily: {
      time: String(forecast.daily.time?.[0] ?? ""),
      weatherCode: numberAt(forecast.daily.weather_code, 0),
      temperatureMax: numberAt(forecast.daily.temperature_2m_max, 0),
      temperatureMin: numberAt(forecast.daily.temperature_2m_min, 0),
      precipitationProbabilityMax: numberAt(forecast.daily.precipitation_probability_max, 0),
    },
    air: {
      time: String(air.current.time ?? ""),
      pm10: currentNumber(air.current, "pm10"),
      pm25: currentNumber(air.current, "pm2_5"),
      europeanAqi: currentNumber(air.current, "european_aqi"),
    },
    weatherNext: weatherNextTime && weatherNextPrecipitation.length
      ? {
          source: "Google WeatherNext 2 via Open-Meteo",
          time: weatherNextTime,
          memberCount: weatherNextPrecipitation.length,
          rainMembers,
          rainProbability: Math.round((rainMembers / weatherNextPrecipitation.length) * 100),
          meanPrecipitation: mean(weatherNextPrecipitation),
          temperatureMean: mean(weatherNextTemperatures),
          temperatureMin: weatherNextTemperatures.length ? Math.min(...weatherNextTemperatures) : 0,
          temperatureMax: weatherNextTemperatures.length ? Math.max(...weatherNextTemperatures) : 0,
          temperatureThreshold,
          warmMembers,
          warmProbability: weatherNextTemperatures.length ? Math.round((warmMembers / weatherNextTemperatures.length) * 100) : 0,
          windMean: mean(weatherNextWinds),
          windMin: weatherNextWinds.length ? Math.min(...weatherNextWinds) : 0,
          windMax: weatherNextWinds.length ? Math.max(...weatherNextWinds) : 0,
          windThreshold,
          windyMembers,
          windyProbability: weatherNextWinds.length ? Math.round((windyMembers / weatherNextWinds.length) * 100) : 0,
          cloudMean: mean(weatherNextClouds),
          cloudThreshold,
          cloudyMembers,
          cloudyProbability: weatherNextClouds.length ? Math.round((cloudyMembers / weatherNextClouds.length) * 100) : 0,
        }
      : null,
  };
}

export function isRainCode(code: number) {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

export function weatherLabel(code: number) {
  if (code === 0) return "맑음";
  if (code <= 2) return "구름 조금";
  if (code === 3) return "흐림";
  if (code >= 45 && code <= 48) return "안개";
  if (code >= 51 && code <= 57) return "이슬비";
  if (code >= 61 && code <= 67) return "비";
  if (code >= 71 && code <= 77) return "눈";
  if (code >= 80 && code <= 82) return "소나기";
  if (code >= 95) return "뇌우";
  return "변화 가능";
}
