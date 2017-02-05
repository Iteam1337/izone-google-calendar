'use strict'

const chai = require('chai')
const expect = chai.expect

const helper = require(process.cwd() + '/lib/helpers/weekHelper')

describe('weekHelper', () => {
  describe('addWeek()', () => {
    it('2017w01 + 1', () => {
      expect(helper.addWeek('2017w01', 1)).to.eql('2017w02')
    })
    it('2017w01 + 10', () => {
      expect(helper.addWeek('2017w01', 10)).to.eql('2017w11')
    })
    it('2015w50 + 3', () => {
      expect(helper.addWeek('2015w50', 3)).to.eql('2015w53')
    })
    it('2017w02 - 10', () => {
      expect(helper.addWeek('2017w02', -10)).to.eql('2016w44')
    })
  })
  describe('getWeek()', () => {
    it('201705', () => {
      expect(helper.getWeek('2017w05')).to.eql({
        Monday: '2017-01-30',
        Tuesday: '2017-01-31',
        Wednesday: '2017-02-01',
        Thursday: '2017-02-02',
        Friday: '2017-02-03',
        Saturday: '2017-02-04',
        Sunday: '2017-02-05'
      })
    })
    it('201553', () => {
      expect(helper.getWeek('2015w53')).to.eql({
        Monday: '2015-12-28',
        Tuesday: '2015-12-29',
        Wednesday: '2015-12-30',
        Thursday: '2015-12-31',
        Friday: '2016-01-01',
        Saturday: '2016-01-02',
        Sunday: '2016-01-03'
      })
    })
  })

  describe('getWeekForDate()', () => {
    it('2017-02-01', () => {
      expect(helper.getWeekForDate('2017-02-01')).to.eql('2017w05')
    })
    it('2017-01-23', () => {
      expect(helper.getWeekForDate('2017-01-23')).to.eql('2017w04')
    })
    it('2016-01-01', () => {
      expect(helper.getWeekForDate('2016-01-01')).to.eql('2016w53')
    })
    it('2015-12-31', () => {
      expect(helper.getWeekForDate('2015-12-31')).to.eql('2015w53')
    })
    it('2015-12-27', () => {
      expect(helper.getWeekForDate('2015-12-27')).to.eql('2015w52')
    })
  })
})
