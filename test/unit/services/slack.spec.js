const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('slack service', () => {
  let service
  let izoneService

  beforeEach(() => {
    izoneService = {
      getWeekSummary: stub().resolves({
        hours: []
      })
    }

    service = proxyquire(process.cwd() + '/lib/services/slack', {
      './izone': izoneService
    })
  })

  describe('summary()', () => {
    const parameters = {}
    const summary = {}

    beforeEach(() => {
      parameters.week = '2017w01'
      summary.hours = {}
    })

    it('calls izoneService', () => {
      return service.summary(parameters)
        .then(() => {
          expect(izoneService.getWeekSummary).callCount(1)
        })
    })

    xit('marks time entries as "danger" if they are set to a non-existent alias', () => {
      summary.hours['rawr'] = {
        hours: 1,
        status: 'error'
      }

      izoneService.getWeekSummary = stub().resolves(summary)

      return service.summary(parameters)
        .then(data => {
          expect(data.attachments[0].color).to.eql('danger')
          expect(data.attachments[0].text).to.eql('rawr: 1 h')
        })
    })

    xit('marks time entries as "warning" if their status is "warning"', () => {
      summary.hours['meow'] = {
        hours: 1,
        status: 'warning'
      }

      izoneService.getWeekSummary = stub().resolves(summary)

      return service.summary(parameters)
        .then(data => {
          expect(data.attachments[0].color).to.eql('warning')
          expect(data.attachments[0].text).to.eql('meow: 1 h')
        })
    })

    xit('marks time entries as "good" if their status is "ok"', () => {
      summary.hours['meow'] = {
        hours: 3,
        status: 'ok'
      }

      izoneService.getWeekSummary = stub().resolves(summary)

      return service.summary(parameters)
        .then(data => {
          expect(data.attachments[0].color).to.eql('good')
          expect(data.attachments[0].text).to.eql('meow: 3 h')
        })
    })
  })
})
