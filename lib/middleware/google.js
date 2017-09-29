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

function getAccessTokenFromCode (userId, code) {
  return google.getAccessToken(code)
    .then(token => {
      return updateDatabase(userId, token)
    })
}

function getAccessTokenFromRefreshToken (userId, refreshToken) {
  return google.refreshAccessToken(refreshToken)
    .then(token => {
      return updateDatabase(userId, token)
    })
}

function updateDatabase (userId, googleToken) {
  return database.updateGoogleToken(userId, googleToken)
    .then(() => {
      return googleToken.access_token
    })
}

function errorHandler (error, res, next) {
  res.send({
    text: 'I am sorry, something went wrong when getting your access token from Google.'
  })

  console.error('Error when getting new access token for user.')
  console.error(error)

  return next(false)
}

function generateAuthorizationHelpResponse (res, next) {
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

module.exports = {
  validateGoogleAuthorization: (req, res, next) => {
    if (!req.izone.google) {
      req.izone.google = {}
    }

    const now = moment().format('x')
    const tokenExpiry = req.izone.user.p_google_token_expiry
    const userId = req.izone.user.p_slack_user_id

    const noValidToken = !tokenExpiry || now > tokenExpiry || req.izone.getGoogleAuthUrl
    const getNewTokenFromCode = req.izone.setGoogleToken && !req.izone.getGoogleAuthUrl
    const refreshToken = req.izone.user.p_google_token_refresh_token && !req.izone.getGoogleAuthUrl

    if (noValidToken) {
      if (getNewTokenFromCode) {
        return getAccessTokenFromCode(userId, req.izone.setGoogleToken)
          .then(accessToken => {
            req.izone.google.accessToken = accessToken
            return next()
          })
          .catch(error => {
            return errorHandler(error, res, next)
          })
      }

      if (refreshToken) {
        return getAccessTokenFromRefreshToken(userId, req.izone.user.p_google_token_refresh_token)
          .then(accessToken => {
            req.izone.google.accessToken = accessToken
            return next()
          })
          .catch(error => {
            return errorHandler(error, res, next)
          })
      }

      return generateAuthorizationHelpResponse(res, next)
    }

    // If everything is OK, proceed.
    req.izone.google.accessToken = req.izone.user.p_google_token_access_token

    next()
    return Promise.resolve()
  }
}
