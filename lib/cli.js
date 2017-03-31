'use strict'

const aliasHelper = require('./helpers/aliasHelper')
const cliHelper = require('./helpers/cli')
const databaseAdapter = require('./adapters/database')
const izoneService = require('./services/izone')
const moment = require('moment-timezone')
const weekHelper = require('./helpers/weekHelper')

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
          cliHelper.print(`Updated "${event.summary}"`)
        })
    }
  }

  return Promise.resolve()
}

function round (num) {
  return Math.round(num * 100) / 100
}

module.exports = {
  import: (week) => {
    week = week || weekHelper.getWeekForDate(new Date())
    cliHelper.printWeekHeader(week)

    return izoneService.getAllEvents(week)
      .then(events => {
        const tasks = []

        events.calendar.forEach(event => {
          tasks.push(importGoogleCalendarEvent(event, events.izone))
        })

        return Promise.all(tasks)
      })
  },
  ls: (week) => {
    week = week || weekHelper.getWeekForDate(new Date())
    cliHelper.printWeekHeader(week)
    const importedIds = []

    return izoneService.getAllEvents(week)
      .then(events => {
        events.izone.forEach(event => {
          importedIds.push(event.jl_gcal_id)

          cliHelper.printTimeEntry({
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

        events.calendar.forEach(event => {
          event.week = week
          if (importedIds.indexOf(event.id) > -1) {
            return {}
          }

          const alias = event.summary.substring(0, event.summary.indexOf(':'))
          const end = event.end.dateTime || event.end.date
          const start = event.start.dateTime || event.start.date

          cliHelper.printTimeEntry({
            alias,
            end,
            start,
            event
          }, event.week)
        })
      })
  },
  summary: week => {
    week = week || weekHelper.getWeekForDate(new Date())
    cliHelper.printWeekHeader(week)

    return izoneService.getWeekSummary(week)
      .then(summary => {
        Object.keys(summary.hours).forEach(sum => {
          if (!summary.hours[sum].isWorkout) {
            cliHelper.print(`${sum.toLowerCase()}: ${round(summary.hours[sum].hours)} h`)
          }
        })
        cliHelper.print('- - - - - - - - - -')
        cliHelper.print(`TOTAL: ${round(summary.total)} h`)
        cliHelper.print(`TRÄNA: ${round(summary.health)} h`)
      })
  }
}
