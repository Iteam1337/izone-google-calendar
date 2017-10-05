'use strict'

const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('slack route', () => {
  let route
  let req, res, next
  let databaseAdapter
  let izoneService, request, slackService

  beforeEach(() => {
    req = {
      params: {}
    }

    res = {
      send: stub()
    }

    next = stub()

    izoneService = {
      getAllEvents: stub().resolves()
    }

    request = stub().resolves()

    slackService = {
      summary: stub().resolves()
    }

    databaseAdapter = {
      import: stub().resolves()
    }

    route = proxyquire(process.cwd() + '/lib/routes/slack', {
      '../adapters/database': databaseAdapter,
      '../services/izone': izoneService,
      'request': request,
      '../services/slack': slackService
    })
  })

  describe('POST /slack', () => {
    beforeEach(() => {
      req.params = {
        payload: JSON.stringify({})
      }

      izoneService.getAllEvents = stub().resolves({
        calendar: []
      })
    })

    it('calls slackService', () => {
      return route.summary(req, res, next)
        .then(() => {
          expect(slackService.summary).callCount(1)
        })
    })

    it('calls izone service', () => {
      req.params = {
        payload: JSON.stringify({ response_url: 'http://izone.test' })
      }
      return route.import(req, res, next)
        .then(() => {
          expect(izoneService.getAllEvents).callCount(1)
        })
    })

    it.only('respects user\'s autoimport setting', () => {
      req.izone = {
        import: 'something',
        user: {
          p_izone_autoimport: false,
          p_izusername: 'abc'
        }
      }

      const events = {
        calendar: [
          {
            end: {
              dateTime: Date()
            },
            start: {
              dateTime: Date()
            },
            summary: 'somethingelse: test'
          }
        ],
        izone: []
      }
      izoneService.getAllEvents = stub().resolves(events)
      databaseAdapter.getJobByAlias = stub().resolves([
        {
          job_alias: 'somethingelse'
        }
      ])

      return route.import(req, res, next)
        .then(() => {
          console.log()
          expect(databaseAdapter.import).callCount(0)
        })
    })
  })
})
