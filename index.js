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

// Check currency to exclude

let excludedCurrency
currency === 'EUR' ? excludedCurrency = 'usd' : excludedCurrency = 'eur'

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
  candidates = omitDeep(candidates, ['id', 'price_' + excludedCurrency, '24h_volume_' + excludedCurrency, 'market_cap_' + excludedCurrency, 'last_updated', 'available_supply'])

  for(let key in portfolio) {
    checkAndAdd(portfolio[key].name, portfolio[key].amount, candidates)
  }

  let myCandidates = _.filter(candidates, function(r) {
    return (r['price_eur'] < maxPrice &&
           r['24h_volume_eur'] > minDailyVolume &&
           r['market_cap_eur'] > minMarketCap &&
           r['percent_change_7d'] > minPercentChange7d) || r['amount']
  });

  return printCandidates(myCandidates)
}

function checkAndAdd(name, amount, candidates) {
  var id = candidates.length + 1;
  var found = candidates.some(function (el) {
    if(el.name === name) {
      el.amount = amount
    }
  })
}

function printCandidates(candidates) {
  console.log(chalk.bold.white('\n---------------------------------------------'))
  console.log(chalk.bold.white('Candidates:'))
  console.log(chalk.bold.white('---------------------------------------------'))

  console.table(candidates)

  console.log(chalk.bold.white('\n---------------------------------------------'))
  console.log(chalk.bold.white('Filtered candidates: '), chalk.bold.yellow(candidates.length))
  console.log(chalk.bold.white('---------------------------------------------'))
  console.log(chalk.grey('percent change 24h'))
  console.log(chalk.grey('---------------------------------------------'))

  for(let key in candidates) {
    if(candidates[key].amount) {
      console.log(
        chalk.bold(candidates[key].name),
        chalk.grey(' -'),
        candidates[key].percent_change_24h > 0 ? chalk.green(candidates[key].percent_change_24h) : chalk.red.bold(candidates[key].percent_change_24h),
        chalk.grey('(' + candidates[key].amount +')')
      )
    } else {
      console.log(
        chalk.bold.yellow(candidates[key].name),
        chalk.grey(' - '),
        candidates[key].percent_change_24h > 0 ? chalk.green(candidates[key].percent_change_24h) : chalk.red.bold(candidates[key].percent_change_24h)
      )
    }
  }
  console.log('\n')
}
