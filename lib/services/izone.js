'use strict'

const aliasHelper = require('../helpers/aliasHelper')
const database = require('../adapters/database')
const google = require('../adapters/google')
const weekHelper = require('../helpers/weekHelper')

const moment = require('moment-timezone')
moment.tz.setDefault('Europe/Stockholm')

function getAllEvents (izone) {
  return new Promise((resolve, reject) => {
    Promise.all([
      getCalendarEvents(izone),
      getIzoneEvents(izone)
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

function getCalendarEvents (izone) {
  const weekStartEnd = getStartAndEndOfWeek(izone.week)
  return google.getEvents(weekStartEnd.start, weekStartEnd.end, izone.google.accessToken)
}

function getIzoneEvents (izone) {
  const weekStartEnd = getStartAndEndOfWeek(izone.week)
  return database.getJobLogs(weekStartEnd.start, weekStartEnd.end, izone.user.p_izusername)
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

function getGoogleEventDuration (event) {
  const allDay = !event.end.dateTime && event.end.date
  const end = moment(event.end.dateTime || event.end.date)
  const start = moment(event.start.dateTime || event.start.date)
  const hours = (allDay) ? 8 : moment.duration(end.diff(start)).asHours()

  return {
    allDay,
    end,
    hours,
    start
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
  getWeekSummary: izone => {
    SUMMARY.hours = {}
    SUMMARY.total = 0
    SUMMARY.health = 0
    SUMMARY.importedIds = {}
    return getAllEvents(izone)
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
          event.week = izone.week

          const alias = event.summary.substring(0, event.summary.indexOf(':')).toLowerCase()
          const duration = getGoogleEventDuration(event)

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

            const start = duration.start.format('YYYY-MM-DD HH:mm')
            const izoneStart = moment.utc(SUMMARY.importedIds[event.id].start).format('YYYY-MM-DD HH:mm')
            if (start !== izoneStart) {
              // Start time has changed.
              SUMMARY.hours[`${alias}`].status = 'warning'
              return
            }

            if (duration.hours !== izoneHours) {
              // Time duration differs.
              SUMMARY.hours[`${alias}`].status = 'warning'
              SUMMARY.hours[`${alias}`].hours = duration.hours
              return
            }

            // TODO: Check if time entry exists only in database.
            // TODO: Handle time entries moved across week boundaries.

            let izoneDescription = SUMMARY.importedIds[event.id].description
            if (!izoneDescription) {
              izoneDescription = ''
            }

            izoneDescription = izoneDescription.replace(`${izoneAlias}: `, '') // TODO: Replace with regex.
            izoneDescription = izoneDescription.replace(`${izoneAlias}:`, '')
            const izoneSummary = `${izoneAlias}: ${izoneDescription}`

            if (event.summary !== izoneSummary.trim()) {
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
            hours: duration.hours,
            isWorkout: aliasHelper.isWorkout(event.summary),
            source: 'google',
            status: 'warning'
          })
        })

        return SUMMARY
      })
  }
}
