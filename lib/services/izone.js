'use strict'

const database = require('../adapters/database')
const google = require('../adapters/google')

module.exports = {
  getIzoneUser: () => {
    return google.getCalendars()
      .then(c => {
        return database.getPerson(c.id)
      })
      .then(p => {
        if (p && p[0]) {
          p = p[0]
          return {
            alias: p.p_shortname,
            email: p.p_email,
            firstname: p.p_firstname,
            lastname: p.p_lastname,
            title: p.p_title
          }
        }
      })
  }
}
