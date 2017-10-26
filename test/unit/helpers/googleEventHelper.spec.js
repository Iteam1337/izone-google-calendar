const chai = require('chai')
const expect = chai.expect

const helper = require(process.cwd() + '/lib/helpers/googleEventHelper')

describe('googleEventHelper', () => {
  describe('getDuration(<event>)', () => {
    let event
    beforeEach(() => {
      event = {
        end: {},
        start: {}
      }
    })

    it('correctly handles event having end.dateTime and start.dateTime', () => {
      event.end.dateTime = '2017-01-27T17:00:00+01:00'
      event.start.dateTime = '2017-01-27T16:00:00+01:00'

      const duration = helper.getDuration(event)
      expect(duration.allDay).to.eql(false)
      expect(duration.end.format()).to.eql('2017-01-27T17:00:00+01:00')
      expect(duration.hours).to.eql(1)
      expect(duration.start.format()).to.eql('2017-01-27T16:00:00+01:00')
    })

    it('correctly handles event having end.date and start.date', () => {
      event.end.date = '2017-01-27'
      event.start.date = '2017-01-26'

      const duration = helper.getDuration(event)
      expect(duration.allDay).to.eql(true)
      expect(duration.end.format()).to.eql('2017-01-27T00:00:00+01:00')
      expect(duration.hours).to.eql(8)
      expect(duration.start.format()).to.eql('2017-01-26T00:00:00+01:00')
    })
  })
})
