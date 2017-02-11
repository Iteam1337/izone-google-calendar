'use strict'

const chai = require('chai')
const expect = chai.expect

const helper = require(process.cwd() + '/lib/helpers/aliasHelper')

describe('aliasHelper', () => {
  describe('isWorkout()', () => {
    describe('can parse', () => {
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

    describe('can handle unexpected events', () => {
      it('.s,d.s,d.sd', () => {
        expect(helper.isWorkout('.s,d.s,d.sd')).to.eql(false)
      })
      it('(empty string)', () => {
        expect(helper.isWorkout('')).to.eql(false)
      })
      it('(null)', () => {
        expect(helper.isWorkout(null)).to.eql(false)
      })
      it('(undefined)', () => {
        expect(helper.isWorkout(undefined)).to.eql(false)
      })
    })
  })
})
