'use strict'

const moment = require('moment-timezone')
const aliasHelper = require('./helpers/aliasHelper')
const weekHelper = require('./helpers/weekHelper')
const databaseAdapter = require('./adapters/database')
const izoneService = require('./services/izone')

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

function prettyPrintDescription (description) {
  if (description && description !== '-') {
    console.log('  ', `"${description}"`)
  }
}

function prettyPrint (timeEntry) {
  console.log()

  if (timeEntry.job) {
    console.log(`${timeEntry.importedMark || ' '} `, `#${timeEntry.job.job_id} ${timeEntry.path}`)
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

  if (!event.summary) {
    return {}
  }

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

  const end = event.end.dateTime || event.end.date
  const start = event.start.dateTime || event.start.date

  if (isWorkout) {
    event.summary = `träna: ${event.summary}`
  }

  const alias = event.summary.substring(0, event.summary.indexOf(':'))
  const endtime = moment(end)
  const starttime = moment(start)
  const hours = moment.duration(endtime.diff(starttime)).asHours()

  if (!izoneEvent) {
    return databaseAdapter.getJobByAlias(alias)
      .then(jobs => {
        if (jobs.length < 1) {
          console.log('  ', `ERROR: Not importing "${event.summary}" because no project is using alias "${alias}".`)
          return Promise.resolve()
        } else if (jobs.length > 1) {
          console.log('  ', `ERROR: Not importing "${event.summary}" because alias "${alias}" is used on more than one project. This needs to be fixed in izone.`)
          return Promise.resolve()
        } else if (moment().format('x') < endtime.format('x')) {
          console.log('  ', `Skipping "${event.summary}", event has not ended yet.`)
          return Promise.resolve()
        } else {
          return izoneService.getIzoneUser()
            .then(user => {
              const jobLog = {
                jl_starttime: starttime.format('YYYY-MM-DD HH:mm:ss'),
                jl_endtime: endtime.format('YYYY-MM-DD HH:mm:ss'),
                jl_executor: user.alias,
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
            })
        }
      })
      .catch(error => {
        return Promise.reject(error)
      })
  } else {
    let update = false
    const eventSummary = event.summary
    const izoneSummary = `${alias}:` === izoneEvent.jl_description ? izoneEvent.jl_description : `${alias}: ${izoneEvent.jl_description}`
    if (eventSummary !== izoneSummary) {
      update = true
    }

    if (izoneEvent.jl_hours !== hours) {
      update = true
    }

    if (update && izoneEvent.jl_invoiced) {
      console.log('  ', `Refusing to update invoiced time entry "${event.summary}"`)
      update = false
    }

    if (update) {
      const jobLog = {
        jl_starttime: starttime.format('YYYY-MM-DD HH:mm:ss'),
        jl_endtime: endtime.format('YYYY-MM-DD HH:mm:ss'),
        jl_hours: hours,
        jl_description: event.summary.replace(`${alias}: `, '')
      }

      return databaseAdapter.update(event.id, jobLog)
        .then(() => {
          console.log('  ', `Updated "${event.summary}"`)
        })
    }
  }

  return Promise.resolve()
}

module.exports = {
  ls: (week) => {
    if (!week) {
      week = weekHelper.getWeekForDate(new Date())
    }

    console.log()
    console.log('  ', `Week ${week}`)

    return izoneService.getAllEvents(week)
      .then(events => {
        console.log('  ', `Izone: ${events.izone.length}, Google calendar: ${events.calendar.length}`)

        /**
         * Izone.
         */
        events.izone.map(event => {
          SUMMARY.importedIds.push(event.jl_gcal_id)

          updateSummary({
            alias: event.jl_alias,
            hours: event.jl_hours,
            isWorkout: aliasHelper.isWorkout(`${event.jl_alias}: ${event.jl_description}`)
          })

          prettyPrint({
            alias: event.jl_alias,
            end: moment.tz(event.jl_endtime, 'UTC'),
            start: moment.tz(event.jl_starttime, 'UTC'),
            job: event,
            jobCount: 1,
            event,
            importedMark: '>',
            path: event.path
          }, week)
        })

        /**
         * Google calendar.
         */

        events.calendar.map(event => {
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

    return izoneService.getAllEvents(week)
      .then(events => {
        const tasks = []

        events.calendar.forEach(event => {
          tasks.push(importGoogleCalendarEvent(event, events.izone))
        })

        return Promise.all(tasks)
      })
  }
}
