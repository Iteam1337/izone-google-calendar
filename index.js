'use strict'

const izoneService = require('./lib/services/izone')
const restify = require('restify')

const app = restify.createServer({})
app.pre(restify.pre.sanitizePath())
app.use(restify.CORS())
app.use(restify.bodyParser())
app.use(restify.queryParser())

app.get('/', (req, res, next) => {
  const version = require('./package.json').version
  res.end(`izone ${version}`)
})

app.post('/slack/summary', (req, res, next) => {
  console.log('body', req.body)
  console.log('params', req.params)
  const parsedParameters = parseParameters(req.params.command)
  console.log(parsedParameters)
  const week = '2017w14'
  return izoneService.getWeekSummary(week)
    .then(summary => {
      const response = {
        attachments: []
      }
      response.text = `Summary for ${week}`

      for (let hour in summary.hours) {
        response.attachments.push({
          text: `${hour}: ${summary.hours[hour].hours} h`
        })
      }

      res.send(response)
      next()
    })
})

app.post('/slack/list', (req, res, next) => {
  console.log('body', req.body)
  console.log('params', req.params)
  res.send('week list')
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log('listening on', port)
})

/**
 * Helpers.
 */
function parseParameters (command) {
  const commandParams = command.split(' ')
  const params = {}

  commandParams.forEach(param => {
    params.week = parseParameter('week', param)
  })

  return params
}

function parseParameter (name, raw) {
  if (raw.indexOf(`--${name}=`) > -1) {
    return raw.substr(`--${name}=`.length)
  }
}
