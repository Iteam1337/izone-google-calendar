'use strict'

const moment = require('moment')
const weekHelper = require('./weekHelper')

function printDescription (description) {
  if (description && description !== '-') {
    console.log('  ', `"${description}"`)
  }
}

module.exports = {
  printTimeEntry (timeEntry) {
    console.log()

    if (timeEntry.job) {
      console.log(`${timeEntry.importedMark || ' '} `, `#${timeEntry.job.job_id} ${timeEntry.path}`)
    }

    printDescription(timeEntry.event.summary || timeEntry.event.jl_description)

    if (weekHelper.getWeekForDate(timeEntry.start) === weekHelper.getWeekForDate(new Date())) {
      console.log('  ', `${moment(timeEntry.start).calendar()} till ${moment(timeEntry.end).format('HH:mm')}`)
    } else {
      console.log('  ', `${moment(timeEntry.start).format('YYYY-MM-DD HH:mm')} till ${moment(timeEntry.end).format('HH:mm')}`)
    }
  },
  printWeekHeader (week) {
    console.log()
    console.log('  ', `Week ${week}`)
    console.log()
  }
}
