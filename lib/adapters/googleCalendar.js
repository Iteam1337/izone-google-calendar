'use strict'

var fs = require('fs')
const config = require('../config')
var readline = require('readline')
var google = require('googleapis')
var googleAuth = require('google-auth-library')

var SCOPES = ['https://www.googleapis.com/auth/calendar']
var IZONE_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.izone/'
var TOKEN_PATH = IZONE_DIR + 'google-calendar-token.json'

let _calendar = null

function auth () {
  return new Promise((resolve, reject) => {
    // Load client secrets from a local file.
    fs.readFile(`${IZONE_DIR}client_secret.json`, function processClientSecrets(err, content) {
      if (err) {
        console.log('Error loading client secret file: ' + err)
        return
      }
      // Authorize a client with the loaded credentials, then call the
      // Google Calendar API.
      return authorize(JSON.parse(content))
        .then(auth => {
          return resolve(auth)
        })
    })
  })
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  return new Promise((resolve, reject) => {
    var clientSecret = credentials.installed.client_secret
    var clientId = credentials.installed.client_id
    var redirectUrl = credentials.installed.redirect_uris[0]
    var auth = new googleAuth()
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {token
      if (err) {
        return getNewToken(oauth2Client)
      } else {
        oauth2Client.credentials = JSON.parse(token)
        return resolve(oauth2Client)
      }
    });
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
function getNewToken(oauth2Client) {
  return new Promise((resolve, reject) => {
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
      rl.close();
      oauth2Client.getToken(code, function(err, token) {
        if (err) {
          console.log('Error while trying to retrieve access token', err);
          return;
        }
        oauth2Client.credentials = token;
        storeToken(token);
        return resolve(oauth2Client);
      });
    });
  })
}

function setup () {
  if (!_calendar) {
    _calendar = google.calendar('v3')
  }
}

function listCalendars (auth) {
  return new Promise((resolve, reject), () => {
    setup()

    _calendar.calendars.get({
      auth,
      calendarId: config.google.calendar.id
    }, (err, res) => {
      if (error) {
        console.error('Error in listCalendars', error)
        return reject(error)
      }
      return resolve(res)
    })
  })
}

function listEvents(auth) {
  return new Promise((resolve, reject) => {
    setup()

    // console.log((new Date()).toISOString())
    _calendar.events.list({
      auth: auth,
      calendarId: config.google.calendar.id,
      timeMin: '2017-01-23T00:00:00.000Z',
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err)
        return
      }
      var events = response.items
      return resolve(response.items)
    });
  })
}

function updateEvent (auth, event) {
  return new Promise((resolve, reject), () => {
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

      console.log('Updated', event.summary)
      return
    })
  })
}

module.exports = {
  getEvents: () => {
    return auth()
      .then(auth => {
        return listEvents(auth)
      })
      .catch(error => {
        console.log('getEvents error', error)
      })
  }
}
