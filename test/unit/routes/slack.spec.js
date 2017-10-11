'use strict'

const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

const moment = require('moment')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('slack route', () => {
  let route
  let req, res, next
  let databaseAdapter
  let izoneService, request, slackService, googleAdapter

  beforeEach(() => {
    req = {
      params: {}
    }

    res = {
      send: stub()
    }

    next = stub()

    izoneService = {
      getAllEvents: stub().resolves()
    }

    request = stub().resolves()

    slackService = {
      summary: stub().resolves()
    }

    databaseAdapter = {
      import: stub().resolves(),
      getJobByAlias: stub()
    }

    googleAdapter = {
      markEventImported: stub().resolves()
    }

    route = proxyquire(process.cwd() + '/lib/routes/slack', {
      '../adapters/database': databaseAdapter,
      '../services/izone': izoneService,
      'request': request,
      '../services/slack': slackService,
      '../adapters/google': googleAdapter
    })
  })

  describe('POST /slack', () => {
    beforeEach(() => {
      req.params = {
        payload: JSON.stringify({})
      }

      izoneService.getAllEvents = stub().resolves({
        calendar: []
      })
    })

    it('calls slackService', () => {
      return route.summary(req, res, next)
        .then(() => {
          expect(slackService.summary).callCount(1)
        })
    })

    it('calls izone service', () => {
      req.params = {
        payload: JSON.stringify({ response_url: 'http://izone.test' })
      }
      return route.import(req, res, next)
        .then(() => {
          expect(izoneService.getAllEvents).callCount(1)
        })
    })

    it('respects user\'s autoimport setting and does not import anything if import parameter is not set', () => {
      req.izone = {
        user: {
          p_izone_autoimport: false,
          p_izusername: 'abc'
        }
      }

      const events = {
        calendar: [
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: 'something: test'
          }
        ],
        izone: []
      }
      izoneService.getAllEvents = stub().resolves(events)
      databaseAdapter.getJobByAlias = stub().resolves([
        {
          job_alias: 'something'
        }
      ])

      return route.import(req, res, next)
        .then(() => {
          console.log()
          expect(databaseAdapter.import).callCount(0)
        })
    })

    it('respects user\'s autoimport setting and skips alias not defined in import parameter', () => {
      req.izone = {
        import: 'something',
        user: {
          p_izone_autoimport: false,
          p_izusername: 'abc'
        }
      }

      const events = {
        calendar: [
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: 'somethingelse: test'
          }
        ],
        izone: []
      }
      izoneService.getAllEvents = stub().resolves(events)
      databaseAdapter.getJobByAlias = stub().resolves([
        {
          job_alias: 'somethingelse'
        }
      ])

      return route.import(req, res, next)
        .then(() => {
          console.log()
          expect(databaseAdapter.import).callCount(0)
        })
    })

    it('respects user\'s autoimport setting and only imports alias defined in import parameter', () => {
      req.izone = {
        google: {
          accessToken: 'purr'
        },
        import: 'something',
        user: {
          p_izone_autoimport: false,
          p_izusername: 'abc'
        }
      }

      const events = {
        calendar: [
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: 'something: test'
          },
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: 'somethingelse: test'
          }
        ],
        izone: []
      }
      izoneService.getAllEvents = stub().resolves(events)

      databaseAdapter.getJobByAlias
        .withArgs('somethingelse')
        .resolves([
          {
            job_alias: 'somethingelse'
          }
        ])

      databaseAdapter.getJobByAlias
        .withArgs('something')
        .resolves([
          {
            job_alias: 'something'
          }
        ])

      return route.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import).callCount(1)
        })
    })

    it('always imports everything if autoimport is set', () => {
      req.izone = {
        google: {
          accessToken: 'purr'
        },
        user: {
          p_izone_autoimport: true,
          p_izusername: 'abc'
        }
      }

      const events = {
        calendar: [
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: 'something: test'
          },
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: 'somethingelse: test'
          }
        ],
        izone: []
      }
      izoneService.getAllEvents = stub().resolves(events)

      databaseAdapter.getJobByAlias
        .withArgs('somethingelse')
        .resolves([
          {
            job_alias: 'somethingelse'
          }
        ])

      databaseAdapter.getJobByAlias
        .withArgs('something')
        .resolves([
          {
            job_alias: 'something'
          }
        ])

      return route.import(req, res, next)
        .then(() => {
          console.log()
          expect(databaseAdapter.import).callCount(2)
        })
    })
  })
})
