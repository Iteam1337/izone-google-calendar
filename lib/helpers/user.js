'use strict'

module.exports = {
  mapSlackUser: slackUser => {
    console.log('get user for slack username', slackUser)
    return {
      google: 'alexander.czigler@iteam.se'
      izone: 'acr'
    }
  }
}
