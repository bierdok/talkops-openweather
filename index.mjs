import { Extension, Parameter } from 'talkops'
import pkg from './package.json' with { type: 'json' }
import axios from 'axios'
import yaml from 'js-yaml'

import languages from './parameters/languages.json' with { type: 'json' }
import units from './parameters/units.json' with { type: 'json' }
import outputs from './parameters/outputs.json' with { type: 'json' }

import getWeatherFunction from './schemas/functions/get_weather.json' with { type: 'json' }
import getForecastFunction from './schemas/functions/get_forecast.json' with { type: 'json' }

const defaultLocation = new Parameter('DEFAULT_LOCATION')
  .setDescription('The default location.')
  .setPossibleValues(['New York', 'Geneva, Swiss', 'Paris, France'])

const language = new Parameter('LANGUAGE')
  .setDescription('The language.')
  .setDefaultValue('English')
  .setAvailableValues(Object.values(languages))

const temperatureUnit = new Parameter('TEMPERATURE_UNIT')
  .setDescription('The temperature unit to defined unit of measurement.')
  .setDefaultValue('Kelvin')
  .setAvailableValues(Object.values(units))

const apiKey = new Parameter('API_KEY').setDescription('The copied API key.')

const extension = new Extension()
  .setName('OpenWeather')
  .setWebsite('https://openweathermap.org/')
  .setCategory('Weather')
  .setIcon(
    'https://play-lh.googleusercontent.com/-8wkZVkXugyyke6sDPUP5xHKQMzK7Ub3ms2EK9Jr00uhf1fiMhLbqX7K9SdoxbAuhQ',
  )
  .setVersion(pkg.version)
  .setDockerRepository('bierdok/talkops-openweather')
  .setFeatures(['Current weather', 'Forecasts for the next 5 days'])
  .setinstallationSteps([
    '[Create an account](https://home.openweathermap.org/users/sign_up)',
    '[Generate an API key](https://home.openweathermap.org/api_keys)',
  ])
  .setParameters([defaultLocation, language, temperatureUnit, apiKey])

const api = axios.create({
  baseURL: 'https://api.openweathermap.org/data/2.5/',
})

let unit = 'standard'
for (let key in units) {
  if (units[key] !== temperatureUnit.getValue()) continue
  unit = key
}

let lang = 'en'
for (let key in languages) {
  if (languages[key] !== language.getValue()) continue
  lang = key
}

for (let key in outputs) {
  outputs[key].unit = outputs[key].units[unit]
  delete outputs[key].units
}

extension.setInstructions(`
You are a nice and pleasant weather assistant.
Provide general weather information and offer practical advice based on current weather conditions.
Round the temperatures to the nearest degree without decimals.

\`\`\` yaml
${yaml.dump({ defaultLocation: defaultLocation.getValue(), outputs })}
\`\`\`
`)

extension.setFunctionSchemas([getWeatherFunction, getForecastFunction])

// async function requestFromGeoCoordinates(endpoint, latitude, longitude) {
//   const parameters = {
//     lat: latitude,
//     lon: longitude,
//     lang: language,
//     units: unit,
//     appid: apiKey.getValue(),
//   };
//   const url = `${endpoint}?${new URLSearchParams(parameters).toString()}`;
//   try {
//     const response = await api.get(url);
//     return response.data;
//   } catch (err) {
//     extension.errors = [err.message];
//     return "Error.";
//   }
// }

async function request(endpoint, city, state, country) {
  const location = [city]
  state && location.push(state)
  country && location.push(country)
  const parameters = {
    q: location.join(','),
    lang,
    units: unit,
    appid: apiKey.getValue(),
  }
  const url = `${endpoint}?${new URLSearchParams(parameters).toString()}`
  try {
    const response = await api.get(url)
    return response.data
  } catch (err) {
    extension.errors = [err.message]
    return 'Error.'
  }
}

extension.setFunctions([
  // async function get_weather_from_geo_coordinates(latitude, longitude) {
  //   return await requestFromGeoCoordinates("weather", latitude, longitude);
  // },
  // async function get_forecast_from_geo_coordinates(latitude, longitude) {
  //   return await requestFromGeoCoordinates("forecast", latitude, longitude);
  // },
  async function get_weather(city, state, country) {
    return await request('weather', city, state, country)
  },
  async function get_forecast(city, state, country) {
    return await request('forecast', city, state, country)
  },
])
