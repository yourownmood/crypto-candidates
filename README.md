# Crypto Candidates

A node script to filter cryptocurrencies with potential.

## First setup:

* Install [NodeJS LTS version](https://nodejs.org/en/)
* Install [Yarn](https://yarnpkg.com/en/)
* Install dependencies: `$ yarn install` in this project folder.
* Copy portfolio file: `$ cp settings/portfolio.sample.json settings/portfolio.json`.
* Copy parameters file: `$ cp settings/parameters.sample.js settings/parameters.js`.
* Include the currencies, amount and cost (in BTC) which are currently in your portfolio in `settings/portfolio.json`.
* Setup your filter parameters in `settings/parameters.js`.

## How to run:

Run `$ yarn start` in your terminal.

## Todo

* ~~Move the filter parameters to its own file.~~
* ~~Include buy price in portfolio (EUR, USD, BTC) and do a conversion to the current situation.~~
* ~~ Save total previous result and show total trend since last check. ~~
* Show gain or loss per currency based on history search.
* Sort result by price (or other parameter).
