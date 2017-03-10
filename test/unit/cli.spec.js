'use strict'

const chai = require('chai')
const expect = chai.expect
const {spy, stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('command line interface', () => {
  let cli
  let databaseAdapter, googleAdapter, izoneService

  beforeEach(() => {
    databaseAdapter = {}
    
    googleAdapter = {}

    izoneService = {
      getAllEvents: stub().resolves({
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
      }
      )
    }

    cli = proxyquire(process.cwd() + '/lib/cli', {
      './adapters/database': databaseAdapter,
      './adapters/google': googleAdapter,
      './services/izone': izoneService
    })
  })

  describe('ls', () => {
    it('gets events from services/izone', () => {
      return cli.ls()
        .then(() => {
          expect(izoneService.getAllEvents).calledOnce
        })
    })
  })

  describe('import', () => {
    it('gets events from services/izone', () => {
      return cli.import()
        .then(() => {
          expect(izoneService.getAllEvents).calledOnce
        })
    })
  })
})