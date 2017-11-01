const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

const moment = require('moment')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('routes/slack', () => {
  let sut
  let req, res, next
  let databaseAdapter
  let izoneService, request, slackService, googleAdapter

  beforeEach(() => {
    req = {
      body: {},
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
      getJobByAlias: stub(),
      update: stub().resolves()
    }

    googleAdapter = {
      markEventImported: stub().resolves()
    }

    sut = proxyquire(process.cwd() + '/lib/routes/slack', {
      '../adapters/database': databaseAdapter,
      '../services/izone': izoneService,
      'request': request,
      '../services/slack': slackService,
      '../adapters/google': googleAdapter
    })
  })

  describe('import()', () => {
    beforeEach(() => {
      req.params = {
        payload: JSON.stringify({})
      }

      izoneService.getAllEvents = stub().resolves({
        calendar: []
      })
    })

    it('calls slackService', () => {
      return sut.summary(req, res, next)
        .then(() => {
          expect(slackService.summary).callCount(1)
        })
    })

    it('calls izone service', () => {
      req.params = {
        payload: JSON.stringify({ response_url: 'http://izone.test' })
      }
      return sut.import(req, res, next)
        .then(() => {
          expect(izoneService.getAllEvents).callCount(1)
        })
    })
  })

  /*
   * User "autoimport" setting tests.
   */
  describe('import()', () => {
    beforeEach(() => {
      req.params = {
        payload: JSON.stringify({})
      }

      req.izone = {
        user: {
          p_izone_autoimport: false,
          p_izusername: 'abc'
        },
        google: {
          accessToken: 'purr'
        }
      }

      izoneService.getAllEvents = stub().resolves({
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
      })

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
    })

    it('respects user\'s autoimport setting and does not import anything if import parameter is not set', () => {
      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import).callCount(0)
        })
    })

    it('respects user\'s autoimport setting and skips alias not defined in import parameter', () => {
      req.izone.import = 'somethingelse'

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import).callCount(0)
        })
    })

    it('respects user\'s autoimport setting and only imports alias defined in import parameter', () => {
      req.izone.import = 'something'

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

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import).callCount(1)
        })
    })

    it('always imports everything if autoimport is set', () => {
      req.izone.user.p_izone_autoimport = true

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

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import).callCount(2)
        })
    })
  })

  /*
   * Import logic tests with regard to alias job_db mapping.
   */
  describe('import()', () => {
    const aliases = {
      hasJob: 'izone',
      doesNotHaveJob: 'izoneblablabla',
      havingMoreThanOneJob: 'overusedalias'
    }

    beforeEach(() => {
      req.params = {
        payload: JSON.stringify({})
      }

      req.izone = {
        user: {
          p_izone_autoimport: true,
          p_izusername: 'abc'
        },
        google: {
          accessToken: 'zaq12wsxcde34rfv'
        }
      }

      databaseAdapter.getJobByAlias
        .withArgs(aliases.doesNotHaveJob)
        .resolves([])

      databaseAdapter.getJobByAlias
        .withArgs(aliases.hasJob)
        .resolves([
          {
            job_alias: aliases.hasJob
          }
        ])

      databaseAdapter.getJobByAlias
        .withArgs(aliases.havingMoreThanOneJob)
        .resolves([
          {
            job_alias: aliases.havingMoreThanOneJob
          },
          {
            job_alias: aliases.havingMoreThanOneJob
          }
        ])
    })

    it('does not import hours if alias cannot be found in database', () => {
      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: `${aliases.doesNotHaveJob}: test`
          }
        ],
        izone: [] // Nothing imported yet.
      })

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import)
            .callCount(0)
        })
    })

    it('does not import hours if alias maps to more than one project', () => {
      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: `${aliases.havingMoreThanOneJob}: test`
          }
        ],
        izone: [] // Nothing imported yet.
      })

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import)
            .callCount(0)
        })
    })

    it('does not import hours if time entry has not ended yet', () => {
      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: moment().add(1, 'hours') // Ends in the future - not going to be imported.
            },
            start: {
              dateTime: moment().add(-1, 'hours')
            },
            summary: `${aliases.hasJob}: doing some work right now`
          },
          {
            end: {
              dateTime: moment().add(-1, 'hours')
            },
            start: {
              dateTime: moment().add(-2, 'hours')
            },
            summary: `${aliases.hasJob}: did some work an hour ago`
          }
        ],
        izone: [] // Nothing imported yet.
      })

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import)
            .callCount(1)
        })
    })

    it('does not import hours that contain no alias and are not workouts', () => {
      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: 'work work work' // Not an actual alias.
          }
        ],
        izone: [] // Nothing imported yet.
      })

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import)
            .callCount(0)
        })
    })

    it('imports a time entry if alias maps to a single "job" in the database', () => {
      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: `${aliases.hasJob}: test`
          }
        ],
        izone: [] // Nothing imported yet.
      })

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import)
            .callCount(1)
        })
    })

    it('imports time entries if alias maps to a single "job" in the database', () => {
      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: `${aliases.hasJob}: work work work`
          },
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: `${aliases.hasJob}: test`
          },
          {
            end: {
              dateTime: moment()
            },
            start: {
              dateTime: moment()
            },
            summary: `${aliases.hasJob}: test`
          }
        ],
        izone: [] // Nothing imported yet.
      })

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import)
            .callCount(3)
        })
    })
  })

  describe('import()', () => {
    const alias = 'izone'

    beforeEach(() => {
      req.params = {
        payload: JSON.stringify({})
      }

      req.izone = {
        user: {
          p_izone_autoimport: true,
          p_izusername: 'abc'
        },
        google: {
          accessToken: 'zaq12wsxcde34rfv'
        }
      }

      databaseAdapter.getJobByAlias
        .withArgs(alias)
        .resolves([
          {
            job_alias: alias
          }
        ])
    })

    it('updates event if start time differs', () => {
      const startTimeCalendar = moment('2017-06-30 09:00:00')
      const startTimeIzone = moment('2017-06-30 10:00:00')

      const endTimeCalendar = moment('2017-06-30 10:00:00')
      const endTimeIzone = moment('2017-06-30 11:00:00')

      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: endTimeCalendar
            },
            start: {
              dateTime: startTimeCalendar
            },
            summary: `${alias}: working`,
            id: '1q2w3e'
          }
        ],
        izone: [
          {
            jl_endtime: endTimeIzone,
            jl_starttime: startTimeIzone,
            jl_description: 'working',
            jl_hours: 1,
            jl_alias: alias,
            jl_gcal_id: '1q2w3e'
          }
        ]
      })

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.update)
            .callCount(1)
            .calledWith('1q2w3e', {
              jl_starttime: startTimeCalendar.format('YYYY-MM-DD HH:mm:ss'),
              jl_endtime: endTimeCalendar.format('YYYY-MM-DD HH:mm:ss'),
              jl_hours: 1,
              jl_description: 'working'
            })
        })
    })

    it('updates event if moved to another week', () => {
      const startTimeCalendar = moment('2017-10-10 08:30:00')
      const startTimeIzone = moment('2017-10-16 08:30:00')

      const endTimeCalendar = moment('2017-10-10 10:00:00')
      const endTimeIzone = moment('2017-10-16 10:00:00')

      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: endTimeCalendar
            },
            start: {
              dateTime: startTimeCalendar
            },
            summary: `${alias}: working`,
            id: '1q2w3e'
          }
        ],
        izone: [
          {
            jl_endtime: endTimeIzone,
            jl_starttime: startTimeIzone,
            jl_description: 'working',
            jl_hours: 1.5,
            jl_alias: alias,
            jl_gcal_id: '1q2w3e'
          }
        ]
      })

      req.izone.week = '2017w41'

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.import)
            .callCount(0)

          expect(databaseAdapter.update)
            .callCount(1)
            .calledWith('1q2w3e', {
              jl_starttime: startTimeCalendar.format('YYYY-MM-DD HH:mm:ss'),
              jl_endtime: endTimeCalendar.format('YYYY-MM-DD HH:mm:ss'),
              jl_hours: 1.5,
              jl_description: 'working'
            })
        })
    })

    it('updates event if duration differs', () => {
      const startTime = moment('2017-06-30 09:00:00')

      const endTimeCalendar = moment('2017-06-30 10:00:00')
      const endTimeIzone = moment('2017-06-30 11:00:00')

      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: endTimeCalendar
            },
            start: {
              dateTime: startTime
            },
            summary: `${alias}: working`,
            id: '1q2w3e'
          }
        ],
        izone: [
          {
            jl_endtime: endTimeIzone,
            jl_starttime: startTime,
            jl_description: 'working',
            jl_hours: 2,
            jl_alias: alias,
            jl_gcal_id: '1q2w3e'
          }
        ]
      })

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.update)
            .callCount(1)
            .calledWith('1q2w3e', {
              jl_starttime: startTime.format('YYYY-MM-DD HH:mm:ss'),
              jl_endtime: endTimeCalendar.format('YYYY-MM-DD HH:mm:ss'),
              jl_hours: 1,
              jl_description: 'working'
            })
        })
    })

    it('updates event if description differs', () => {
      const startTime = moment('2017-06-30 09:00:00')
      const endTime = moment('2017-06-30 10:00:00')

      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: endTime
            },
            start: {
              dateTime: startTime
            },
            summary: `${alias}: doing stuff and doing some work`,
            id: '1q2w3e'
          }
        ],
        izone: [
          {
            jl_endtime: endTime,
            jl_starttime: startTime,
            jl_description: 'doing stuff',
            jl_hours: 1,
            jl_alias: alias,
            jl_gcal_id: '1q2w3e'
          }
        ]
      })

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.update)
            .callCount(1)
            .calledWith('1q2w3e', {
              jl_starttime: startTime.format('YYYY-MM-DD HH:mm:ss'),
              jl_endtime: endTime.format('YYYY-MM-DD HH:mm:ss'),
              jl_hours: 1,
              jl_description: 'doing stuff and doing some work'
            })
        })
    })

    it('does not update event if time, duration, alias and description is unchanged', () => {
      const id = '1q2w3e'
      const description = 'doing stuff'
      const endTime = moment('2017-06-30 10:00:00')
      const startTime = moment('2017-06-30 09:00:00')

      izoneService.getAllEvents = stub().resolves({
        calendar: [
          {
            end: {
              dateTime: endTime
            },
            start: {
              dateTime: startTime
            },
            summary: `${alias}: ${description}`,
            id
          }
        ],
        izone: [
          {
            jl_endtime: endTime,
            jl_starttime: startTime,
            jl_description: description,
            jl_hours: 1,
            jl_alias: alias,
            jl_gcal_id: id
          }
        ]
      })

      return sut.import(req, res, next)
        .then(() => {
          expect(databaseAdapter.update)
            .callCount(0)
        })
    })
  })
})
