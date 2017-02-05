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
  if (!SUMMARY.hours[meta.alias]) {
    SUMMARY.hours[meta.alias] = {
      isWorkout: meta.isWorkout,
      hours: meta.hours 
    }
  } else {
    SUMMARY.hours[meta.alias].hours += meta.hours
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

  switch (timeEntry.jobCount) {
    case 1:
      console.log(`${timeEntry.importedMark || ' '} `, `[${timeEntry.job.comp_name}] ${timeEntry.job.job_title} (ID: ${timeEntry.job.job_id})`)
      break
    case 0:
      console.log('X ', `Found time entry on "${timeEntry.alias}" that does not match any Izone job.`)
      break
    default:
      console.log('W ', `Found more than one job using alias "${timeEntry.alias}", please fix this in Izone before importing time.`)
      break
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
    job: {},
    jobCount: 1,
    event,
  }, event.week)

  updateSummary({
    alias,
    hours,
    isWorkout
  })
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
  import: () => {
    return getCalendarEvents()
      .then(events => {
        const tasks = []
        events.map(event => {
          const end = event.end.dateTime || event.end.date
          const start = event.start.dateTime || event.start.date
          const alias = event.summary.substring(0, event.summary.indexOf(':'))

          tasks.push(databaseAdapter.getJobByAlias(alias)
            .then(jobs => {
              const timeEntry = {
                alias,
                end,
                start,
                job: jobs[0],
                jobCount: jobs.length,
                event
              }

              const endtime = moment(end)
              const starttime = moment(start)
              const hours = moment.duration(endtime.diff(starttime)).asHours()

              if (timeEntry.jobCount !== 1) {
                prettyPrint(timeEntry)
                return Promise.resolve()
              } else {
                const jobLog = {
                  jl_starttime: starttime.format('YYYY-MM-DD HH:mm:ss'),
                  jl_endtime: endtime.format('YYYY-MM-DD HH:mm:ss'),
                  jl_executor: config.izone.user,
                  jl_hours: hours,
                  jl_alias: alias.toUpperCase(),
                  jl_description: event.summary.replace(`${alias}: `, ''),
                  jl_job_id: jobs[0].job_id
                }

                return databaseAdapter.import(jobLog)
                  .then(() => {
                    return googleAdapter.markEventImported(event)
                  })
                  .then(() => {
                    prettyPrint(timeEntry)
                    console.log('  ', 'IMPORTED!')
                  })
              }
            })
            .catch(error => {
              return Promise.reject(error)
            }))
        })

        return Promise.all(tasks)
      })
  }
}