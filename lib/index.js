const restify = require('restify')
const slackRoutes = require('./routes/slack')

const { validateGoogleAuthorization } = require('./middleware/google')
const { log } = require('./middleware/log')
const { parseParameters, parseButtonParameters } = require('./middleware/parameter')
const { token, user } = require('./middleware/slack')

function parsePayload (req, res, next) {
  if (req.params.payload) {
    req.params = JSON.parse(req.params.payload)
  }

  next()
}

module.exports = {
  init: () => {
    const app = restify.createServer({})
    app.pre(restify.pre.sanitizePath())
    app.use(restify.CORS())
    app.use(restify.bodyParser())
    app.use(restify.queryParser())

    app.get('/', (req, res, next) => {
      res.end(`izone =^_^=`)
    })

    app.post('/slack/button', log, parsePayload, token, user, parseButtonParameters, validateGoogleAuthorization, slackRoutes.import)
    app.post('/slack/summary', log, token, user, parseParameters, validateGoogleAuthorization, slackRoutes.summary)

    const port = process.env.PORT || 3000
    app.listen(port, () => {
      console.log('listening on', port)
    })
  }
}
