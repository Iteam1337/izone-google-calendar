'use strict'

const chai = require('chai')
const expect = chai.expect
const {spy, stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('command line interface', () => {
  let cli
  let databaseAdapter, googleAdapter

  beforeEach(() => {
    databaseAdapter = {
      getJobLogs: stub().resolves(
        [
          {
            jl_alias: 'iteam:',
            job_title: 'Iteam code writing',
            jl_starttime: '2017-01-27T16:00:00+01:00',
            jl_endtime: '2017-01-27T16:00:00+01:00'
          }
        ]
      )
    }
    
    googleAdapter = {
      getEvents: stub().resolves(
        [
          {
            summary: 'iteam: Writing some code',
            start: {
              dateTime: '2017-01-27T16:00:00+01:00'
            },
            end: {
              dateTime: '2017-01-27T16:00:00+01:00'
            }
          }
        ]
      )
    }

    cli = proxyquire(process.cwd() + '/lib/cli', {
      './adapters/database': databaseAdapter,
      './adapters/google': googleAdapter
    })
  })

  describe('ls', () => {
    it('gets events from google', () => {
      return cli.ls()
        .then(() => {
          expect(googleAdapter.getEvents).calledOnce
        })
    })

    it('gets jobs from database', () => {
      return cli.ls()
        .then(() => {
          expect(databaseAdapter.getJobLogs).calledOnce
        })
    })
  })
})