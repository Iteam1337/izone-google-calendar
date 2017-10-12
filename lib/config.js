const nconf = require('nconf').env({
  separator: '__',
  lowerCase: true
}).file({
  file: 'config.json',
  dir: (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.izone',
  search: true
})

const config = {
  env: process.env.env || nconf.get('env') || 'local',
  google: {
    calendar: {
      id: nconf.get('google:calendar:id') || 'primary'
    },
    secret: nconf.get('google:secret'),
    token: nconf.get('google:token')
  },
  izone: {
    sql: {
      connectionstring: nconf.get('izone:sql:connectionstring')
    }
  },
  logging: {
    debugRest: true,
    debugSql: false
  },
  slack: {
    token: nconf.get('slack:token') || 'dev'
  }
}

config.env = config.env.toUpperCase()

module.exports = config
