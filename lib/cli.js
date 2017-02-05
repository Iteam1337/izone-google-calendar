'use strict'

const config = require('./config')
const moment = require('moment')
const readline = require('readline')
const aliasHelper = require('./helpers/aliasHelper')
const weekHelper = require('./helpers/weekHelper')
const googleAdapter = require('./adapters/google')
const databaseAdapter = require('./adapters/database')

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
    .then(events => {
      return events.filter(event => {
        return true
        //return event.summary.indexOf(':') > -1
      })
    })
}

function getIzoneEvents (week) {
  const weekStartEnd = getStartAndEndOfWeek(week)
  return databaseAdapter.getJobLogs(weekStartEnd.start, weekStartEnd.end, config.izone.user)
    .then(events => {
      return events
    })
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
      console.log('> ', `[${timeEntry.job.comp_name}] ${timeEntry.job.job_title} (ID: ${timeEntry.job.job_id})`)
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

        const summary = {
          hours: {},
          total: 0,
          health: 0,
          importedIds: []
        }
        events[0].map(event => {
          summary.importedIds.push(event.jl_gcal_id)
          const isWorkout = aliasHelper.isWorkout(`${event.jl_alias}: ${event.jl_description}`)

          if (!summary.hours[event.jl_alias]) {
            summary.hours[event.jl_alias] = {
              isWorkout: isWorkout,
              hours: event.jl_hours 
            }
          } else {
            summary.hours[event.jl_alias].hours += event.jl_hours
          }

          if (isWorkout) {
            summary.health += event.jl_hours
          } else {
            summary.total += event.jl_hours
          }

          prettyPrint({
            alias: event.jl_alias,
            end: event.jl_endtime,
            start: event.jl_starttime,
            job: event,
            jobCount: 1,
            event
          }, week)
        })

        console.log()
        console.log('  ', 'Summary')
        console.log()
        Object.keys(summary.hours).map(sum => {
          if (!summary.hours[sum].isWorkout) {
            console.log('  ', `${sum}: ${summary.hours[sum].hours} h`)
          }
        })
        console.log('  ', '- - - - - - - - - -')
        console.log('  ', `TOTAL: ${summary.total} h`)
        console.log()
        console.log('  ', `Time invested in your health: ${summary.health} h`)
      })

    // return getCalendarEvents(week)
    //   .then(events => {
    //     const tasks = []
    //     events.map(event => {
    //       const start = event.start.dateTime || event.start.date
    //       const alias = event.summary.substring(0, event.summary.indexOf(':'))

    //       tasks.push(databaseAdapter.getJobByAlias(alias)
    //         .then(jobs => {
    //           prettyPrint({
    //             alias,
    //             end: event.end.dateTime || event.end.date,
    //             start,
    //             job: jobs[0],
    //             jobCount: jobs.length,
    //             event
    //           }, week)
    //         })
    //         .catch(error => {
    //           return Promise.reject(error)
    //         }))
    //     })
    //     return Promise.all(tasks)
    //   })
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