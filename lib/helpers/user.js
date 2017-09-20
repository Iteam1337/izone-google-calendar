'use strict'

/*
 * TODO: Mapping a slack user to an izone Person is a database operation.
 *       Move this functionality to adapters/database
 */

module.exports = {
  mapSlackUser: slackUser => {
    console.log('get user for slack username', slackUser)
    return {
      google: 'alexander.czigler@iteam.se',
      izone: 'acr'
    }
  }
}
