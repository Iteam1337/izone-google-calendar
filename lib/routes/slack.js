'use strict'

const aliasHelper = require('../helpers/aliasHelper')
const databaseAdapter = require('../adapters/database')
const request = require('request')
const izoneService = require('../services/izone')
const moment = require('moment-timezone')
const slackService = require('../services/slack')
const weekHelper = require('../helpers/weekHelper')

function importGoogleCalendarEvent (event, izoneEvents) {
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
          console.log(`Updated "${event.summary}"`)
        })
    }
  }

  return Promise.resolve()
}

function round (num) {
  return Math.round(num * 100) / 100
}

/**
 * Helpers.
 */
function parseParameters (command) {
  const params = {}
  
  if (!command) {
    return params
  }

  const commandParams = command.split(' ')

  commandParams.forEach(param => {
    params.week = parseParameter('week', param) || params.week
  })

  return params
}

function parseParameter (name, raw) {
  const pattern = `${name}=`
  if (raw.indexOf(pattern) > -1) {
    return raw.substr(pattern.length)
  }
}

module.exports = {
  import: (req, res, next) => {
    console.log('')
    console.log('Yey! A button was pressed!')
    console.log('body', req.body)
    console.log('params', req.params)
    const payload = JSON.parse(req.params.payload)
    return izoneService.getAllEvents(weekHelper.getWeekForDate(new Date()))
      .then(events => {
        const tasks = []

        events.calendar.forEach(event => {
          tasks.push(importGoogleCalendarEvent(event, events.izone))
        })

        return Promise.all(tasks)
          .then(() => {
            return new Promise((resolve, reject) => {
              request(payload.response_url, (err, res, body) => {
                resolve()
              })
            })
          })
          .then(() => {
            res.send('Your hours have been imported/updated!')
            next()
          })
      })
  },
  summary: (req, res, next) => {
    const parameters = parseParameters(req.params.text)
    if (!parameters.week) {
      parameters.week = weekHelper.getWeekForDate(new Date())
    }

    return slackService.summary(parameters)
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
