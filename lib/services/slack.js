'use strict'

const izoneService = require('./izone')

module.exports = {
  summary: parameters => {
    return izoneService.getWeekSummary(parameters.week)
      .then(summary => {
        delete summary.importedIds
        const response = {
          attachments: []
        }
        response.text = `Summary for ${parameters.week}`

        for (let hour in summary.hours) {
          let color = 'good'
          if (summary.hours[hour].source !== 'izone') {
            color = 'warning'
          }
          response.attachments.push({
            color,
            text: `${hour}: ${summary.hours[hour].hours} h`
          })
        }

        response.attachments.push({
          text: `TOTAL: ${summary.total} h, TRÄNA: ${summary.health}`
        })

        response.attachments.push({
          fallback: '-fallback-',
          callback_id: 'izone_import_button',
          attachment_type: 'default',
          actions: [
            {
              'name': 'update',
              'text': 'Update',
              'type': 'button',
              'value': 'update'
            }
          ]
        })

        return response
      })
  }
}
