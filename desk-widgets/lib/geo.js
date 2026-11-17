// Resolve a location from config: explicit latitude/longitude, or a city name
// geocoded once through Open-Meteo (free, no API key).
import { fetchJSON } from "./shell";
import { lang } from "./i18n";
import { widget } from "./config";

const cache = {};

const hasCoords = (c) =>
  c && c.latitude !== null && c.latitude !== undefined && c.longitude !== null && c.longitude !== undefined;

export function resolveLocation(cfg) {
  const own = cfg || {};
  const weather = widget("weather");
  const src = hasCoords(own) ? own : hasCoords(weather) ? weather : null;
  if (src) {
    return Promise.resolve({ lat: Number(src.latitude), lon: Number(src.longitude), name: src.city || own.city || "" });
  }
  const city = own.city || weather.city;
  if (!city) return Promise.reject(new Error("no location configured"));
  if (cache[city]) return Promise.resolve(cache[city]);
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=1&language=" + lang + "&name=" + encodeURIComponent(city);
  return fetchJSON(url).then((r) => {
    const g = r && r.results && r.results[0];
    if (!g) throw new Error("city not found: " + city);
    cache[city] = { lat: g.latitude, lon: g.longitude, name: city, timeZone: g.timezone };
    return cache[city];
  });
}
