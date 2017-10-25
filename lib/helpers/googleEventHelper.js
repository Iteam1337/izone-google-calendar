const moment = require('moment-timezone')
moment.tz.setDefault('Europe/Stockholm')

module.exports = {
  getDuration: event => {
    let allDay = false

    if (!event.end.dateTime && event.end.date) allDay = true

    const end = moment(event.end.dateTime || event.end.date)
    const start = moment(event.start.dateTime || event.start.date)
    const hours = (allDay) ? 8 : moment.duration(end.diff(start)).asHours()

    return {
      allDay,
      end,
      hours,
      start
    }
  }
}
