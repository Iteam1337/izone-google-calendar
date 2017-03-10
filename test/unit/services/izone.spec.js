'use strict'

const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('izone service', () => {
  let service
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
      ),
      getPerson: stub().resolves([
        {
          p_shortname: 'mew',
          p_emal: 'mew@iteam.se',
          p_firstname: 'mew',
          p_lastname: 'kitteh',
          p_title: 'Office Cat'
        }
      ])
    }

    googleAdapter = {
      getCalendars: stub().resolves(
        {
          id: 'mew@iteam.se'
        }
      ),
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

    service = proxyquire(process.cwd() + '/lib/services/izone', {
      '../adapters/database': databaseAdapter,
      '../adapters/google': googleAdapter
    })
  })

  describe('getAllEvents()', () => {
    it('gets events from google', () => {
      return service.getAllEvents('2017w10')
        .then(() => {
          expect(googleAdapter.getEvents)
            .calledOnce
            .calledWith()
        })
    })

    it('gets jobs from database', () => {
      return service.getAllEvents('2017w10')
        .then(() => {
          expect(databaseAdapter.getJobLogs)
            .calledOnce
            .calledWith()
        })
    })
  })

  describe('getIzoneUser()', () => {
    it('gets calendar from google', () => {
      return service.getIzoneUser()
        .then(() => {
          expect(googleAdapter.getCalendars)
            .calledOnce
            .calledWith()
        })
    })

    it('gets person from izone db', () => {
      return service.getIzoneUser()
        .then(() => {
          expect(databaseAdapter.getPerson)
            .calledOnce
            .calledWith('mew@iteam.se')
        })
    })
  })
})
