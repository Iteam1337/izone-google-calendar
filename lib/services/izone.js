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

  // Set status for this alias.
  SUMMARY.hours[alias].status = meta.status
}

module.exports = {
  getAllEvents,
  getIzoneUser,
  getWeekSummary: week => {
    SUMMARY.hours = {}
    SUMMARY.total = 0
    SUMMARY.health = 0
    SUMMARY.importedIds = {}
    return getAllEvents(week)
      .then(events => {
        events.izone.forEach(event => {
          SUMMARY.importedIds[event.jl_gcal_id] = {
            alias: event.jl_alias,
            description: event.jl_description,
            hours: event.jl_hours,
            matched: false,
            start: event.jl_starttime
          }

          updateSummary({
            alias: event.jl_alias,
            hours: event.jl_hours,
            isWorkout: aliasHelper.isWorkout(`${event.jl_alias}: ${event.jl_description}`),
            source: 'izone'
          })
        })

        events.calendar.forEach(event => {
          event.week = week

          const alias = event.summary.substring(0, event.summary.indexOf(':')).toLowerCase()
          const endtime = moment(event.end.dateTime || event.end.date)
          const starttime = moment(event.start.dateTime || event.start.date)
          const hours = moment.duration(endtime.diff(starttime)).asHours()

          if (SUMMARY.importedIds[event.id]) {
            // Item is already imported.
            const izoneAlias = SUMMARY.importedIds[event.id].alias.toLowerCase()
            const izoneHours = SUMMARY.importedIds[event.id].hours

            if (!SUMMARY.hours[`${alias}`]) {
              // Alias has changed.
              if (!SUMMARY.hours[`${izoneAlias}`]) {
                SUMMARY.hours[`${izoneAlias}`] = {
                  matched: true
                }
              } else {
                SUMMARY.hours[`${izoneAlias}`].matched = true
              }
              SUMMARY.hours[`${izoneAlias}`].status = 'error'
              return
            }

            // This one exists in database and can be matched with an event in the calendar.
            SUMMARY.hours[`${alias}`].matched = true

            if (`${alias}` !== izoneAlias) {
              // Alias has changed.
              SUMMARY.hours[`${alias}`].status = 'error'
              return
            }

            const start = starttime.format('YYYY-MM-DD HH:mm')
            const izoneStart = moment(SUMMARY.importedIds[event.id].start).format('YYYY-MM-DD HH:mm')
            if (start !== izoneStart) {
              // Start time has changed.
              SUMMARY.hours[`${alias}`].status = 'warning'
              return
            }

            if (hours !== izoneHours) {
              // Time duration differs.
              SUMMARY.hours[`${alias}`].status = 'warning'
              return
            }

            // TODO: Check if time entry exists only in database.
            // TODO: Handle time entries moved across week boundaries.

            let izoneDescription = SUMMARY.importedIds[event.id].description
            console.log('OK', izoneDescription)
            if (!izoneDescription) {
              izoneDescription = ''
            }

            izoneDescription = izoneDescription.replace(`${izoneAlias}:`, '')
            izoneDescription = izoneDescription.replace(`${izoneAlias}: `, '') // TODO: Replace with regex.
            const izoneSummary = `${izoneAlias}: ${izoneDescription}`

            if (event.summary !== izoneSummary.trim()) {
              console.log('hi there!')
              SUMMARY.hours[`${alias}`].status = 'warning'
              return
            }

            if (!SUMMARY.hours[`${alias}`]) {
              SUMMARY.hours[`${alias}`] = {
                status: 'ok'
              }
              return
            }

            SUMMARY.hours[`${alias}`].status = 'ok'
            return
          }

          updateSummary({
            alias: `${alias}`,
            hours,
            isWorkout: aliasHelper.isWorkout(event.summary),
            source: 'google',
            status: 'warning'
          })
        })

        return SUMMARY
      })
  }
}
