'use strict'

const restify = require('restify')

const app = restify.createServer({})
app.pre(restify.pre.sanitizePath())
app.use(restify.CORS())
app.use(restify.queryParser())

app.get('/', (req, res, next) => {
  const version = require('./package.json').version
  res.end(`izone ${version}`)
})

app.post('/izone/summary', (req, res, next) => {
  console.log('body', req.body)
  console.log('params', req.params)
  res.send('meow')
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log('listening on', port)
})
