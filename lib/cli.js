'use strict'

const config = require('./config')
const moment = require('moment')
const readline = require('readline')
const aliasHelper = require('./helpers/aliasHelper')
const weekHelper = require('./helpers/weekHelper')
const googleAdapter = require('./adapters/google')
const databaseAdapter = require('./adapters/database')

const SUMMARY = {
  hours: {},
  total: 0,
  health: 0,
  importedIds: []
}

function updateSummary (meta) {
  const alias = meta.alias.toLowerCase()

  if (!SUMMARY.hours[alias]) {
    SUMMARY.hours[alias] = {
      isWorkout: meta.isWorkout,
      hours: meta.hours 
    }
  } else {
    SUMMARY.hours[alias].hours += meta.hours
  }

  if (meta.isWorkout) {
    SUMMARY.health += meta.hours
  } else {
    SUMMARY.total += meta.hours
  }
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

function getCalendarEvents (week) {
  const weekStartEnd = getStartAndEndOfWeek(week)
  return googleAdapter.getEvents(weekStartEnd.start, weekStartEnd.end)
}

function getIzoneEvents (week) {
  const weekStartEnd = getStartAndEndOfWeek(week)
  return databaseAdapter.getJobLogs(weekStartEnd.start, weekStartEnd.end, config.izone.user)
}

function prettyPrintDescription (description) {
  if (description && description !== '-') {
    console.log('  ', `"${description}"`)
  }
}

function prettyPrint (timeEntry) {
  console.log()

  if (timeEntry.job) {
    console.log(`${timeEntry.importedMark || ' '} `, `[${timeEntry.job.comp_name}] ${timeEntry.job.job_title} (ID: ${timeEntry.job.job_id})`)
  }

  prettyPrintDescription(timeEntry.event.summary || timeEntry.event.jl_description)

  if (weekHelper.getWeekForDate(timeEntry.start) === weekHelper.getWeekForDate(new Date())) {
    console.log('  ', `${moment(timeEntry.start).calendar()} till ${moment(timeEntry.end).format('HH:mm')}`)
  } else {
    console.log('  ', `${moment(timeEntry.start).format('YYYY-MM-DD HH:mm')} till ${moment(timeEntry.end).format('HH:mm')}`)
  }
}

function listGoogleCalendarEvent (event) {
  const isWorkout = aliasHelper.isWorkout(event.summary)

  if (event.summary.indexOf(':') === -1 && !isWorkout) {
    return {}
  }

  if (SUMMARY.importedIds.indexOf(event.id) > -1) {
    return {}
  }

  const alias = event.summary.substring(0, event.summary.indexOf(':'))

  const end = event.end.dateTime || event.end.date
  const start = event.start.dateTime || event.start.date
  const endtime = moment(end)
  const starttime = moment(start)
  const hours = moment.duration(endtime.diff(starttime)).asHours()

  prettyPrint({
    alias,
    end,
    start,
    event
  }, event.week)

  updateSummary({
    alias,
    hours,
    isWorkout
  })
}

function importGoogleCalendarEvent (event, izoneEvents) {
  const isWorkout = aliasHelper.isWorkout(event.summary)

  if (event.summary.indexOf(':') === -1 && !isWorkout) {
    return Promise.resolve()
  }

  const izoneEvent = izoneEvents.filter(e => {
    return e.jl_gcal_id === event.id
  })[0]

  if (!izoneEvent) {
    const end = event.end.dateTime || event.end.date
    const start = event.start.dateTime || event.start.date

    if (isWorkout) {
      event.summary = `träna: ${event.summary}`
    }

    const alias = event.summary.substring(0, event.summary.indexOf(':'))

    return databaseAdapter.getJobByAlias(alias)
      .then(jobs => {
        const endtime = moment(end)
        const starttime = moment(start)
        const hours = moment.duration(endtime.diff(starttime)).asHours()

        if (jobs.length < 1) {
          console.log('  ', `ERROR: Not importing "${event.summary}" because no project is using alias "${alias}".`)
          return Promise.resolve()
        } else if (jobs.length > 1) {
          console.log('  ', `ERROR: Not importing "${event.summary}" because alias "${alias}" is used on more than one project. This needs to be fixed in izone.`)
          return Promise.resolve()
        } else {
          const jobLog = {
            jl_starttime: starttime.format('YYYY-MM-DD HH:mm:ss'),
            jl_endtime: endtime.format('YYYY-MM-DD HH:mm:ss'),
            jl_executor: config.izone.user,
            jl_hours: hours,
            jl_alias: alias.toUpperCase(),
            jl_description: event.summary.replace(`${alias}: `, ''),
            jl_job_id: jobs[0].job_id,
            jl_gcal_id: event.id
          }

          return databaseAdapter.import(jobLog)
            .then(() => {
              console.log('  ', `Imported "${event.summary}"`)
            })
        }
      })
      .catch(error => {
        return Promise.reject(error)
      })
  }

  // TODO: Update event in DB.
  return Promise.resolve()
}

module.exports = {
  ls: (week) => {
    if (!week) {
      week = weekHelper.getWeekForDate(new Date())
    }

    console.log()
    console.log('  ', `Week ${week}`)

    return Promise.all([
        getIzoneEvents(week),
        getCalendarEvents(week)
      ])
      .then(events => {
        console.log('  ', `Izone: ${events[0].length}, Google calendar: ${events[1].length}`)

        /**
         * Izone.
         */
        events[0].map(event => {
          SUMMARY.importedIds.push(event.jl_gcal_id)
          const isWorkout = aliasHelper.isWorkout(`${event.jl_alias}: ${event.jl_description}`)

          updateSummary({
            alias: event.jl_alias,
            hours: event.jl_hours,
            isWorkout: aliasHelper.isWorkout(`${event.jl_alias}: ${event.jl_description}`)
          })

          prettyPrint({
            alias: event.jl_alias,
            end: event.jl_endtime,
            start: event.jl_starttime,
            job: event,
            jobCount: 1,
            event,
            importedMark: '>'
          }, week)
        })

        /**
         * Google calendar.
         */

        events[1].map(event => {
          event.week = week
          listGoogleCalendarEvent(event)
        })

        /**
         * Summary.
         */
        console.log()
        console.log()
        console.log('  ', 'SUMMARY')
        console.log('  ', '- - - - - - - - - -')
        Object.keys(SUMMARY.hours).map(sum => {
          if (!SUMMARY.hours[sum].isWorkout) {
            console.log('  ', `${sum.toLowerCase()}: ${SUMMARY.hours[sum].hours} h`)
          }
        })
        console.log('  ', '- - - - - - - - - -')
        console.log('  ', `TOTAL: ${SUMMARY.total} h`)
        console.log('  ', `TRÄNA: ${SUMMARY.health} h`)
      })
  },
  import: (week) => {
    if (!week) {
      week = weekHelper.getWeekForDate(new Date())
    }

    console.log()
    console.log('  ', `Week ${week}`)
    console.log()

    return Promise.all([
        getIzoneEvents(week),
        getCalendarEvents(week)
      ])
      .then(events => {
        const tasks = []
        const izoneEvents = events[0]
        const calendarEvents = events[1]

        calendarEvents.forEach(event => {
          tasks.push(importGoogleCalendarEvent(event, izoneEvents))
        })

        return Promise.all(tasks)
      })
  }
}