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
  getParams(req.params.command)
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
function getParams (command) {
  const commandParams = command.split(' ').splice(0, 1)
  const params = {}

  commandParams.forEach(param => {
    console.log(param)
  })

  if (command.indexOf('--week=')) {
    //console.log(command.substr(command.indexOf('--week=')))
  }
}