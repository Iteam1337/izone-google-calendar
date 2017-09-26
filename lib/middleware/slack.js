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

    if (!req.izone) {
      req.izone = {}
    }

    if (!userId) {
      const error = new Error('No user_id supplied.')
      res.statusCode = 500
      res.end(error.message)
      next(error)
      return Promise.reject(error)
    }

    let message
    return database.getPersonBySlackIdentity({ userId, userName })
      .then(user => {
        if (!user || !user.p_id) {
          throw new Error('User not found or not authorized.')
        }

        req.izone.user = user
      })
      .catch(error => {
        message = error.message
        res.statusCode = 401
      })
      .then(() => {
        if (!message) {
          return next()
        }

        res.end(message)
        return next(new Error(message))
      })
  }
}
