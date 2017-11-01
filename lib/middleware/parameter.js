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
      req.izone.getGoogleAuthUrl = parseParameter('getGoogleAuthUrl', param) || req.izone.getGoogleAuthUrl
      req.izone.setGoogleToken = parseParameter('setGoogleToken', param) || req.izone.setGoogleToken
      req.izone.week = parseParameter('week', param) || req.izone.week
      req.izone.import = parseParameter('import', param) || req.izone.import
    })

    next()
  },
  parseButtonParameters: (req, res, next) => {
    if (!req.izone) {
      req.izone = {}
    }

    const value = req.params.actions[0].value

    if (!value) {
      return next()
    }

    const values = value.split(':')
    req.izone.import = values[0]
    req.izone.week = values[1]

    next()
  }
}
