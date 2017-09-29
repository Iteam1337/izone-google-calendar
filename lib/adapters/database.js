'use strict'

const sql = require('mssql')
const config = require('../config')

let CONNECTION = null

function connect () {
  return new Promise((resolve, reject) => {
    if (!CONNECTION || !CONNECTION.connected) {
      return sql.connect(config.izone.sql.connectionstring)
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
  if (config.logging.debugSql) {
    console.log()
    console.log(sqlCommand)
    console.log()
  }

  return connect()
    .then(() => {
      return new sql.Request(CONNECTION)
        .query(sqlCommand)
        .then(function (recordset) {
          return recordset
        }).catch(function (error) {
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
      select   *
              ,'/' as path
            --,dbo.GetPath3(job_id, '/', 0) as path
      from job_log_db
      inner join job_db on jl_job_id = job_id
      inner join companies_db on job_cust_id = comp_id
      where 1 = 1
        and jl_executor = '${executor}'
        and jl_starttime between '${start}' and '${end}'
      order by jl_starttime asc
    `)
  },
  getPersonByEmail: (email) => {
    return query(`
      select *
      from people_db
      where 1 = 1
        and p_email = '${email}'
    `)
  },
  getPersonBySlackIdentity: (slackIdentity) => {
    return query(`
      select *
      from people_db
      where 1 = 1
        and
        (
          p_slack_user_id = '${slackIdentity.userId}' OR
          p_slack_user_name = '${slackIdentity.userName}'
        )
    `)
  },
  import: jobLog => {
    return query(`
      insert into job_log_db
      (jl_starttime, jl_endtime, jl_executor, jl_hours, jl_alias, jl_description, jl_job_id, jl_gcal_id)
      values ('${jobLog.jl_starttime}', '${jobLog.jl_endtime}', '${jobLog.jl_executor}', '${jobLog.jl_hours}', '${jobLog.jl_alias}', '${jobLog.jl_description}', '${jobLog.jl_job_id}', '${jobLog.jl_gcal_id}')
    `)
      .then(data => {
        return data
      })
      .catch(error => {
        console.error('Query error', error)
      })
  },
  update: (gcalId, jobLog) => {
    return query(`
      update job_log_db
      set jl_starttime = '${jobLog.jl_starttime}', jl_endtime = '${jobLog.jl_endtime}', jl_hours = '${jobLog.jl_hours}', jl_description = '${jobLog.jl_description}'
      where jl_gcal_id = '${gcalId}'
    `)
  },
  updateGoogleToken: (userId, token) => {
    return query(`
      update people_db
      set
        p_google_token_access_token = '${token.access_token}',
        p_google_token_refresh_token = '${token.refresh_token}',
        p_google_token_expiry = '${token.expiry_date}'
      where 1 = 1
        and p_slack_user_id = '${userId}'
    `)
  },
  updatePerson: (slackIdentity) => {
    return query(`
      update people_db
      set p_slack_user_id = '${slackIdentity.userId}'
      where p_slack_user_name = '${slackIdentity.userName}'
    `)
  }
}
