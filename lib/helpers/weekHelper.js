'use strict'

const moment = require('moment')
moment.locale('sv')

function getWeekForDate (date) {
  const momentDate = moment(date)
  return moment(date).format('YYYY[w]WW')
}

module.exports = {
  addWeek: (week, i) => {
    return getWeekForDate(moment(week.toUpperCase()).add(i * 7, 'days'))
  },
  getDatesForWeek: (week) => {
    return [0, 1, 2, 3, 4, 5, 6].map(i => {
      return moment(week.toUpperCase()).add(i, 'days').format('YYYY-MM-DD')
    })
  },
  getWeekForDate
}
