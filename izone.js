'use strict'

const googleCalendar = require('./lib/adapters/googleCalendar')
const izoneAdapter = require('./lib/adapters/izone')

let exitCode = 0
const _command = process.argv[2]

if (!_command) {
  console.error('No command specified.')
  process.exit(1)
}

const r = () => {
  switch (_command) {
    case 'show':
      return googleCalendar.getEvents()
        .then(events => {
          events.map(event => {
            if (event.summary.indexOf(':') > -1) {
              const start = event.start.dateTime || event.start.date
              console.log(start, event.summary)
              const alias = event.summary.substring(0, event.summary.indexOf(':'))
              console.log('alias', alias)
              izoneAdapter.getJobByAlias(alias)
                .then(job => {
                  console.log(`Job (${alias}:)`, job_title)
                })
                .catch(error => {
                  console.error('oh noes', error)
                })
            }

            if (event.summary.indexOf(';') > -1) {
              const start = event.start.dateTime || event.start.date
              console.log(start, event.summary, '(Imported)')
            }
          })
        })
    default:
      return Promise.reject((`Command "${_command}" is not declared.`))
  }
}

r()
  .then(() => {
    console.log(`Command '${_command}' completed!`)
  })
  .catch(error => {
    exitCode = 1
    if (error.message) {
      console.error(`Error: ${error.message}`)
    }

    if (error.statusMessage) {
      console.error(`Error: ${error.statusCode} ${error.statusMessage}`)
    }

    console.error(`Command '${_command}' resulted in error.`)
  })
  .then(() => {
    console.log()
    // process.exit(exitCode)
  })
