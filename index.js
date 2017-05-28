'use strict'
const _ = require('lodash')
const chalk = require('chalk')
const omitDeep = require('omit-deep')
const request = require('request')

const api = 'https://api.coinmarketcap.com/v1/ticker/?convert=EUR'
const price = 0.01
const dailyVolume = 100000
const marketCap = 10000000
const percentChange7d = -100

request(api, function (error, response, body) {
  if(!error) {
    return filterCandidates(body)
  }
});

function filterCandidates(candidates) {
  candidates = JSON.parse(candidates);
  candidates = omitDeep(candidates, ['id', 'price_usd', '24h_volume_usd', 'market_cap_usd', 'last_updated'])

  let myCandidates = _.filter(candidates, function(r) {
    return r['price_eur'] < price &&
           r['24h_volume_eur'] > dailyVolume &&
           r['market_cap_eur'] > marketCap &&
           r['percent_change_7d'] > percentChange7d
  });

  console.log(chalk.bold.white('\nCandidates:\n'))
  console.log(JSON.stringify(myCandidates, null, 4))
  console.log(chalk.bold.yellow('\n---------------------------------------------\n'))
  console.log(chalk.bold.white('Filtered candidates: '), chalk.bold.yellow(myCandidates.length, '\n'))
}
