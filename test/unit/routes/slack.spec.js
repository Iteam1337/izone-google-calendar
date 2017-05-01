'use strict'

const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('rest api', () => {
  let route
  let req, res, next
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

    route = proxyquire(process.cwd() + '/lib/routes/slack', {
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
    })

    it('calls slackService', () => {
      return route.summary(req, res, next)
        .then(() => {
          expect(slackService.summary).callCount(1)
        })
    })
  })

  describe('POST /slack/import', () => {
    beforeEach(() => {
      req.params = {
        payload: JSON.stringify({
          response_url: ''
        })
      }

      izoneService.getAllEvents = stub().resolves({
        calendar: []
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
  })
})
