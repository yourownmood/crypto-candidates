'use strict'

const _ = require('lodash')
const chalk = require('chalk')
const omitDeep = require('omit-deep')
const request = require('request')
const portfolio = require('./settings/portfolio')
const filterParameters = require('./settings/parameters')

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
const apiUrl = 'https://api.coinmarketcap.com/v1/ticker/?convert=' + currency.toUpperCase()

const currencies = setCurrency(currency)
const decimals = determineDecimals(maxPrice)

callApi(apiUrl, processCandidates)

// Set currency rules

function setCurrency (currency) {
  let currencies

  if (currency === 'EUR') {
    currencies = {
      excludedCurrency: 'usd',
      currencySymbol: '€'
    }
  } else {
    currencies = {
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
  candidates.some(function (el) {
    if (el.name === name) {
      el.amount = amount
      el.cost = cost
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
    return (r['price_' + currency.toLowerCase()] < maxPrice &&
           r['24h_volume_' + currency.toLowerCase()] > minDailyVolume &&
           r['market_cap_' + currency.toLowerCase()] > minMarketCap &&
           r['percent_change_7d'] > minPercentChange7d &&
           r['name'] !== 'Bitcoin') || r['amount']
  })

  // Enrich myCandidates list with cost and profit
  for (let key in myCandidates) {
    if (myCandidates[key].cost > 0 && myCandidates[key].name !== 'Bitcoin') {
      // Conversion to BTC/MONEY
      valueInBTC = myCandidates[key].amount * myCandidates[key].price_btc
      valueInMoney = myCandidates[key].amount * myCandidates[key]['price_' + currency.toLowerCase()]
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
        if (candidates[key].price_eur < maxPrice && candidates[key]['24h_volume_eur'] > minDailyVolume && candidates[key].market_cap_eur > minMarketCap && candidates[key].percent_change_7d > minPercentChange7d) {
          console.log(
            chalk.bgBlack(
              chalk.white.bold(candidates[key].name),
              chalk.grey(' -'),
              chalk.grey('(' + candidates[key].amount + ' | ' + currencies.currencySymbol + parseFloat(candidates[key].amount * candidates[key].price_eur).toFixed(2) + ')')
            )
          )
        } else {
          console.log(
            chalk.bgBlack(
              chalk.grey.bold(candidates[key].name),
              chalk.grey(' -'),
              chalk.grey('(' + candidates[key].amount + ' | ' + currencies.currencySymbol + parseFloat(candidates[key].amount * candidates[key].price_eur).toFixed(2) + ')')
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
          candidates[key].price_eur < maxPrice
          ? chalk.white(currencies.currencySymbol + parseFloat(candidates[key].price_eur).toFixed(decimals.decimalPositionPlus))
          : chalk.grey(currencies.currencySymbol + parseFloat(candidates[key].price_eur).toFixed(decimals.decimalPosition)),
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
      totalValueBTC > totalCostBTC
      ? chalk.green(parseFloat(totalPercentageChange).toFixed(2) + '%')
      : chalk.red(totalPercentageChange + '%'),
      chalk.white(' Cost:', totalCostBTC),
      chalk.white('Value:', totalValueBTC)
    )
  )

  console.log(
    chalk.bgBlack(
      chalk.white('Money:', currencies.currencySymbol + parseFloat(totalValueMoney).toFixed(2))
    )
  )

  console.log('\r')
}
