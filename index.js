'use strict'

const izoneService = require('./lib/services/izone')
const restify = require('restify')
const weekHelper = require('./lib/helpers/weekHelper')

const app = restify.createServer({})
app.pre(restify.pre.sanitizePath())
app.use(restify.CORS())
app.use(restify.bodyParser())
app.use(restify.queryParser())

app.get('/', (req, res, next) => {
  const version = require('./package.json').version
  res.end(`izone ${version}`)
})

app.post('/slack', (req, res, next) => {
  const parameters = parseParameters(req.params.text)
  if (!parameters.week) {
    parameters.week = weekHelper.getWeekForDate(new Date())
  }

  return izoneService.getWeekSummary(parameters.week)
    .then(summary => {
      const response = {
        attachments: []
      }
      response.text = `Summary for ${parameters.week}`

      for (let hour in summary.hours) {
        response.attachments.push({
          text: `${hour}: ${summary.hours[hour].hours} h`
        })
      }

      response.attachments.push({
        text: 'Buttons!',
        fallback: 'You are unable to choose a game',
        callback_id: 'wopr_game',
        color: '#3AA3E3',
        attachment_type: 'default',
        actions: [
          {
            "name": "import",
            "text": "Import hours",
            "type": "button",
            "value": "import"
          },
          {
            "name": "tenk",
            "text": "View 10 000'",
            "type": "button",
            "value": "tenk"
          }
        ]
      })

      res.send(response)
      next()
    })
})

app.post('/slack/button', (req, res, next) => {
  console.log('')
  console.log('Yey! A button was pressed!')
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
    params.week = parseParameter('week', param) || params.week
  })

  return params
}

function parseParameter (name, raw) {
  const pattern = `${name}=`
  if (raw.indexOf(pattern) > -1) {
    return raw.substr(pattern.length)
  }
}
