# Crypto Candidates

A node script to filter cryptocurrencies with potential.

## First setup:

* Install [NodeJS LTS version](https://nodejs.org/en/)
* Install [Yarn](https://yarnpkg.com/en/)
* Install dependencies: `$ yarn install` in this project folder.
* Copy portfolio file: `$ cp settings/portfolio.sample.json settings/portfolio.json`.
* Copy parameters file: `$ cp settings/parameters.sample.js settings/parameters.js`.
* Include the currencies and amount which are currently in your portfolio in `settings/portfolio.json`.
* Setup your filter parameters in `settings/parameters.js`.

## How to run:

Run `$ yarn start` in your terminal.

## Todo

* ~~Move the filter parameters to its own file.~~
* Sort result by price (or other parameter).
* Save previous result and show trend since last check.
