'use strict'

const chai = require('chai')
const expect = chai.expect
const {stub} = require('sinon')
const proxyquire = require('proxyquire')

require('sinon-as-promised')
chai.use(require('sinon-chai'))

describe('izone service', () => {
  let service
  let databaseAdapter, googleAdapter

  beforeEach(() => {
    databaseAdapter = {
      getJobLogs: stub().resolves(
        [
          {
            jl_alias: 'iteam:',
            job_title: 'Iteam code writing',
            jl_starttime: '2017-01-27T16:00:00+01:00',
            jl_endtime: '2017-01-27T18:00:00+01:00'
          }
        ]
      ),
      getPersonByEmail: stub().resolves([
        {
          p_shortname: 'mew',
          p_emal: 'mew@iteam.se',
          p_firstname: 'mew',
          p_lastname: 'kitteh',
          p_title: 'Official Office Cat'
        }
      ])
    }

    googleAdapter = {
      getCalendars: stub().resolves(
        {
          id: 'mew@iteam.se'
        }
      ),
      getEvents: stub().resolves(
        [
          {
            summary: 'iteam: Writing some code',
            start: {
              dateTime: '2017-01-27T16:00:00+01:00'
            },
            end: {
              dateTime: '2017-01-27T18:00:00+01:00'
            }
          }
        ]
      )
    }

    service = proxyquire(process.cwd() + '/lib/services/izone', {
      '../adapters/database': databaseAdapter,
      '../adapters/google': googleAdapter
    })
  })

  describe('getAllEvents()', () => {
    it('gets events from google', () => {
      return service.getAllEvents({ week: '2017w10', google: {}, user: {} })
        .then(() => {
          expect(googleAdapter.getEvents)
            .calledOnce
            .calledWith()
        })
    })

    it('gets jobs from database', () => {
      return service.getAllEvents({ week: '2017w10', google: {}, user: {} })
        .then(() => {
          expect(databaseAdapter.getJobLogs)
            .calledOnce
            .calledWith()
        })
    })
  })

  describe('getWeekSummary()', () => {
    /**
     * Ensure that an unchanged time entry is considered OK.
     */
    it('sets hour status to "ok" if time entry is imported and synced', () => {
      const alias = 'purr'
      databaseAdapter.getJobLogs = stub().resolves(
        [
          {
            jl_alias: alias,
            jl_description: 'purring all day long',
            jl_starttime: '2017-01-27T16:00:00.000Z',
            jl_endtime: '2017-01-27T18:00:00.000Z',
            jl_hours: 2,
            jl_gcal_id: 'meowmeowmeow'
          }
        ]
      )

      googleAdapter.getEvents = stub().resolves(
        [
          {
            id: 'meowmeowmeow',
            summary: `${alias}: purring all day long`,
            start: {
              dateTime: '2017-01-27T16:00:00+01:00'
            },
            end: {
              dateTime: '2017-01-27T18:00:00+01:00'
            }
          }
        ]
      )

      return service.getWeekSummary({week: '2017w10', google: {}, user: {}})
        .then(data => {
          expect(data.hours[`${alias}`].status).equals('ok')
        })
    })

    it('sets hour status to "ok" if time entry is imported and synced even if description is empty', () => {
      const alias = 'mjao'
      databaseAdapter.getJobLogs = stub().resolves(
        [
          {
            jl_alias: alias,
            jl_description: undefined,
            jl_starttime: '2017-01-27T16:00:00.000Z',
            jl_endtime: '2017-01-27T18:00:00.000Z',
            jl_hours: 2,
            jl_gcal_id: 'meowmeowmeow'
          }
        ]
      )

      googleAdapter.getEvents = stub().resolves(
        [
          {
            id: 'meowmeowmeow',
            summary: `${alias}:`,
            start: {
              dateTime: '2017-01-27T16:00:00+01:00'
            },
            end: {
              dateTime: '2017-01-27T18:00:00+01:00'
            }
          }
        ]
      )

      return service.getWeekSummary({week: '2017w10', google: {}, user: {}})
        .then(data => {
          expect(data.hours[`${alias}`].status).equals('ok')
        })
    })

    it('sets hour status to "ok" if time entry has alias in description', () => {
      const alias = 'kurr'
      databaseAdapter.getJobLogs = stub().resolves(
        [
          {
            jl_alias: alias,
            jl_description: 'kurr:',
            jl_starttime: '2017-01-27T16:00:00.000Z',
            jl_endtime: '2017-01-27T18:00:00.000Z',
            jl_hours: 2,
            jl_gcal_id: 'kurr123'
          }
        ]
      )

      googleAdapter.getEvents = stub().resolves(
        [
          {
            id: 'kurr123',
            summary: `${alias}:`,
            start: {
              dateTime: '2017-01-27T16:00:00+01:00'
            },
            end: {
              dateTime: '2017-01-27T18:00:00+01:00'
            }
          }
        ]
      )

      return service.getWeekSummary({week: '2017w10', google: {}, user: {}})
        .then(data => {
          expect(data.hours[`${alias}`].status).equals('ok')
        })
    })

    /**
     * Ensure that a change in a time entry's start time is detected.
     */
    it('sets hour status to "warning" if time entry start time differs', () => {
      const alias = 'rawr'
      databaseAdapter.getJobLogs = stub().resolves(
        [
          {
            jl_alias: alias,
            jl_description: '=^_^=',
            jl_starttime: '2017-01-27T10:00:00.000Z',
            jl_endtime: '2017-01-27T12:00:00.000Z',
            jl_hours: 2
          }
        ]
      )

      googleAdapter.getEvents = stub().resolves(
        [
          {
            summary: `${alias}: =^_^=`,
            start: {
              dateTime: '2017-01-27T11:00:00+01:00'
            },
            end: {
              dateTime: '2017-01-27T13:00:00+01:00'
            }
          }
        ]
      )

      return service.getWeekSummary({week: '2017w10', google: {}, user: {}})
        .then(data => {
          expect(data.hours[`${alias}`].status).equals('warning')
        })
    })

    /**
     * Ensure that a change in a time entry's duration is detected.
     */
    it('sets hour status to "warning" if time entry duration differs', () => {
      const alias = 'rawr'
      databaseAdapter.getJobLogs = stub().resolves(
        [
          {
            jl_alias: alias,
            jl_description: '=^_^=',
            jl_starttime: '2017-01-27T11:00:00.000Z',
            jl_endtime: '2017-01-27T12:00:00.000Z',
            jl_hours: 1
          }
        ]
      )

      googleAdapter.getEvents = stub().resolves(
        [
          {
            summary: `${alias}: =^_^=`,
            start: {
              dateTime: '2017-01-27T11:00:00+01:00'
            },
            end: {
              dateTime: '2017-01-27T13:00:00+01:00' // <-- different.
            }
          }
        ]
      )

      return service.getWeekSummary({week: '2017w10', google: {}, user: {}})
        .then(data => {
          expect(data.hours[`${alias}`].status).equals('warning')
          expect(data.hours[`${alias}`].hours).equals(2)
        })
    })

    /**
     * Ensure that a change in a time entry's summary is detected.
     */
    it('sets hour status to "warning" if time entry summary differs', () => {
      const alias = 'rawr'
      databaseAdapter.getJobLogs = stub().resolves(
        [
          {
            jl_alias: alias,
            jl_description: '=^_^=',
            jl_starttime: '2017-01-27T16:00:00+01:00',
            jl_endtime: '2017-01-27T18:00:00+01:00',
            jl_hours: 2
          }
        ]
      )

      googleAdapter.getEvents = stub().resolves(
        [
          {
            summary: `${alias}: >_<`,
            start: {
              dateTime: '2017-01-27T16:00:00+01:00'
            },
            end: {
              dateTime: '2017-01-27T18:00:00+01:00'
            }
          }
        ]
      )

      return service.getWeekSummary({week: '2017w10', google: {}, user: {}})
        .then(data => {
          expect(data.hours[`${alias}`].status).equals('warning')
        })
    })

    /**
     * Ensure that a change in a time entry's alias is detected.
     */
    it('sets hour status to "error" if time entry alias differs', () => {
      databaseAdapter.getJobLogs = stub().resolves(
        [
          {
            jl_alias: 'meow',
            jl_description: '=^_^=',
            jl_starttime: '2017-01-27T16:00:00+01:00',
            jl_endtime: '2017-01-27T18:00:00+01:00',
            jl_hours: 2
          }
        ]
      )

      googleAdapter.getEvents = stub().resolves(
        [
          {
            summary: 'purr: =^_^=',
            start: {
              dateTime: '2017-01-27T16:00:00+01:00'
            },
            end: {
              dateTime: '2017-01-27T18:00:00+01:00'
            }
          }
        ]
      )

      return service.getWeekSummary({week: '2017w10', google: {}, user: {}})
        .then(data => {
          expect(data.hours['meow'].status).equals('error')
          expect(data.hours['purr']).equals(undefined)
        })
    })
  })

  /**
   * Ensure that an unimported entry is 'warning'.
   */
  it('sets hour status to "danger" if time entry is not imported', () => {
    databaseAdapter.getJobLogs = stub().resolves([])

    googleAdapter.getEvents = stub().resolves(
      [
        {
          id: 'meowmeowmeow',
          summary: 'purr: =^_^=',
          start: {
            dateTime: '2017-01-27T16:00:00+01:00'
          },
          end: {
            dateTime: '2017-01-27T18:00:00+01:00'
          }
        }
      ]
    )

    return service.getWeekSummary({week: '2017w10', google: {}, user: {}})
      .then(data => {
        expect(data.hours['purr'].status).equals('error')
      })
  })

  /**
   * Ensure that all-day events are treated as 8 hours.
   */
  it('sets hours to 8 if event is whole-day', () => {
    databaseAdapter.getJobLogs = stub().resolves([])

    googleAdapter.getEvents = stub().resolves(
      [
        {
          id: 'meowmeowmeow',
          summary: 'purr: =^_^=',
          start: {
            date: '2017-01-27'
          },
          end: {
            date: '2017-01-28'
          }
        }
      ]
    )

    return service.getWeekSummary({week: '2017w10', google: {}, user: {}})
      .then(data => {
        expect(data.hours['purr'].hours).equals(8)
      })
  })
})
