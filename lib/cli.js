'use strict'

const googleAdapter = require('./adapters/google')
const databaseAdapter = require('./adapters/database')

module.exports = {
  ls: () => {
    return googleAdapter.getEvents()
      .then(events => {
        const tasks = []
        events.map(event => {
          if (event.summary.indexOf(':') > -1) {
            const start = event.start.dateTime || event.start.date
            const alias = event.summary.substring(0, event.summary.indexOf(':'))
            tasks.push(databaseAdapter.getJobByAlias(alias)
              .then(job => {
                job = job[0]
                console.log()
                console.log('->', event.summary, `(Starting at ${start})`)
                console.log('  ', `Izone job (${alias}:)`, job.job_title)
              })
              .catch(error => {
                console.error('Something went wrong', error)
              }))
          }
        })
        return Promise.all(tasks)
      })
  }
}