'use strict'

const chai = require('chai')
const expect = chai.expect
const {spy, stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('izone service', () => {
  let service
  let databaseAdapter, googleAdapter

  beforeEach(() => {
    databaseAdapter = {
      getPerson: stub().resolves(
        {
          p_shortname: 'mew',
          p_emal: 'mew@iteam.se',
          p_firstname: 'mew',
          p_lastname: 'kitteh',
          p_title: 'Office Cat'
        }
      )
    }
    
    googleAdapter = {
      getCalendars: stub().resolves(
        {
          id: 'mew@iteam.se'
        }
      )
    }

    service = proxyquire(process.cwd() + '/lib/services/izone', {
      '../adapters/database': databaseAdapter,
      '../adapters/google': googleAdapter
    })
  })

  describe('getIzoneUser()', () => {
    it('gets calendar from google', () => {
      return service.getIzoneUser()
        .then(() => {
          expect(googleAdapter.getCalendars)
            .calledOnce
        })
    })

    it('gets person from izone db', () => {
      return service.getIzoneUser()
        .then(() => {
          expect(databaseAdapter.getPerson)
            .calledOnce
            .calledWith('mew@iteam.se')
        })
    })
  })
})