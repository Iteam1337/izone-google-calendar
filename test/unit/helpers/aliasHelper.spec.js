const chai = require('chai')
const expect = chai.expect

const helper = require(process.cwd() + '/lib/helpers/aliasHelper')

describe('aliasHelper', () => {
  const theories = [
    {
      input: '',
      expected: false
    },
    {
      input: 'träna: crossfit',
      expected: true
    },
    {
      input: 'trän: cykla',
      expected: false
    },
    {
      input: 'TrÄna: yoga',
      expected: true
    },
    {
      input: 'TRÄNA: RUGBY',
      expected: true
    },
    {
      input: 'Dagens pass helg',
      expected: true
    },
    {
      input: '.s,d.s,d.sd',
      expected: false
    },
    {
      input: '(empty string)',
      expected: false
    },
    {
      input: '(null)',
      expected: false
    },
    {
      input: '(undefined)',
      expected: false
    },
    {
      input: null,
      expected: false
    },
    {
      expected: false
    }
  ]

  theories.map(t => {
    it(`isWorkout('${t.input}') should yield ${t.expected}`, () => {
      expect(helper.isWorkout(t.input)).to.eql(t.expected)
    })
  })
})
