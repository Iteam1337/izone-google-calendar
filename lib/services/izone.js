'use strict'

const aliasHelper = require('../helpers/aliasHelper')
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
        getCalendarEvents(week),
        getIzoneEvents(week)
      ])
      .then(events => {
        const calendar = []

        events[0].forEach(event => {
          const isWorkout = aliasHelper.isWorkout(event.summary)

          if (!event.summary) {
            return
          }

          if (event.summary.indexOf(':') === -1 && !isWorkout) {
            return {}
          }

          calendar.push(event)
        })

        return resolve({
          calendar,
          izone: events[1]
        })
      })
    })
    .catch(error => console.error(error))
  },
  getIzoneUser
}
