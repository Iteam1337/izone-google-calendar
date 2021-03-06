const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('parameter middleware', () => {
  let middleware
  let req, res, next

  beforeEach(() => {
    req = {
      params: {}
    }

    res = {
      end: stub(),
      send: stub()
    }

    next = stub()

    middleware = proxyquire(process.cwd() + '/lib/middleware/parameter', {
    })
  })

  describe('parseParameters', () => {
    it('can parse parameter "week"', () => {
      req.params.text = '/time week=2017w12'
      middleware.parseParameters(req, res, next)
      expect(req.izone.week).to.eql('2017w12')
    })

    it('can parse parameter "import=träna"', () => {
      req.params.text = '/time import=träna'
      middleware.parseParameters(req, res, next)
      expect(req.izone.import).to.eql('träna')
    })

    it('can parse parameter "import=iteamvs"', () => {
      req.params.text = '/time import=iteamvs'
      middleware.parseParameters(req, res, next)
      expect(req.izone.import).to.eql('iteamvs')
    })
  })
})
