'use strict'

const config = require('./config')
const readline = require('readline')
const moment = require('moment')
const googleAdapter = require('./adapters/google')
const databaseAdapter = require('./adapters/database')

function getPendingEvents () {
  return googleAdapter.getEvents()
    .then(events => {
      return events.filter(event => {
        return event.summary.indexOf(':') > -1
      })
    })
}

function prettyPrint (timeEntry) {
  console.log()
  console.log('->', timeEntry.event.summary, `(Starting at ${timeEntry.start})`)
  if (timeEntry.jobCount > 1) {
    console.log('  ', `WARNING: Found more than one jobs with alias "${timeEntry.alias}", izone will not import this time entry.`)
  } else {
    console.log('  ', `Izone job #${timeEntry.job.job_id} (${timeEntry.alias}:)`, timeEntry.job.job_title)
  }
}

module.exports = {
  ls: () => {
    return getPendingEvents()
      .then(events => {
        const tasks = []
        events.map(event => {
          const start = event.start.dateTime || event.start.date
          const alias = event.summary.substring(0, event.summary.indexOf(':'))

          tasks.push(databaseAdapter.getJobByAlias(alias)
            .then(jobs => {
              prettyPrint({
                alias,
                start,
                job: jobs[0],
                jobCount: jobs.length,
                event
              })
            })
            .catch(error => {
              return Promise.reject(error)
            }))
        })
        return Promise.all(tasks)
      })
  },
  import: () => {
    return getPendingEvents()
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

              const jobLog = {
                jl_starttime: starttime.format('YYYY-MM-DD HH:mm:ss'),
                jl_endtime: endtime.format('YYYY-MM-DD HH:mm:ss'),
                jl_executor: config.izone.user,
                jl_hours: hours,
                jl_alias: alias.toUpperCase(),
                jl_description: event.summary.replace(`${alias}: `, ''),
                jl_job_id: jobs[0].job_id
              }

              if (timeEntry.jobCount > 1) {
                prettyPrint(timeEntry)
                return Promise.resolve()
              } else {
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