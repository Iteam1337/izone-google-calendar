'use strict'

const config = require('../config')

module.exports = {
  log: (req, res, next) => {
    if (config.logging.debugRest) {
      console.log()
      console.log(req.route.path)
      console.log(req.params)
      console.log()
    }

    next()
  }
}
