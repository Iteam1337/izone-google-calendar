// TODO: Write code.

/*
 * This middleware handles user's Google Authorization.
 *
 * req.izone.user is expected to exist (set by previous middleware).
 */

'use strict'

const database = require('../adapters/database')
const google = require('../adapters/google')
const moment = require('moment')

module.exports = {
  validateGoogleAuthorization: (req, res, next) => {
    if (!req.izone.google) {
      req.izone.google = {}
    }

    const now = moment().format('x')
    const tokenExpiry = req.izone.user.p_google_token_expiry

    if (!tokenExpiry || now > tokenExpiry) {
      if (req.izone.setGoogleToken) {
        // User is sending an authorization token!
        return google.getAccessToken(req.izone.setGoogleToken)
          .then(token => {
            req.izone.google.accessToken = token.access_token
            return database.updateGoogleToken(req.izone.user.p_slack_user_id, token)
          })
          .then(() => {
            next()
          })
          .catch(error => {
            res.send({
              text: 'I am sorry, something went wrong when getting your access token from Google.'
            })

            console.error('Error when getting new access token for user.')
            console.error(error)

            return next(false)
          })
      }

      // Generate an authorization url for the user.
      const url = google.generateAuthUrl()
      res.send({
        text: 'You need to authorize Izone to access your Google Calendar.',
        attachments: [
          {
            text: `Step 1: visit ${url} and follow the instructions.`
          },
          {
            text: `Step 2: Copy the code you received from Google and paste in the following command`
          },
          {
            text: `/time setGoogleToken=CODE`
          }
        ]
      })

      next(false)
      return Promise.resolve()
    }

    req.izone.google.accessToken = req.izone.user.p_google_token_access_token

    next()
    return Promise.resolve()
  }
}
