'use strict'

function parseParameter (name, raw) {
  const pattern = `${name}=`
  if (raw.indexOf(pattern) > -1) {
    return raw.substr(pattern.length)
  }
}

module.exports = {
  parseParameters: (req, res, next) => {
    req.izone = {}

    if (!req.params.text) {
      return next()
    }

    req.params.text.split(' ').forEach(param => {
      req.izone.week = parseParameter('week', param) || req.izone.week
    })

    next()
  }
}