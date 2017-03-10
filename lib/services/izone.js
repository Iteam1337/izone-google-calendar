'use strict'

const database = require('../adapters/database')
const google = require('../adapters/google')
const weekHelper = require('../helpers/weekHelper')

function getCalendarEvents (week) {
  const weekStartEnd = getStartAndEndOfWeek(week)
  return google.getEvents(weekStartEnd.start, weekStartEnd.end)
}

function getIzoneEvents (week) {
  const weekStartEnd = getStartAndEndOfWeek(week)
  return getIzoneUser()
    .then(user => {
      return database.getJobLogs(weekStartEnd.start, weekStartEnd.end, user.alias)
    })
}

function getIzoneUser () {
  return google.getCalendars()
    .then(c => {
      return database.getPerson(c.id)
    })
    .then(p => {
      if (p && p[0]) {
        p = p[0]
        return {
          alias: p.p_shortname,
          email: p.p_email,
          firstname: p.p_firstname,
          lastname: p.p_lastname,
          title: p.p_title
        }
      }
    })
}

function getStartAndEndOfWeek (week) {
  const weekObject = weekHelper.getWeek(week)

  let timeMin = `${weekObject.Monday}T00:00:00.000Z`
  let timeMax = `${weekObject.Sunday}T23:59:59.000Z`

  return {
    start: timeMin,
    end: timeMax
  }
}

module.exports = {
  getAllEvents: (week) => {
    return new Promise((resolve, reject) => {
      Promise.all([
        getIzoneEvents(week),
        getCalendarEvents(week)
      ])
      .then(events => {
        return resolve({
          izone: events[0],
          calendar: events[1]
        })
      })
    })
    .catch(error => console.error(error))
  },
  getIzoneUser
}
