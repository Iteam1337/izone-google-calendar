const config = require('../config')

module.exports = {
  log: (req, res, next) => {
    console.log('LOGGING K', cofig.logging)
    if (req && config.logging.debug_rest) {
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
