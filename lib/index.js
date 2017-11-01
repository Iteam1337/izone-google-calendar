const restify = require('restify')
const slackRoutes = require('./routes/slack')

const { validateGoogleAuthorization } = require('./middleware/google')
const { log } = require('./middleware/log')
const { parseParameters } = require('./middleware/parameter')
const { token, user } = require('./middleware/slack')

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

    app.post('/slack/import', log, token, user, parseParameters, validateGoogleAuthorization, slackRoutes.import)
    app.post('/slack/summary', log, token, user, parseParameters, validateGoogleAuthorization, slackRoutes.summary)

    const port = process.env.PORT || 3000
    app.listen(port, () => {
      console.log('listening on', port)
    })
  }
}
