'use strict'

const izoneService = require('./izone')

module.exports = {
  summary: parameters => {
    return izoneService.getWeekSummary(parameters.week)
      .then(summary => {
        const response = {
          attachments: []
        }
        response.text = `Summary for ${parameters.week}`

        for (let hour in summary.hours) {
          response.attachments.push({
            color: (summary.hours[hour].source === 'izone') ? 'good' : 'warning',
            text: `${hour}: ${summary.hours[hour].hours} h`
          })
        }

        response.attachments.push({
          text: 'Buttons that do nothing (yay!)',
          fallback: '',
          callback_id: 'izone_buttons',
          color: '#3AA3E3',
          attachment_type: 'default',
          actions: [
            {
              "name": "import",
              "text": "Import hours",
              "type": "button",
              "value": "import"
            },
            {
              "name": "tenk",
              "text": "View 10 000'",
              "type": "button",
              "value": "tenk"
            }
          ]
        })

        return response
      })
  }
}
