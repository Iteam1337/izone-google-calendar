'use strict'

const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

const moment = require('moment')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('google middleware', () => {
  let sut
  let req, res, next

  let database
  let google

  beforeEach(() => {
    req = {
      params: {},
      izone: {
        // In reality, req.izone is set by previous middleware.
        user: {}
      }
    }

    res = {
      end: stub(),
      send: stub()
    }

    next = stub()

    database = {
      updateGoogleToken: stub().resolves()
    }

    google = {
      generateAuthUrl: stub(),
      getAccessToken: stub().resolves()
    }

    sut = proxyquire(process.cwd() + '/lib/middleware/google', {
      '../adapters/database': database,
      '../adapters/google': google
    })
  })

  describe.only('validateGoogleAuthorization', () => {
    const expiredTokenTime = moment().format('x') - 1000

    it('calls google adapter to get auth url if token is not set', () => {
      req.izone.user.p_google_token_expiry = null
      sut.validateGoogleAuthorization(req, res, next)
        .then(() => {
          expect(google.generateAuthUrl).callCount(1)
          expect(next)
            .callCount(1)
            .calledWith(false)
        })
    })

    it('calls google adapter to get auth url if token is expired', () => {
      req.izone.user.p_google_token_expiry = expiredTokenTime
      sut.validateGoogleAuthorization(req, res, next)
        .then(() => {
          expect(google.generateAuthUrl).callCount(1)
          expect(next)
            .callCount(1)
            .calledWith(false)
        })
    })

    it('calls google adapter to get new access token if token is not set and setGoogleToken parameter is set', () => {
      req.izone.user.p_google_token_expiry = null
      req.izone.setGoogleToken = 'meow'

      sut.validateGoogleAuthorization(req, res, next)
        .then(() => {
          expect(google.getAccessToken)
            .callCount(1)
            .calledWith('meow')
        })
    })

    it('calls google adapter to get new access token if token is expired and setGoogleToken parameter is set', () => {
      req.izone.user.p_google_token_expiry = expiredTokenTime
      req.izone.setGoogleToken = 'meow'

      sut.validateGoogleAuthorization(req, res, next)
        .then(() => {
          expect(google.getAccessToken)
            .callCount(1)
            .calledWith('meow')
        })
    })

    it('sets req.izone.google.accessToken', () => {
      req.izone.user.p_google_token_expiry = expiredTokenTime + 2000
      req.izone.user.p_google_token_access_token = 'an_arbitrary_token_value'

      sut.validateGoogleAuthorization(req, res, next)
        .then(() => {
          expect(req.izone.google.accessToken).to.eql('an_arbitrary_token_value')
          expect(next).callCount(1)
        })
    })
  })
})
