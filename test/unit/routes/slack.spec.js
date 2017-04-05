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
  let slackService

  beforeEach(() => {
    req = {
      params: {}
    }

    res = {
      send: stub()
    }

    next = stub()

    slackService = {
      summary: stub().resolves()
    }

    route = proxyquire(process.cwd() + '/lib/routes/slack', {
      '../services/slack': slackService
    })
  })

  describe('POST /slack', () => {
    let parameters = {}

    beforeEach(() => {
      req.params
    })

    it('calls slackService', () => {
      return route.summary(req, res, next)
        .then(() => {
          expect(slackService.summary)
            .calledOnce
        })
    })
  })
})
