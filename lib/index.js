'use strict'

const restify = require('restify')
const slackRoutes = require('./routes/slack')

const { log } = require('./middleware/log')
const { token } = require('./middleware/slack')

const app = restify.createServer({})
app.pre(restify.pre.sanitizePath())
app.use(restify.CORS())
app.use(restify.bodyParser())
app.use(restify.queryParser())

app.get('/', (req, res, next) => {
  const version = require('./package.json').version
  res.end(`izone ${version}`)
})

app.post('/slack', log, token, slackRoutes.summary)
app.post('/slack/import', log, token, slackRoutes.import)

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log('listening on', port)
})
