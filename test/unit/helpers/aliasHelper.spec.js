'use strict'

const chai = require('chai')
const expect = chai.expect

const helper = require(process.cwd() + '/lib/helpers/aliasHelper')

describe('aliasHelper', () => {
  describe('isWorkout()', () => {
    it('träna: crossfit', () => {
      expect(helper.isWorkout('träna: crossfit')).to.eql(true)
    })
    it('TRÄNA: Lunchlöpning', () => {
      expect(helper.isWorkout('TRÄNA: Lunchlöpning')).to.eql(true)
    })
    it('Dagens pass helg', () => {
      expect(helper.isWorkout('Dagens pass helg')).to.eql(true)
    })
  })
})
