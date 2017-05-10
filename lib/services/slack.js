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

        for (let key in summary.hours) {
          let color = 'good'
          const hour = summary.hours[key]

          switch (hour.status) {
            case 'dirty':
              color = 'warning'
              break
            case 'error':
              color = 'bad'
              break
            case 'ok':
              color = 'good'
              break
          }

          response.attachments.push({
            color,
            text: `${key}: ${hour.hours} h`
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
