'use strict'

const config = require('./config')
const moment = require('moment')
const readline = require('readline')
const weekHelper = require('./helpers/weekHelper')
const googleAdapter = require('./adapters/google')
const databaseAdapter = require('./adapters/database')

function getPendingEvents (week) {
  const weekObject = weekHelper.getWeek(week)

  let timeMin = `${weekObject.Monday}T00:00:00.000Z`
  let timeMax = `${weekObject.Sunday}T23:59:59.000Z`

  return googleAdapter.getEvents(timeMin, timeMax)
    .then(events => {
      return events.filter(event => {
        return event.summary.indexOf(':') > -1
      })
    })
}

function prettyPrint (timeEntry) {
  console.log()

  switch (timeEntry.jobCount) {
    case 1:
      console.log('> ', `[${timeEntry.job.comp_name}] ${timeEntry.job.job_title} (ID: ${timeEntry.job.job_id})`)
      break
    case 0:
      console.log('X ', `Found time entry on "${timeEntry.alias}" that does not match any Izone job.`)
      break
    default:
      console.log('W ', `Found more than one job using alias "${timeEntry.alias}", please fix this in Izone before importing time.`)
      break
  }

  console.log('  ', timeEntry.event.summary)
  if (weekHelper.getWeekForDate(timeEntry.start) === weekHelper.getWeekForDate(new Date())) {
    console.log('  ', `${moment(timeEntry.start).calendar()} till ${moment(timeEntry.end).format('HH:mm')}`)
  } else {
    console.log('  ', `${moment(timeEntry.start).format('YYYY-MM-DD HH:mm')} till ${moment(timeEntry.end).format('HH:mm')}`)
  }
}

module.exports = {
  ls: (week) => {
    if (!week) {
      week = weekHelper.getWeekForDate(new Date())
    }

    console.log()
    console.log('  ', `Week ${week}`)

    return getPendingEvents(week)
      .then(events => {
        const tasks = []
        events.map(event => {
          const start = event.start.dateTime || event.start.date
          const alias = event.summary.substring(0, event.summary.indexOf(':'))

          tasks.push(databaseAdapter.getJobByAlias(alias)
            .then(jobs => {
              prettyPrint({
                alias,
                end: event.end.dateTime || event.end.date,
                start,
                job: jobs[0],
                jobCount: jobs.length,
                event
              }, week)
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