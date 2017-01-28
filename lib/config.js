'use strict';

const nconf = require('nconf').env({
  separator: '__',
  lowerCase: true
}).file({
  file: 'config.json',
  dir: (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.izone',
  search: true
});

const config = {
  env: process.env.env || nconf.get('env') || 'local',
  google: {
    calendar: {
      id: nconf.get('google:calendar:id') || 'primary'
    },
    secret: nconf.get('google:secret')
  },
  izone: {
    sql: {
      connectionString: nconf.get('izone:sql:connectionString')
    }
  }
};

config.env = config.env.toUpperCase();

module.exports = config;
