# README

This script uses the Flickr API to produce a big csv list of European photos uploaded in a given date range.

## Prerequisites

- `nodejs` ([nodejs.org](https://nodejs.org/en/))

## Setup

- `config/local.json`
    - Create this file as a copy of `config/default.json`
    - Fill in the fields for the Flickr API key + secret
- Run `npm install` in the root directory of the project (the directory containing `package.json`)

## Running

- `node flickr.js` is the command to run the script. The following parameters allow the date range and the output file to be set:
    - `--start-date <YYYY-MM-DD HH:mm:ss>`
    - `--end-date <YYYY-MM-DD HH:mm:ss>`
    - `--output-file <output file>`
- Example run: 
    - `node flickr.js --start-date "2017-01-01 00:00:00" --end-date "2017-01-01 23:59:59" --output-file output/2017jan1.csv`