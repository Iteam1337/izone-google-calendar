'use strict'

const config = require('../config')
const google = require('googleapis')
const GoogleAuth = require('google-auth-library')

const SCOPES = ['https://www.googleapis.com/auth/calendar']

let _calendar = null

function auth () {
  return authorize(config.google.secret)
}

function createOauth2Client () {
  const credentials = config.google.secret

  let clientSecret = credentials.installed.client_secret
  let clientId = credentials.installed.client_id
  let redirectUrl = credentials.installed.redirect_uri
  let auth = new GoogleAuth()
  let oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)

  return oauth2Client
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize (credentials) {
  if (!credentials || !credentials.installed) {
    console.error('ERROR: google.authorize() failure. Credentials configuration seems to be missing.')
    return Promise.reject(new Error('Configuration seems to be missing.'))
  }

  return new Promise((resolve, reject) => {
    let oauth2Client = createOauth2Client()

    // Check if we have previously stored a token.
    if (config.google.token) {
      oauth2Client.credentials = config.google.token
      return resolve(oauth2Client)
    }

    return reject(new Error('Not authorized.'))
  })
}

function setup () {
  if (!_calendar) {
    _calendar = google.calendar('v3')
  }
}

function listCalendars (auth) {
  return new Promise((resolve, reject) => {
    setup()

    _calendar.calendars.get({
      auth,
      calendarId: config.google.calendar.id
    }, (error, res) => {
      if (error) {
        console.error('Error in listCalendars', error)
        return reject(error)
      }
      return resolve(res)
    })
  })
}

function listEvents (auth, timeMin, timeMax) {
  return new Promise((resolve, reject) => {
    setup()

    _calendar.events.list({
      auth: auth,
      calendarId: config.google.calendar.id,
      timeMin: timeMin,
      timeMax: timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    }, function (err, response) {
      if (err) {
        console.log('The API returned an error: ' + err)
        return
      }
      return resolve(response.items)
    })
  })
}

function updateEvent (auth, event) {
  return new Promise((resolve, reject) => {
    setup()

    _calendar.events.update({
      auth: auth,
      calendarId: config.google.calendar.id,
      eventId: event.id,
      resource: {
        summary: event.summary.replace(':', ';'),
        end: event.end,
        start: event.start
      }
    }, function (err, res) {
      if (err) {
        console.error('err', err)
        return
      }

      console.log('Marked time entry as imported', event.summary)
    })
  })
}

module.exports = {
  checkConfiguration: () => {
    return new Promise((resolve, reject) => {
      return auth()
        .then(() => {
          return resolve()
        })
    })
  },
  generateAuthUrl: () => {
    let oauth2Client = createOauth2Client()
    let authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    })

    return authUrl
  },
  getAccessToken: (token) => {
    return new Promise((resolve, reject) => {
      const oauth2Client = createOauth2Client()
      oauth2Client.getToken(token, function (err, token) {
        if (err) {
          console.log('Error while trying to retrieve access token', err)
          return reject(err)
        }

        return resolve(token)
      })
    })
  },
  getCalendars: () => {
    return auth()
      .then(auth => listCalendars(auth))
  },
  getEvents: (timeMin, timeMax) => {
    return auth()
      .then(auth => {
        return listEvents(auth, timeMin, timeMax)
      })
      .catch(error => {
        console.log('getEvents error', error)
        return Promise.reject(error)
      })
  },
  markEventImported: (event) => {
    return auth()
      .then(auth => {
        return updateEvent(auth, event)
      })
      .catch(error => {
        console.log('markEventImported error', error)
        return Promise.reject(error)
      })
  }
}
