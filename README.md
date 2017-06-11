# Crypto Currency Candidates

A node script to filter cryptocurrencies with potential, combine it with own portfolio currencies, show trends and show changes since last run.

<img src='/docs/crypto-candidates-example.png?raw=true' width='425' alt='Crypto Candidates example' />

## First setup:

* Install [NodeJS LTS version](https://nodejs.org/en/)
* Install [Yarn](https://yarnpkg.com/en/)
* Install dependencies: `$ yarn install` in this project folder.
* Copy portfolio file: `$ cp settings/portfolio.sample.json settings/portfolio.json`.
* Copy parameters file: `$ cp settings/parameters.sample.js settings/parameters.js`.
* Include your currencies, amount and cost (in BTC, USD or EUR) which are currently in your portfolio in `settings/portfolio.json`.
* Setup your filter parameters in `settings/parameters.js`.

## How to run:

Run `$ yarn start` in your terminal.

## Todo

* ~~Move the filter parameters to its own file.~~
* ~~Include buy price in portfolio (EUR, USD, BTC) and do a conversion to the current situation.~~
* ~~Save total previous result and show total trend since last check.~~
* ~~Show difference in total history comparison instead of total amounts.~~
* ~~Show gain or loss per currency based on history search.~~
* ~~Include USD/EUR as cost currency.~~
* Support BTC character in console output.
* Include BTC calculations in console overview.
* Only compare/save history if history is different then current state.
* Sort result by price (or other parameter).

---

Donations are welcome at: 1AsfquPtC9RFvUuEKhbtzJcJW81pVLpVCn (bitcoin address) :)
