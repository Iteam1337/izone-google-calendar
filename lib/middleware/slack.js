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
    const slackIdentity = { userId, userName }
    return database.getPersonBySlackIdentity(slackIdentity)
      .then(user => {
        if (!user || !user.length) {
          throw new Error('!user')
        }

        user = user[0]

        if (!user.p_slack_user_id || !user.p_slack_user_name !== userName) {
          // TODO: Handle what happens if someone takes the userName of a previous user...
          database.updatePerson(slackIdentity)
        }

        req.izone.user = user
      })
      .catch(error => {
        if (error.message === '!user') {
          message = {
            text: 'Sorry, your user is not configured yet.'
          }
        } else {
          message = error.message
          res.statusCode = 500
        }
      })
      .then(() => {
        if (!message) {
          return next()
        }

        res.statusCode = 200
        res.send(message)
        next(false)
      })
  }
}
