'use strict'

const moment = require('moment')
moment.locale('sv')

function getDateForWeekday (week, weekday) {
  return moment(week.toUpperCase()).add(weekday - 1, 'days').format('YYYY-MM-DD')
}

function getWeekForDate (date) {
  const momentDate = moment(date)
  return moment(date).format('YYYY[w]WW')
}

module.exports = {
  addWeek: (week, i) => {
    return getWeekForDate(moment(week.toUpperCase()).add(i * 7, 'days'))
  },
  getWeek: (week) => {
    return {
      Monday: getDateForWeekday(week, 1),
      Tuesday: getDateForWeekday(week, 2),
      Wednesday: getDateForWeekday(week, 3),
      Thursday: getDateForWeekday(week, 4),
      Friday: getDateForWeekday(week, 5),
      Saturday: getDateForWeekday(week, 6),
      Sunday: getDateForWeekday(week, 7)
    }
  },
  getWeekForDate
}
