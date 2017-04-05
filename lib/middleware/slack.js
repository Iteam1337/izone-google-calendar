'use strict'

const config = require('../config')

module.exports = {
  token: (req, res, next) => {
    if (req.params.token === config.slack.token) {
      return next()
    }

    const error = new Error('Invalid slack token.')
    res.statusCode = 401
    res.end(error.message)
    next(error)
  }
}
