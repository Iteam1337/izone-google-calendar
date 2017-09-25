'use strict'

const config = require('../config')
const database = require('../adapters/database')

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
  },
  user: (req, res, next) => {
    let userId = req.params.user_id
    let userName = req.params.user_name

    let error
    if (!userId) {
      error = new Error('No user_id supplied.')
      res.statusCode = 500
    }

    return database.getPersonBySlackIdentity({ userId, userName })
      .then(user => {
        req.params.mappedUser = user
      })
      .catch(error => {
        error = new Error('Unauthorized.')
        res.statusCode = 401
      })
      .catch(() => {
        if (!error) {
          return next()
        }

        res.end(error.message)
        return next(error)
      })
  }
}
