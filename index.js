'use strict'

const _ = require('lodash')
const chalk = require('chalk')
const omitDeep = require('omit-deep')
const request = require('request')
const consoleTable = require('console.table')
const portfolio = require('./portfolio')

// Filter parameters

const currency = 'EUR' // EUR or USD
const maxPrice = 0.01
const minDailyVolume = 100000
const minMarketCap = 10000000
const minPercentChange7d = -100
const currencyException = 'Bitcoin'

// Check currency to exclude

let excludedCurrency

if(currency === 'EUR') {
  excludedCurrency = 'usd'
} else {
  excludedCurrency = 'eur'
}

// Call api

const api = 'https://api.coinmarketcap.com/v1/ticker/?convert=' + currency.toUpperCase()

request(api, function (error, response, body) {
  if(!error) {
    return filterCandidates(body)
  }
})

// Filter candidates

function filterCandidates(candidates) {
  candidates = JSON.parse(candidates);
  candidates = omitDeep(candidates, ['id', 'price_' + excludedCurrency, '24h_volume_' + excludedCurrency, 'market_cap_' + excludedCurrency, 'last_updated'])

  let myCandidates = _.filter(candidates, function(r) {
    return (r['price_eur'] < maxPrice &&
           r['24h_volume_eur'] > minDailyVolume &&
           r['market_cap_eur'] > minMarketCap &&
           r['percent_change_7d'] > minPercentChange7d) || r['name'] === currencyException
  });

  return printCandidates(myCandidates)
}

function printCandidates(candidates) {
  console.log(chalk.bold.white('\n---------------------------------------------'))
  console.log(chalk.bold.white('Candidates:'))
  console.log(chalk.bold.white('---------------------------------------------'))

  console.table(candidates)

  console.log(chalk.bold.white('\n---------------------------------------------'))
  console.log(chalk.bold.white('Filtered candidates: '), chalk.bold.yellow(candidates.length))
  console.log(chalk.bold.white('---------------------------------------------'))

  for(let key in candidates) {
    if(portfolio.includes(candidates[key].name)) {
      console.log(chalk.bold.red(candidates[key].name), chalk.grey('owned'))
    } else {
      console.log(chalk.bold.green(candidates[key].name))
    }
  }

  console.log('\n')
}
