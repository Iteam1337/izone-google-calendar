const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('REST API', () => {
  let sut

  let appMock
  let restifyMock

  beforeEach(() => {
    appMock = {
      get: stub(),
      listen: stub(),
      post: stub(),
      pre: stub(),
      use: stub()
    }

    restifyMock = {
      bodyParser: stub(),
      CORS: stub(),
      createServer: stub().returns(appMock),
      queryParser: stub(),
      pre: {
        sanitizePath: stub().returns()
      }
    }

    sut = proxyquire(process.cwd() + '/lib/index.js', {
      'restify': restifyMock
    })
  })

  describe('init', () => {
    beforeEach(() => {
      sut.init()
    })

    it('creates rest server', () => {
      expect(restifyMock.createServer).callCount(1)
    })

    it('configures app', () => {
      expect(restifyMock.pre.sanitizePath).callCount(1)
      expect(restifyMock.CORS).callCount(1)
      expect(restifyMock.bodyParser).callCount(1)
      expect(restifyMock.queryParser).callCount(1)
    })

    it('sets up a GET "/" route', () => {
      expect(appMock.get)
        .callCount(1)
        .calledWith('/')
    })

    it('sets up a POST "/slack" route', () => {
      expect(appMock.post)
        .callCount(2)
        .calledWith('/slack/import')
        .calledWith('/slack/summary')
    })

    it('calls app.listen()', () => {
      expect(appMock.listen)
        .callCount(1)
    })
  })
})
