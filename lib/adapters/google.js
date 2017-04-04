'use strict'

const fs = require('fs')
const config = require('../config')
const readline = require('readline')
const google = require('googleapis')
const GoogleAuth = require('google-auth-library')

const SCOPES = ['https://www.googleapis.com/auth/calendar']
const IZONE_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.izone/'
const TOKEN_PATH = IZONE_DIR + 'google-calendar-token.json'

let _calendar = null

function auth () {
  return authorize(config.google.secret)
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize (credentials) {
  return new Promise((resolve, reject) => {
    let clientSecret = credentials.installed.client_secret
    let clientId = credentials.installed.client_id
    let redirectUrl = credentials.installed.redirect_uris[0]
    let auth = new GoogleAuth()
    let oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
      if (err) {
        return getNewToken(oauth2Client)
          .then(token => {
            return resolve(token)
          })
      } else {
        oauth2Client.credentials = JSON.parse(token)
        return resolve(oauth2Client)
      }
    })
  })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken (oauth2Client) {
  return new Promise((resolve, reject) => {
    let authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    })
    console.log('Authorize this app by visiting this url: ', authUrl)
    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    console.log()
    rl.question('Enter the code from that page here: ', function (code) {
      rl.close()
      oauth2Client.getToken(code, function (err, token) {
        if (err) {
          console.log('Error while trying to retrieve access token', err)
          return
        }
        oauth2Client.credentials = token
        storeToken(token)
        return resolve(oauth2Client)
      })
    })
  })
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken (token) {
  try {
    fs.mkdirSync(IZONE_DIR)
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token))
  console.log('Token stored to ' + TOKEN_PATH)
  console.log()
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
      console.log()
      console.log('checkConfiguration')
      console.log()
      return auth()
        .then(() => {
          return resolve()
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
