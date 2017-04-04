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
  return izoneService.getWeekSummary('2017w14')
    .then(summary => {
      let message = 'Your hours<br><br>'

      for (let hour in summary.hours) {
        message += `${hour}: ${summary.hours[hour].hours}<br>`
      }

      res.send(message)
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
