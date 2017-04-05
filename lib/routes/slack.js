'use strict'

const slackService = require('../services/slack')
const weekHelper = require('../helpers/weekHelper')

/**
 * Helpers.
 */
function parseParameters (command) {
  const params = {}
  
  if (!command) {
    return params
  }

  const commandParams = command.split(' ')

  commandParams.forEach(param => {
    params.week = parseParameter('week', param) || params.week
  })

  return params
}

function parseParameter (name, raw) {
  const pattern = `${name}=`
  if (raw.indexOf(pattern) > -1) {
    return raw.substr(pattern.length)
  }
}

module.exports = {
  button: (req, res, next) => {
    console.log('')
    console.log('Yey! A button was pressed!')
    console.log('body', req.body)
    console.log('params', req.params)
    res.send('a button was pressed')
  },
  summary: (req, res, next) => {
    const parameters = parseParameters(req.params.text)
    if (!parameters.week) {
      parameters.week = weekHelper.getWeekForDate(new Date())
    }

    return slackService.summary(parameters)
      .then(data => {
        res.send(data)
        next()
      })
      .catch(error => {
        console.log('ERROR', '/slack', req.params, error)
        res.statusCode = 500
        res.send(error)
        next(error)
      })
  }
}
