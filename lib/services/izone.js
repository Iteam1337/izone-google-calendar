const aliasHelper = require('../helpers/aliasHelper')
const database = require('../adapters/database')
const google = require('../adapters/google')
const weekHelper = require('../helpers/weekHelper')
const googleEventHelper = require('../helpers/googleEventHelper')

const moment = require('moment-timezone')
moment.tz.setDefault('Europe/Stockholm')

function getAllEvents ({ week, accessToken, username }) {
  return Promise
    .all([
      getCalendarEvents(week, accessToken),
      getIzoneEvents(week, username)
    ])
    .then(([calendar, izone]) => ({ calendar, izone }))
    .catch(error => console.error(error))
}

function isNotWorkout (event) {
  return !aliasHelper.isWorkout(event.summary)
}

function hasValidSummary (event) {
  return event.summary && event.summary.indexOf(':') !== -1
}

function getCalendarEvents (week, accessToken) {
  const { start, end } = getStartAndEndOfWeek(week)

  return google.getEvents(start, end, accessToken)
    .then(events => events.filter(isNotWorkout))
    .then(events => events.filter(hasValidSummary))
}

function getIzoneEvents (week, username) {
  const { start, end } = getStartAndEndOfWeek(week)
  return database.getJobLogs(start, end, username)
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

function doCalendarStuff (SUMMARY) {
  events.calendar.forEach(event => {
    event.week = week

    const alias = event.summary.substring(0, event.summary.indexOf(':')).toLowerCase()
    const duration = googleEventHelper.getDuration(event)

    if (SUMMARY.importedIds[event.id]) {
      // Item is already imported.
      const izoneAlias = SUMMARY.importedIds[event.id].alias.toLowerCase()
      const izoneHours = SUMMARY.importedIds[event.id].hours

      if (!SUMMARY.hours[alias]) {
        // Alias has changed.
        if (!SUMMARY.hours[izoneAlias]) {
          SUMMARY.hours[izoneAlias] = {
            matched: true
          }
        } else {
          SUMMARY.hours[izoneAlias].matched = true
        }
        SUMMARY.hours[izoneAlias].status = 'error'
        return
      }

      // This one exists in database and can be matched with an event in the calendar.
      SUMMARY.hours[alias].matched = true

      if (alias !== izoneAlias) {
        // Alias has changed.
        SUMMARY.hours[alias].status = 'error'
        return
      }

      const start = duration.start.format('YYYY-MM-DD HH:mm')
      const izoneStart = moment.utc(SUMMARY.importedIds[event.id].start).format('YYYY-MM-DD HH:mm')
      if (start !== izoneStart) {
        // Start time has changed.
        SUMMARY.hours[alias].status = 'warning'
        return
      }

      if (duration.hours !== izoneHours) {
        // Time duration differs.
        SUMMARY.hours[alias].status = 'warning'
        SUMMARY.hours[alias].hours = duration.hours
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
        SUMMARY.hours[alias].status = 'warning'
        return
      }

      if (!SUMMARY.hours[alias]) {
        SUMMARY.hours[alias] = {
          status: 'ok'
        }
        return
      }

      SUMMARY.hours[alias].status = 'ok'
      return
    }
  })
}

module.exports = {
  getAllEvents,
  doCalendarStuff,
  getWeekSummary: ({ week, accessToken, username }) => {
    return getAllEvents({ week, accessToken, username })
      .then(({ izone, calendar }) => {
        const groupedHours = izone
          .reduce((acc, event) => {
            const alias = event.jl_alias.toLowerCase()
            const hours = Math.ceil(event.jl_hours * 2) / 2

            if (!acc[alias]) {
              return acc[alias] = {
                alias, hours,
                isWorkout: aliasHelper.isWorkout(`${event.jl_alias}: ${event.jl_description}`),
                source: event.source
              }
            }
            acc[alias].hours += hours

            return acc
          }, {})

        return Object.keys(groupedHours).map(k => groupedHours[k])
      })
  }
}
