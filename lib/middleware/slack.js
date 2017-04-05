'use strict'

const config = require('../config')

module.exports = {
  token: (req, res, next) => {
    let token = req.params.token
    if (!token) {
      if (req.params.payload) {
        const payload = JSON.parse(req.params.payload)
        token = payload.token
      }
    }
    if (token === config.slack.token) {
      return next()
    }

    const error = new Error('Invalid slack token.')
    res.statusCode = 401
    res.end(error.message)
    next(error)
  }
}
