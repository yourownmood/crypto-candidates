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
let valueInCurrency = 0
let percentageChange = 0
let totalCostBTC = 0
let totalValueBTC = 0
let totalPercentageChange = 0
let totalValueCurrency = 0
let historyValueInBTC = 0
let historyPercentageChange = 0
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
      currencySymbol: '€'
    }
  } else {
    currencies = {
      lowerCase: 'usd',
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
  candidates = omitDeep(candidates, ['id', 'last_updated', 'available_supply'])

  // Enriches api with portfolio
  for (let key in portfolio) {
    checkAndAdd(portfolio[key].name, portfolio[key].amount, portfolio[key].cost, candidates)
  }

  // Build myCandidates list
  let myCandidates = _.filter(candidates, function (r) {
    return (r['price_' + currencies.lowerCase] < maxPrice &&
           r['24h_volume_' + currencies.lowerCase] > minDailyVolume &&
           r['market_cap_' + currencies.lowerCase] > minMarketCap &&
           r['percent_change_7d'] > minPercentChange7d) || r['amount']
  })

  // Enrich myCandidates list with cost and profit
  for (let key in myCandidates) {
    if (myCandidates[key].cost && myCandidates[key].cost.amount > 0 && myCandidates[key].cost.currency === 'BTC') {
      // Conversion to BTC/MONEY
      valueInBTC = myCandidates[key].amount * myCandidates[key].price_btc
      valueInCurrency = myCandidates[key].amount * myCandidates[key]['price_' + currencies.lowerCase]
      percentageChange = ((valueInBTC - myCandidates[key].cost.amount) / myCandidates[key].cost.amount) * 100

      // Push conversions in myCandidates
      myCandidates[key].valueInBTC = valueInBTC
      myCandidates[key].valueInCurrency = valueInCurrency
      myCandidates[key].percentageChange = percentageChange

      // Calculate combined value and cost
      totalCostBTC = totalCostBTC + myCandidates[key].cost.amount
      totalValueBTC = totalValueBTC + valueInBTC
      totalPercentageChange = totalPercentageChange + percentageChange
      totalValueCurrency = totalValueCurrency + valueInCurrency
    }
  }

  // Gather history totals

  if (history) {
    for (let key in history) {
      if (history[key].cost && history[key].cost.amount > 0 && history[key].cost.currency === 'BTC') {
        // History conversion to BTC/MONEY
        historyValueInBTC = history[key].amount * history[key].price_btc
        historyPercentageChange = ((historyValueInBTC - history[key].cost.amount) / history[key].cost.amount) * 100

        // Push history conversions in myCandidates
        // TODO: match myCandidates with History 'checkAndAdd'
        myCandidates[key].historyValueInBTC = historyValueInBTC
        myCandidates[key].historyPercentageChange = historyPercentageChange

        // Calculate combined history value and history cost
        historyTotalCostBTC = historyTotalCostBTC + history[key].cost.amount
        historyTotalValueBTC = historyTotalValueBTC + history[key].valueInBTC
        historyTotalPercentageChange = historyTotalPercentageChange + historyPercentageChange
      }
    }
  }

  callback(myCandidates)
}

function printCandidates (candidates) {
  console.log(
    chalk.bold(
      '\nFiltered candidates: ', chalk.yellow(candidates.length),
      '\n------------------------------------------------------------'
    )
  )

  for (let key in candidates) {
    if (candidates[key].amount) {
      if (candidates[key]['price_' + currencies.lowerCase] < maxPrice && candidates[key]['24h_volume_' + currencies.lowerCase] > minDailyVolume && candidates[key]['market_cap_' + currencies.lowerCase] > minMarketCap && candidates[key].percent_change_7d > minPercentChange7d) {
        console.log(
          chalk.bold(candidates[key].name),
          chalk.grey('- (' + candidates[key].amount + ' | ' + currencies.currencySymbol + parseFloat(candidates[key].amount * candidates[key]['price_' + currencies.lowerCase]).toFixed(2) + ')')
        )
      } else {
        console.log(
          chalk.grey.bold(candidates[key].name),
          chalk.grey('- (' + candidates[key].amount + ' | ' + currencies.currencySymbol + parseFloat(candidates[key].amount * candidates[key]['price_' + currencies.lowerCase]).toFixed(2) + ')')
        )
      }
    } else {
      console.log(chalk.bold(candidates[key].name))
    }

    console.log(
      chalk.grey('['),
      candidates[key].percent_change_1h > 0
      ? chalk.green(candidates[key].percent_change_1h)
      : chalk.red.bold(candidates[key].percent_change_1h),
      chalk.grey('1h ]'),
      chalk.grey('['),
      candidates[key].percent_change_24h > 0
      ? chalk.green(candidates[key].percent_change_24h)
      : chalk.red.bold(candidates[key].percent_change_24h),
      chalk.grey('24h ]'),
      chalk.grey('['),
      candidates[key].percent_change_7d > 0
      ? chalk.green(candidates[key].percent_change_7d)
      : chalk.red.bold(candidates[key].percent_change_7d),
      chalk.grey('7d ]'),
      chalk.grey('['),
      candidates[key]['price_' + currencies.lowerCase] < maxPrice
      ? currencies.currencySymbol + parseFloat(candidates[key]['price_' + currencies.lowerCase]).toFixed(decimals.decimalPositionPlus)
      : chalk.grey(currencies.currencySymbol + parseFloat(candidates[key]['price_' + currencies.lowerCase]).toFixed(decimals.decimalPosition)),
      chalk.grey(']')
    )

    if (candidates[key].cost && candidates[key].cost.amount > 0 && candidates[key].cost.currency === 'BTC') {
      console.log(
        history === undefined
        ? ''
        : candidates[key].historyPercentageChange === candidates[key].percentageChange
        ? chalk.bold.grey('--')
        : candidates[key].historyPercentageChange < candidates[key].percentageChange
        ? chalk.bold.green('_/')
        : chalk.bold.red('‾\\'),
        candidates[key].percentageChange > 0
        ? chalk.green(parseFloat(candidates[key].percentageChange).toFixed(1) + '%')
        : chalk.red(parseFloat(candidates[key].percentageChange).toFixed(1) + '%'),
        history !== undefined
        ? chalk.grey(parseFloat((candidates[key].percentageChange - candidates[key].historyPercentageChange)).toFixed(1) + '%')
        : '',
        '| BTC:', parseFloat(candidates[key].valueInBTC).toFixed(decimals.decimalPositionPlus),
        history === undefined
        ? ''
        : chalk.bold.grey(parseFloat(((candidates[key].valueInBTC) - (candidates[key].historyValueInBTC))).toFixed(decimals.decimalPositionPlus)),
        '| Cost:', parseFloat(candidates[key].cost.amount).toFixed(decimals.decimalPositionPlus)
      )
    }

    console.log('\r')
  }

  console.log(
    chalk.bold('------------------------------------------------------------\n'),
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
    ? chalk.grey(parseFloat((totalPercentageChange - historyTotalPercentageChange)).toFixed(2) + '%')
    : '',
    '| BTC:', parseFloat(totalValueBTC - totalCostBTC).toFixed(3),
    history !== undefined
    ? chalk.grey(parseFloat(((totalValueBTC - totalCostBTC) - (historyTotalValueBTC - historyTotalCostBTC))).toFixed(3))
    : ''
  )

  console.log(
    chalk.grey(
      'Cost BTC:', totalCostBTC,
      'Value BTC:', totalValueBTC,
      currencies.currencySymbol + parseFloat(totalValueCurrency).toFixed(2)
    )
  )

  console.log('\r')

  // TODO: if candidates[key].history ===  candidates[key].current
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
