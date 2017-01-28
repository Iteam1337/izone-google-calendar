'use strict'

const sql = require('mssql')
const config = require('../config')

function query (sqlCommand) {
  console.log('mmm', config)
  return sql
    .connect(config.izone.sql.connectionString)
    .then(() => {
      return new sql.Request().query(sqlCommand).then(function(recordset) {
        return recordset
      }).catch(function(error) {
        console.error('Query error', error)
      })
    }).catch(error => {
      console.error('Connection error', error)
    })
}

module.exports = {
  getJobByAlias: alias => {
    return query(`
        select *
        from job_db
        where 1 = 1
          and job_alias like '%${alias}%'
      `)
      .then(data => {
        return data
      })
      .catch(error => {
        console.error('Query error', error)
      })
  }
}