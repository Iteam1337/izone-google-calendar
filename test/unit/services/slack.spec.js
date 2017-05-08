'use strict'

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

    beforeEach(() => {
      parameters.week = '2017w01'
    })

    it('calls izoneService', () => {
      return service.summary(parameters)
        .then(() => {
          expect(izoneService.getWeekSummary).callCount(1)
        })
    })

    it('marks time entries as "bad" if they are set to a non-existent alias', () => {

    })

    it('marks time entries as "warning" if they only exist in calendar', () => {

    })

    it('marks time entries as "warning" if they exist both in calendar and izone and their time differ', () => {

    })

    it('marks time entries as "good" if they exist both in calendar and izone, and are synced', () => {

    })
  })
})
