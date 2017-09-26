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
      end: stub(),
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
    const userId = 'meow123'
    const userName = 'Longcat'

    beforeEach(() => {
      req.params = {
        payload: JSON.stringify({})
      }
    })

    it('calls databaseAdapter', () => {
      req.params.user_id = userId
      return middleware.user(req, res, next)
        .then(() => {
          expect(databaseAdapter.getPersonBySlackIdentity).callCount(1)
        })
    })

    it('passes slack id and slack name for izone user mapping', () => {
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

    it('sets req.izoneUser, when person can be mapped', () => {
      req.params.user_id = userId
      req.params.user_name = userName

      const izoneUser = {
        p_id: 1,
        p_slack_user_id: userId,
        p_slack_user_name: userName
      }
      databaseAdapter.getPersonBySlackIdentity = stub().resolves(izoneUser)

      return middleware.user(req, res, next)
        .then(() => {
          expect(next).callCount(1)
          expect(req.izoneUser.p_id).to.eql(1)
          expect(req.izoneUser.p_slack_user_id).to.eql(userId)
          expect(req.izoneUser.p_slack_user_name).to.eql(userName)
        })
    })

    it('returns error 401, when person cannot be mapped', () => {
      req.params.user_id = userId
      req.params.user_name = userName

      databaseAdapter.getPersonBySlackIdentity = stub().resolves({})

      return middleware.user(req, res, next)
        .then(() => { expect('should go to catch()').to.eql('') })
        .catch(() => {
          expect(next).callCount(1)
          expect(res.statusCode).to.eql(401)
          expect(req.izoneUser).to.eql(undefined)
        })
    })

    it('returns error 500, if no user is set on req.params', () => {
      return middleware.user(req, res, next)
        .then(() => { expect('should go to catch()').to.eql('') })
        .catch(() => {
          expect(next).callCount(1)
          expect(res.statusCode).to.eql(500)
          expect(req.izoneUser).to.eql(undefined)
        })
    })
  })
})
