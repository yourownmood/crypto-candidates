'use strict'

const _ = require('lodash')
const chalk = require('chalk')
const jsonfile = require('jsonfile')
const omitDeep = require('omit-deep')
const request = require('request')

const filterParameters = require('./settings/parameters')
const portfolio = require('./settings/portfolio')

let history

try {
  history = require('./history')
} catch (err) {
  history = undefined
}

const parameters = filterParameters.parameters
const currency = parameters.currency
const maxPrice = parameters.maxPrice
const minDailyVolume = parameters.minDailyVolume
const minMarketCap = parameters.minMarketCap
const minPercentChange7d = parameters.minPercentChange7d

let valueInBTC = 0
let valueInMoney = 0
let percentageChange = 0
let totalCostBTC = 0
let totalValueBTC = 0
let totalPercentageChange = 0
let totalValueMoney = 0
let historyTotalCostBTC = 0
let historyTotalValueBTC = 0
let historyTotalPercentageChange = 0

const apiUrl = 'https://api.coinmarketcap.com/v1/ticker/?convert=' + currency.toUpperCase()

const currencies = setCurrency(currency)
const decimals = determineDecimals(maxPrice)

callApi(apiUrl, processCandidates)

// Set currency rules

function setCurrency (currency) {
  let currencies

  if (currency === 'EUR') {
    currencies = {
      lowerCase: 'eur',
      excludedCurrency: 'usd',
      currencySymbol: '€'
    }
  } else {
    currencies = {
      lowerCase: 'usd',
      excludedCurrency: 'usd',
      currencySymbol: '€'
    }
  }

  return currencies
}

// Determine decimals

function determineDecimals (number) {
  const decimalPosition = ((number + '').split('.')[1] || []).length
  const decimalPositionPlus = decimalPosition + 2

  const decimals = {
    decimalPosition: decimalPosition,
    decimalPositionPlus: decimalPositionPlus
  }

  return decimals
}

// Check candidate name with porfolio name

function checkAndAdd (name, amount, cost, candidates) {
  candidates.some(function (obj) {
    if (obj.name === name) {
      obj.amount = amount
      obj.cost = cost
    }
  })
}

// Call api

function callApi (apiUrl, callback) {
  request(apiUrl, function (error, response, body) {
    if (error) {
      return console.error('Api connection failed: ', error)
    }

    callback(body)
  })
}

// Process candidates

function processCandidates (body) {
  filterCandidates(body, printCandidates)
}

// Filter candidates

function filterCandidates (candidates, callback) {
  // Parse api body
  candidates = JSON.parse(candidates)

  // Remove keys not needed keys
  candidates = omitDeep(candidates, ['id', 'price_' + currencies.excludedCurrency, '24h_volume_' + currencies.excludedCurrency, 'market_cap_' + currencies.excludedCurrency, 'last_updated', 'available_supply'])

  // Enriches api with portfolio
  for (let key in portfolio) {
    checkAndAdd(portfolio[key].name, portfolio[key].amount, portfolio[key].cost, candidates)
  }

  // Build myCandidates list
  let myCandidates = _.filter(candidates, function (r) {
    return (r['price_' + currencies.lowerCase] < maxPrice &&
           r['24h_volume_' + currencies.lowerCase] > minDailyVolume &&
           r['market_cap_' + currencies.lowerCase] > minMarketCap &&
           r['percent_change_7d'] > minPercentChange7d &&
           r['name'] !== 'Bitcoin') || r['amount']
  })

  // Enrich myCandidates list with cost and profit
  for (let key in myCandidates) {
    if (myCandidates[key].cost > 0 && myCandidates[key].name !== 'Bitcoin') {
      // Conversion to BTC/MONEY
      valueInBTC = myCandidates[key].amount * myCandidates[key].price_btc
      valueInMoney = myCandidates[key].amount * myCandidates[key]['price_' + currencies.lowerCase]
      percentageChange = ((valueInBTC - myCandidates[key].cost) / myCandidates[key].cost) * 100

      // Push conversions in myCandidates
      myCandidates[key].valueInBTC = valueInBTC
      myCandidates[key].valueInMoney = valueInMoney
      myCandidates[key].percentageChange = percentageChange

      // Calculate combined value and cost
      totalCostBTC = totalCostBTC + myCandidates[key].cost
      totalValueBTC = totalValueBTC + valueInBTC
      totalPercentageChange = ((totalValueBTC - totalCostBTC) / totalValueBTC) * 100
      totalValueMoney = totalValueMoney + valueInMoney
    }
  }

  // Gather history totals

  if (history) {
    for (let key in history) {
      if (history[key].cost > 0 && history[key].name !== 'Bitcoin') {
        historyTotalCostBTC = historyTotalCostBTC + history[key].cost
        historyTotalValueBTC = historyTotalValueBTC + history[key].valueInBTC
        historyTotalPercentageChange = ((historyTotalValueBTC - historyTotalCostBTC) / historyTotalValueBTC) * 100
      }
    }
  }

  callback(myCandidates)
}

