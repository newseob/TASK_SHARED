import { useEffect, useState } from "react";

interface WeatherDay {
  date: string;
  code: number;
  min: number;
  max: number;
}

interface WeatherApiResponse {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
  };
}

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=37.6532&longitude=127.0477&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=7";

const getWeatherIcon = (code: number) => {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "🌧️";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
};

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });

  return `${date.getMonth() + 1}/${date.getDate()} ${weekday}`;
};

const isWeekend = (value: string) => {
  const day = new Date(`${value}T00:00:00`).getDay();
  return day === 0 || day === 6;
};

export default function WeatherBox() {
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem("weatherBox_showList");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("weatherBox_showList", JSON.stringify(showList));
  }, [showList]);

  useEffect(() => {
    let cancelled = false;

    const loadWeather = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(WEATHER_URL);
        if (!response.ok) {
          throw new Error("weather request failed");
        }

        const data = (await response.json()) as WeatherApiResponse;
        const daily = data.daily;
        const times = daily?.time ?? [];
        const codes = daily?.weather_code ?? [];
        const mins = daily?.temperature_2m_min ?? [];
        const maxes = daily?.temperature_2m_max ?? [];

        const nextDays = times.slice(0, 7).map((date, index) => ({
          date,
          code: codes[index] ?? -1,
          min: mins[index] ?? 0,
          max: maxes[index] ?? 0,
        }));

        if (!cancelled) {
          setWeatherDays(nextDays);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("날씨를 불러오지 못했어요");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full rounded bg-transparent shadow-none transition-opacity">
      <div className="mt-[3px] flex items-center justify-between">
        <button
          type="button"
          className="mx-1 cursor-pointer text-xs text-zinc-400 transition hover:text-zinc-900 dark:hover:text-white"
          onClick={() => setShowList(!showList)}
          aria-label={showList ? "숨기기" : "펼치기"}
          title={showList ? "숨기기" : "펼치기"}
        >
          {showList ? "▽" : "▷"}
        </button>

        <h2 className="min-w-0 flex-1 truncate bg-transparent text-xs text-blue-600 outline-none dark:text-blue-300">
          날씨
        </h2>
      </div>

      {showList && (
        <div className="mt-2 overflow-x-auto">
          <div className="grid min-w-[430px] grid-cols-7 gap-1">
            {isLoading &&
              Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded px-1 py-1.5 text-center text-xs text-zinc-400"
                >
                  ...
                </div>
              ))}

            {!isLoading &&
              !errorMessage &&
              weatherDays.map((day, index) => (
                <div
                  key={day.date}
                  className="rounded px-1 py-1.5 text-center"
                >
                  <div
                    className={`truncate text-[11px] font-semibold ${
                      isWeekend(day.date)
                        ? "text-red-500 dark:text-red-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {formatDate(day.date)}
                  </div>
                  <div className="py-1 text-lg leading-none">{getWeatherIcon(day.code)}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {Math.round(day.min)}°/{Math.round(day.max)}°
                  </div>
                </div>
              ))}

            {!isLoading && errorMessage && (
              <div className="col-span-7 rounded px-2 py-2 text-xs text-zinc-400">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
