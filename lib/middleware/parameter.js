'use strict'

function parseParameter (name, raw) {
  const pattern = `${name}=`
  if (raw.indexOf(pattern) > -1) {
    return raw.substr(pattern.length)
  }
}

module.exports = {
  parseParameters: (req, res, next) => {
    if (!req.izone) {
      req.izone = {}
    }

    if (!req.params.text) {
      return next()
    }

    req.params.text.split(' ').forEach(param => {
      req.izone.setGoogleToken = parseParameter('setGoogleToken', param) || req.izone.setGoogleToken
      req.izone.week = parseParameter('week', param) || req.izone.week
    })

    next()
  }
}
