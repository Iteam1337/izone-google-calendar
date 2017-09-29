'use strict'

const aliasHelper = require('../helpers/aliasHelper')
const databaseAdapter = require('../adapters/database')
const izoneService = require('../services/izone')
const slackService = require('../services/slack')
const weekHelper = require('../helpers/weekHelper')

const moment = require('moment-timezone')
moment.tz.setDefault('Europe/Stockholm')

function importGoogleCalendarEvent (event, izoneEvents, user) {
  // We are only interested in izone aliases or workouts.
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
          const jobLog = {
            jl_starttime: starttime.format('YYYY-MM-DD HH:mm:ss'),
            jl_endtime: endtime.format('YYYY-MM-DD HH:mm:ss'),
            jl_executor: user.p_izusername.toLowerCase(),
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
  } else {
    let update = false
    const eventSummary = event.summary
    const izoneSummary = `${alias}:` === izoneEvent.jl_description ? izoneEvent.jl_description : `${alias}: ${izoneEvent.jl_description}`
    if (eventSummary !== izoneSummary) {
      update = true
    }

    if (moment(event.start.dateTime) !== moment(izoneEvent.jl_starttime)) {
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
          console.log(`Updated "${event.summary}"`)
        })
    }
  }

  return Promise.resolve()
}

module.exports = {
  import: (req, res, next) => {
    if (!req.izone) {
      // Usually set by previous middlewares.
      req.izone = {}
    }

    if (!req.izone.week) {
      req.izone.week = weekHelper.getWeekForDate(new Date())
    }

    return izoneService.getAllEvents(req.izone)
      .then(events => {
        const tasks = []

        events.calendar.forEach(event => {
          tasks.push({
            event,
            izoneEvent: events.izone,
            user: req.izone.user
          })
        })

        if (!tasks || !tasks.length) {
          return Promise.resolve()
        }

        return tasks.reduce((chain, task) =>
            chain.then(() => importGoogleCalendarEvent(task.event, task.izoneEvent, task.user)), Promise.resolve()
          )
          .then(() => {
            return slackService.summary(req.izone)
          })
          .then(data => {
            res.send(data)
            next()
          })
          .catch(error => {
            console.log('ERROR', '/slack', req.params, error)
            res.statusCode = 500
            res.send(error)
            next(error)
          })
      })
  },
  summary: (req, res, next) => {
    if (!req.izone) {
      // Usually set by previous middlewares.
      req.izone = {}
    }

    if (!req.izone.week) {
      req.izone.week = weekHelper.getWeekForDate(new Date())
    }

    return slackService.summary(req.izone)
      .then(data => {
        res.send(data)
        next()
      })
      .catch(error => {
        console.log('ERROR', '/slack', req.params, error)
        res.statusCode = 500
        res.send(error)
        next(error)
      })
  }
}
