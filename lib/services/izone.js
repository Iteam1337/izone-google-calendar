'use strict'

const aliasHelper = require('../helpers/aliasHelper')
const database = require('../adapters/database')
const google = require('../adapters/google')
const moment = require('moment')
const weekHelper = require('../helpers/weekHelper')

function getAllEvents (week) {
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
}

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

// Used by getWeekSummary()
const SUMMARY = {}

/**
 * Updates the module-wide variable SUMMARY.
 * @param {*} meta
 */
function updateSummary (meta) {
  const alias = meta.alias.toLowerCase()

  if (!SUMMARY.hours[alias]) {
    SUMMARY.hours[alias] = {
      isWorkout: meta.isWorkout,
      hours: meta.hours,
      source: meta.source
    }
  } else {
    SUMMARY.hours[alias].hours += meta.hours
    SUMMARY.hours[alias].source = meta.source
  }

  if (meta.isWorkout) {
    SUMMARY.health += meta.hours
  } else {
    SUMMARY.total += meta.hours
  }
}

module.exports = {
  getAllEvents,
  getIzoneUser,
  getWeekSummary: week => {
    SUMMARY.hours = {}
    SUMMARY.total = 0
    SUMMARY.health = 0
    SUMMARY.importedIds = []
    return getAllEvents(week)
      .then(events => {
        events.izone.forEach(event => {
          SUMMARY.importedIds.push(event.jl_gcal_id)

          updateSummary({
            alias: event.jl_alias,
            hours: event.jl_hours,
            isWorkout: aliasHelper.isWorkout(`${event.jl_alias}: ${event.jl_description}`),
            source: 'izone'
          })
        })

        events.calendar.forEach(event => {
          event.week = week
          if (SUMMARY.importedIds.indexOf(event.id) > -1) {
            // Item is already imported.

            // TODO: Check if time differs.

            return
          }

          const alias = event.summary.substring(0, event.summary.indexOf(':'))
          const endtime = moment(event.end.dateTime || event.end.date)
          const starttime = moment(event.start.dateTime || event.start.date)
          const hours = moment.duration(endtime.diff(starttime)).asHours()

          updateSummary({
            alias,
            hours,
            isWorkout: aliasHelper.isWorkout(event.summary),
            source: 'google'
          })
        })

        return SUMMARY
      })
  }
}
