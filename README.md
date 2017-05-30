# Crypto Candidates

A node script to filter cryptocurrencies with potential.

## First setup:

* Install [NodeJS LTS version](https://nodejs.org/en/)
* Install [Yarn](https://yarnpkg.com/en/)
* Install dependencies: `$ yarn install` in this project folder.
* Copy portfolio file: `$ cp portfolio.sample.json portfolio.json`.
* Include the currencies and amount which are currently in your portfolio in `portfolio.json`.
* Setup your filters in the `Filter parameters:` section of `index.js`.

## How to run:

Run `$ yarn start` in your terminal.

## Todo

* Sort result by price (or other parameter).
* Save previous result and show trend since last check.
* Move the filter parameters to its own file.
