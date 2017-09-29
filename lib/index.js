'use strict'

const restify = require('restify')
const slackRoutes = require('./routes/slack')

const { validateGoogleAuthorization } = require('./middleware/google')
const { log } = require('./middleware/log')
const { parseParameters } = require('./middleware/parameter')
const { token, user } = require('./middleware/slack')

const app = restify.createServer({})
app.pre(restify.pre.sanitizePath())
app.use(restify.CORS())
app.use(restify.bodyParser())
app.use(restify.queryParser())

app.get('/', (req, res, next) => {
  res.end(`izone =^_^=`)
})

/*
 * Middlewares:
 * log - console.log() incoming request
 * token - verify the slack token so that only known sources can use this api instance
 * user - map slack user to izone user
 * parseParameters - turn command parameters into an object
 * validateGoogleAuthorization - check that user has google authorization so the calendar can be accessed
 * slackRoutes.summary - merge google calendar and izone data into a weekly overview
 */
app.post('/slack', log, token, user, parseParameters, validateGoogleAuthorization, slackRoutes.summary)
app.post('/slack/import', log, token, user, parseParameters, slackRoutes.import)

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log('listening on', port)
})
