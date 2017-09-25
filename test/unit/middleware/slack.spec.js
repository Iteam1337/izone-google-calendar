'use strict'

const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('slack middleware', () => {
  let middleware
  let req, res, next
  let databaseAdapter

  beforeEach(() => {
    req = {
      params: {}
    }

    res = {
      send: stub()
    }

    next = stub()

    databaseAdapter = {
      getPersonBySlackIdentity: stub().resolves()
    }

    middleware = proxyquire(process.cwd() + '/lib/middleware/slack', {
      '../adapters/database': databaseAdapter
    })
  })

  describe('user', () => {
    beforeEach(() => {
      req.params = {
        payload: JSON.stringify({})
      }
    })

    it('calls databaseAdapter', () => {
      return middleware.user(req, res, next)
        .then(() => {
          expect(databaseAdapter.getPersonBySlackIdentity).callCount(1)
        })
    })

    it('passes slack id and slack name for izone user mapping', () => {
      const userId = 'meow123'
      const userName = 'Longcat'

      req.params.user_id = userId
      req.params.user_name = userName

      return middleware.user(req, res, next)
        .then(() => {
          expect(databaseAdapter.getPersonBySlackIdentity).calledWith({
            userId,
            userName
          })
        })
    })
  })
})
