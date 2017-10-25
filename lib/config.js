const nconf = require('nconf').env({
  separator: '__',
  lowerCase: true
}).file({
  file: 'config.json',
  dir: '../../',
  search: true
})

nconf.defaults({
  env: process.env.env || 'local',
  google: {
    calendar: {
      id: 'primary'
    },
    secret: {
      installed: {
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        project_id: 'focus-hulling-156720',
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
        token_uri: 'https://accounts.google.com/o/oauth2/token'
      }
    }
  },
  izone: {
    sql: {
      connectionstring: 'mssql://izonedev:m30wm30w@192.168.100.3/izone'
    }
  },
  logging: {
    debugRest: true,
    debugSql: false
  },
  slack: {
    token: 'dev'
  }
})

const config = {
  env: nconf.get('env'),
  google: {
    calendar: {
      id: nconf.get('google:calendar:id')
    },
    secret: nconf.get('google:secret')
  },
  izone: {
    sql: {
      connectionstring: nconf.get('izone:sql:connectionstring')
    }
  },
  logging: {
    debugRest: nconf.get('debugRest'),
    debugSql: nconf.get('debugSql')
  },
  slack: {
    token: nconf.get('slack:token')
  }
}

config.env = config.env.toUpperCase()

module.exports = config
