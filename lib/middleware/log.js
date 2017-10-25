const config = require('../config')

module.exports = {
  log: (req, res, next) => {
    if (req && config.logging.debugRest) {
      console.log()
      console.log('req.body', req.body)
      console.log()
      console.log('req.params', req.params)
      console.log()
      if (req.route) {
        console.log('req.route.path', req.route.path)
        console.log()
      }
    }

    next()
  }
}
