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
      getPersonBySlackIdentity: stub().resolves(),
      updatePerson: stub().resolves()
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

    it('sets req.izone.user, when person can be mapped', () => {
      req.params.user_id = userId
      req.params.user_name = userName

      const izoneUser = [
        {
          p_id: 1,
          p_slack_user_id: userId,
          p_slack_user_name: userName
        }
      ]
      databaseAdapter.getPersonBySlackIdentity = stub().resolves(izoneUser)

      return middleware.user(req, res, next)
        .then(() => {
          expect(next).callCount(1)
          expect(req.izone.user.p_id).to.eql(1)
          expect(req.izone.user.p_slack_user_id).to.eql(userId)
          expect(req.izone.user.p_slack_user_name).to.eql(userName)
        })
    })

    it('updates people_db, when person lacks slack_id', () => {
      req.params.user_id = userId
      req.params.user_name = userName

      const izoneUser = [
        {
          p_id: 1,
          p_slack_user_id: null,
          p_slack_user_name: userName
        }
      ]
      databaseAdapter.getPersonBySlackIdentity = stub().resolves(izoneUser)

      return middleware.user(req, res, next)
        .then(() => {
          expect(next).callCount(1)
          expect(req.izone.user.p_id).to.eql(1)
          expect(req.izone.user.p_slack_user_name).to.eql(userName)
          expect(databaseAdapter.updatePerson)
            .callCount(1)
            .calledWith({
              userId,
              userName
            })
        })
    })

    it('returns a friendly message, when person cannot be mapped', () => {
      req.params.user_id = userId
      req.params.user_name = userName

      databaseAdapter.getPersonBySlackIdentity = stub().resolves({})

      return middleware.user(req, res, next)
        .then(() => { expect('should go to catch()').to.eql('') })
        .catch(() => {
          expect(next).callCount(1)
          expect(res.statusCode).to.eql(200)
          expect(res.send.firstCall.args[0]).to.eql({text: 'Sorry, your user is not configured yet.'})
          expect(req.izone.user).to.eql(undefined)
        })
    })

    it('returns error 500, if no user is set on req.params', () => {
      return middleware.user(req, res, next)
        .then(() => { expect('should go to catch()').to.eql('') })
        .catch(() => {
          expect(next).callCount(1)
          expect(res.statusCode).to.eql(500)
          expect(req.izone.user).to.eql(undefined)
        })
    })
  })
})
