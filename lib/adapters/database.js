'use strict'

const sql = require('mssql')
const config = require('../config')

let CONNECTION = null

function connect () {
  return new Promise((resolve, reject) => {
    if (!CONNECTION || !CONNECTION.connected) {
      return sql.connect(config.izone.sql.connectionString)
        .then(connection => {
          CONNECTION = connection
          return resolve()
        })
        .catch(error => {
          console.error('Unable to connect tot SQL server', error)
          return reject(error)
        })
    } else {
      return resolve()
    }
  })
}

function query (sqlCommand) {
  return connect()
    .then(() => {
      return new sql.Request(CONNECTION)
        .query(sqlCommand)
        .then(function(recordset) {
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
    console.log('hä', alias)
    return query(`
        select *
        from job_db
        inner join companies_db on job_cust_id = comp_id
        where 1 = 0
          or REPLACE(job_alias, ' ', '') = '${alias}'
          or REPLACE(job_alias, ' ', '') like '${alias},%'
          or REPLACE(job_alias, ' ', '') like '%,${alias},%'
          or REPLACE(job_alias, ' ', '') like '%,${alias}'
      `)
      .then(data => {
        return data
      })
      .catch(error => {
        console.error('Query error', error)
      })
  },
  getJobLogs: (start, end, executor) => {
    return query(`
      select *
      from job_log_db
      inner join job_db on jl_job_id = job_id
      inner join companies_db on job_cust_id = comp_id
      where 1 = 1
        and jl_executor = '${executor}'
        and jl_starttime between '${start}' and '${end}'
      order by jl_starttime asc
    `)
  },
  import: jobLog => {
    return query(`
      insert into job_log_db
      (jl_starttime, jl_endtime, jl_executor, jl_hours, jl_alias, jl_description, jl_job_id)
      values ('${jobLog.jl_starttime}', '${jobLog.jl_endtime}', '${jobLog.jl_executor}', '${jobLog.jl_hours}', '${jobLog.jl_alias}', '${jobLog.jl_description}', '${jobLog.jl_job_id}')
    `)
    .then(data => {
        return data
      })
      .catch(error => {
        console.error('Query error', error)
      })
  }
}