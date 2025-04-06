import { Extension, Parameter } from 'talkops'
import axios from 'axios'
import yaml from 'js-yaml'

import languages from './parameters/languages.json' with { type: 'json' }
import units from './parameters/units.json' with { type: 'json' }
import outputs from './parameters/outputs.json' with { type: 'json' }

import getWeatherFunction from './schemas/functions/get_weather.json' with { type: 'json' }
import getForecastFunction from './schemas/functions/get_forecast.json' with { type: 'json' }

const apiKey = new Parameter('API_KEY').setDescription('The copied API key.').setType('password')

const defaultLocation = new Parameter('DEFAULT_LOCATION')
  .setDescription('The default location.')
  .setPossibleValues(['New York', 'Geneva, Swiss', 'Paris, France'])

const language = new Parameter('LANGUAGE')
  .setDescription('The language.')
  .setDefaultValue('English')
  .setAvailableValues(Object.values(languages))
  .setType('select')

const temperatureUnit = new Parameter('TEMPERATURE_UNIT')
  .setDescription('The temperature unit to defined unit of measurement.')
  .setDefaultValue('Kelvin')
  .setAvailableValues(Object.values(units))
  .setType('select')

const extension = new Extension()
  .setName('OpenWeather')
  .setWebsite('https://openweathermap.org/')
  .setCategory('weather')
  .setIcon(
    'https://play-lh.googleusercontent.com/-8wkZVkXugyyke6sDPUP5xHKQMzK7Ub3ms2EK9Jr00uhf1fiMhLbqX7K9SdoxbAuhQ',
  )
  .setFeatures(['Current weather', 'Forecasts for the next 5 days'])
  .setinstallationSteps([
    '[Create an account](https://home.openweathermap.org/users/sign_up)',
    '[Generate an API key](https://home.openweathermap.org/api_keys)',
  ])
  .setParameters([apiKey, defaultLocation, language, temperatureUnit])

const api = axios.create({
  baseURL: 'https://api.openweathermap.org/data/2.5/',
})

let unit = 'standard'
let lang = 'en'

function refresh() {
  for (let key in units) {
    if (units[key] !== temperatureUnit.getValue()) continue
    unit = key
  }
  for (let key in languages) {
    if (languages[key] !== language.getValue()) continue
    lang = key
  }
  let output = {}
  for (let key in outputs) {
    output[key] = {
      description: outputs[key].description,
      unit: outputs[key].units[unit],
    }
  }
  extension.setInstructions(`
You are a nice and pleasant weather assistant.
Provide general weather information and offer practical advice based on current weather conditions.
Round the temperatures to the nearest degree without decimals.

\`\`\` yaml
${yaml.dump({ defaultLocation: defaultLocation.getValue(), output })}
\`\`\`
  `)
}
refresh()

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
//     console.error(err.message)
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
    console.error(err.message)
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

extension.setBootstrap(refresh)