function printCandidates (candidates) {
  console.log(
    chalk.bgBlack(
      chalk.bold.white('\nFiltered candidates: '), chalk.bold.yellow(candidates.length)
    )
  )
  console.log(
    chalk.bgBlack(
      chalk.bold.white('------------------------------------------------------------')
    )
  )

  for (let key in candidates) {
    if (candidates[key].name !== 'Bitcoin') {
      if (candidates[key].amount) {
        if (candidates[key]['price_' + currencies.lowerCase] < maxPrice && candidates[key]['24h_volume_' + currencies.lowerCase] > minDailyVolume && candidates[key]['market_cap_' + currencies.lowerCase] > minMarketCap && candidates[key].percent_change_7d > minPercentChange7d) {
          console.log(
            chalk.bgBlack(
              chalk.white.bold(candidates[key].name),
              chalk.grey(' -'),
              chalk.grey('(' + candidates[key].amount + ' | ' + currencies.currencySymbol + parseFloat(candidates[key].amount * candidates[key]['price_' + currencies.lowerCase]).toFixed(2) + ')')
            )
          )
        } else {
          console.log(
            chalk.bgBlack(
              chalk.grey.bold(candidates[key].name),
              chalk.grey(' -'),
              chalk.grey('(' + candidates[key].amount + ' | ' + currencies.currencySymbol + parseFloat(candidates[key].amount * candidates[key]['price_' + currencies.lowerCase]).toFixed(2) + ')')
            )
          )
        }
      } else {
        console.log(chalk.bgBlack.bold.white(candidates[key].name))
      }

      console.log(
        chalk.bgBlack(
          chalk.grey('['),
          candidates[key].percent_change_1h > 0
          ? chalk.green(candidates[key].percent_change_1h)
          : chalk.red.bold(candidates[key].percent_change_1h),
          chalk.grey(' 1h ]'),
          chalk.grey('['),
          candidates[key].percent_change_24h > 0
          ? chalk.green(candidates[key].percent_change_24h)
          : chalk.red.bold(candidates[key].percent_change_24h),
          chalk.grey(' 24h ]'),
          chalk.grey('['),
          candidates[key].percent_change_7d > 0
          ? chalk.green(candidates[key].percent_change_7d)
          : chalk.red.bold(candidates[key].percent_change_7d),
          chalk.grey(' 7d ]'),
          chalk.grey('[ '),
          candidates[key]['price_' + currencies.lowerCase] < maxPrice
          ? chalk.white(currencies.currencySymbol + parseFloat(candidates[key]['price_' + currencies.lowerCase]).toFixed(decimals.decimalPositionPlus))
          : chalk.grey(currencies.currencySymbol + parseFloat(candidates[key]['price_' + currencies.lowerCase]).toFixed(decimals.decimalPosition)),
          chalk.grey(' ]')
        )
      )

      if (candidates[key].cost > 0) {
        console.log(
          chalk.bgBlack(
            candidates[key].percentageChange > 0
            ? chalk.green(parseFloat(candidates[key].percentageChange).toFixed(1) + '%')
            : chalk.red(parseFloat(candidates[key].percentageChange).toFixed(1) + '%'),
            '| Cost:', parseFloat(candidates[key].cost).toFixed(decimals.decimalPositionPlus),
            '| Value:', parseFloat(candidates[key].valueInBTC).toFixed(decimals.decimalPositionPlus)
          )
        )
      }

      console.log('\r')
    }
  }

  console.log(
    chalk.bgBlack(
      chalk.bold.white('------------------------------------------------------------')
    )
  )

  console.log(
    chalk.bgBlack(
      history === undefined
      ? ''
      : historyTotalPercentageChange === totalPercentageChange
      ? chalk.bold.grey('--')
      : historyTotalPercentageChange < totalPercentageChange
      ? chalk.bold.green('_/')
      : chalk.bold.red('‾\\'),
      totalValueBTC > totalCostBTC
      ? chalk.green(parseFloat(totalPercentageChange).toFixed(2) + '%')
      : chalk.red(totalPercentageChange + '%'),
      history !== undefined
      ? chalk.grey(parseFloat(historyTotalPercentageChange).toFixed(2) + '%')
      : '',
      chalk.white('| BTC:', parseFloat(totalValueBTC - totalCostBTC).toFixed(3)),
      history !== undefined
      ? chalk.grey(parseFloat(historyTotalValueBTC - historyTotalCostBTC).toFixed(3))
      : '',
      chalk.white('|', currencies.currencySymbol + parseFloat(totalValueMoney).toFixed(2))
    )
  )

  console.log(
    chalk.bgBlack(
      chalk.grey('Cost:', totalCostBTC),
      chalk.grey('Value:', totalValueBTC)
    )
  )

  console.log('\r')

  if ((historyTotalValueBTC !== totalValueBTC) || (historyTotalPercentageChange !== totalPercentageChange)) {
    savingHistory(candidates)
  } else {
    console.log('History not saved.')
  }
}

function savingHistory (data) {
  const file = 'history.json'

  jsonfile.writeFile(file, data, {spaces: 2}, function (err) {
    if (err) {
      console.error(err)
    } else {
      console.error('History saved.')
    }
  })
}
