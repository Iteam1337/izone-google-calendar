'use strict'

const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('command line interface', () => {
  let cli
  let cliHelper, databaseAdapter, googleAdapter, izoneService

  beforeEach(() => {
    cliHelper = {
      print: stub(),
      printTimeEntry: stub()
    }
    databaseAdapter = {
      update: stub().resolves()
    }
    googleAdapter = {}

    izoneService = {
      getAllEvents: stub()
    }

    izoneService.getAllEvents
      .withArgs('2017w10')
      .resolves({
        izone: [
          {
            jl_alias: 'iteam:',
            job_title: 'Iteam code writing',
            jl_starttime: '2017-01-27T16:00:00+01:00',
            jl_endtime: '2017-01-27T16:00:00+01:00'
          }
        ],
        calendar: [
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
      })

    izoneService.getAllEvents
      .withArgs('2017w11')
      .resolves({
        izone: [
          {
            jl_alias: 'iteam: meow',
            job_title: 'Iteam code writing',
            jl_starttime: '2017-01-27T16:00:00+01:00',
            jl_endtime: '2017-01-27T17:00:00+01:00',
            jl_gcal_id: '=^..^='
          }
        ],
        calendar: [
          {
            summary: 'iteam: Writing some code',
            start: {
              dateTime: '2017-01-27T16:00:00+01:00'
            },
            end: {
              dateTime: '2017-01-27T17:00:00+01:00'
            },
            id: '=^..^='
          }
        ]
      })

    cli = proxyquire(process.cwd() + '/lib/cli', {
      './helpers/cli': cliHelper,
      './adapters/database': databaseAdapter,
      './adapters/google': googleAdapter,
      './services/izone': izoneService
    })
  })

  describe('ls', () => {
    it('gets events from services/izone', () => {
      return cli.ls('2017w10')
        .then(() => {
          expect(izoneService.getAllEvents)
            .calledOnce
            .calledWith('2017w10')
        })
    })
  })

  describe('import', () => {
    it('gets events from services/izone', () => {
      return cli.import('2017w10')
        .then(() => {
          expect(izoneService.getAllEvents)
            .calledOnce
            .calledWith('2017w10')
        })
    })

    it('updates events whose description has been changed in google calendar', () => {
      return cli.import('2017w11')
        .then(() => {
          expect(izoneService.getAllEvents)
            .calledOnce
            .calledWith('2017w11')

          expect(databaseAdapter.update)
            .calledOnce
            .calledWith('=^..^=', {
              jl_description: 'Writing some code',
              jl_starttime: '2017-01-27 16:00:00',
              jl_endtime: '2017-01-27 17:00:00',
              jl_hours: 1
            })
        })
    })
  })
})
