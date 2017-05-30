'use strict'

const _ = require('lodash')
const chalk = require('chalk')
const omitDeep = require('omit-deep')
const request = require('request')
const consoleTable = require('console.table')
const portfolio = require('./portfolio')

// Filter parameters

const currency = 'EUR' // EUR or USD
const maxPrice = 0.015
const minDailyVolume = 100000
const minMarketCap = 10000000
const minPercentChange7d = -100

let excludedCurrency
let currencySymbol
let decimalPosition
let decimalPositionPlus
const apiUrl = 'https://api.coinmarketcap.com/v1/ticker/?convert=' + currency.toUpperCase()

setCurrency(currency)
determineDecimals(maxPrice)
callApi(apiUrl)

// Set currency rules

function setCurrency(currency) {
  if(currency === 'EUR') {
    excludedCurrency = 'usd'
    currencySymbol = '€'
  } else {
    excludedCurrency = 'eur'
    currencySymbol = '$'
  }
}

// Determine decimals

function determineDecimals(decimals) {
  decimalPosition = ((decimals + "").split('.')[1] || []).length;
  decimalPositionPlus = decimalPosition + 2;
}

// Check candidate name with porfolio name

function checkAndAdd(name, amount, candidates) {
  var id = candidates.length + 1;
  var found = candidates.some(function (el) {
    if(el.name === name) {
      el.amount = amount
    }
  })
}

// Call api

function callApi(apiUrl) {
  request(apiUrl, function (error, response, body) {
    if(!error) {
      return filterCandidates(body)
    }
  })
}

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

function printCandidates(candidates) {
  console.log(chalk.bold.white('\n------------------------------------------------------------'))
  console.log(chalk.bold.white('Candidates:'))
  console.log(chalk.bold.white('------------------------------------------------------------'))

  console.table(candidates)

  console.log(chalk.bold.white('\n'))
  console.log(chalk.bold.white('Filtered candidates: '), chalk.bold.yellow(candidates.length))
  console.log(chalk.bold.white('------------------------------------------------------------\n'))

  for(let key in candidates) {
    if(candidates[key].amount) {
      if(candidates[key].price_eur < maxPrice && candidates[key]['24h_volume_eur'] > minDailyVolume && candidates[key].market_cap_eur > minMarketCap && candidates[key].percent_change_7d > minPercentChange7d ) {
        console.log(
          chalk.yellow.bold('*'),
          chalk.white.bold(candidates[key].name),
          chalk.grey(' -'),
          chalk.grey('(' + candidates[key].amount + ' | ' + currencySymbol + ' ' + parseFloat(candidates[key].amount * candidates[key].price_eur).toFixed(2) + ')')
        )
      } else {
        console.log(
          chalk.yellow.bold('*'),
          chalk.grey.bold(candidates[key].name),
          chalk.grey(' -'),
          chalk.grey('(' + candidates[key].amount + ' | ' + currencySymbol + ' ' + parseFloat(candidates[key].amount * candidates[key].price_eur).toFixed(2) + ')')
        )
      }
    } else {
      console.log(chalk.bold.white(candidates[key].name))
    }

    console.log(
      chalk.grey('['),
      candidates[key].percent_change_1h > 0 ?
        chalk.green(candidates[key].percent_change_1h)
        :
        chalk.red.bold(candidates[key].percent_change_1h),
      chalk.grey(' 1h ]'),
      chalk.grey('['),
      candidates[key].percent_change_24h > 0 ?
        chalk.green(candidates[key].percent_change_24h)
        :
        chalk.red.bold(candidates[key].percent_change_24h),
      chalk.grey(' 24h ]'),
      chalk.grey('['),
      candidates[key].percent_change_7d > 0 ?
        chalk.green(candidates[key].percent_change_7d)
        :
        chalk.red.bold(candidates[key].percent_change_7d),
      chalk.grey(' 7d ]'),
      chalk.grey('[ '),
      candidates[key].price_eur < maxPrice ?
        chalk.white(currencySymbol + parseFloat(candidates[key].price_eur).toFixed(decimalPositionPlus))
        :
        chalk.grey(currencySymbol + parseFloat(candidates[key].price_eur).toFixed(decimalPosition)),
      chalk.grey(' ]')
    )
    console.log(chalk.grey('------------------------------------------------------------'))
  }
  console.log('\n')
}
