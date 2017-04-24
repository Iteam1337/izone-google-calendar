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
        let showImportButton = false

        for (let hour in summary.hours) {
          let color ='good'
          if (summary.hours[hour].source !== 'izone') {
            color = 'warning'
            showImportButton = true
          }
          response.attachments.push({
            color,
            text: `${hour}: ${summary.hours[hour].hours} h`
          })
        }

        response.attachments.push({
          text: `TOTAL: ${summary.total} h, TRÄNA: ${summary.health}`
        })

        const buttonAttachment = {
          text: 'You have hours that are not yet imported to izone.',
          fallback: 'All your hours are imported!',
          callback_id: 'izone_import_button',
          attachment_type: 'default',
          actions: [
            {
              "name": "import",
              "text": "Import",
              "type": "button",
              "value": "import"
            }
          ]
        }

        if (showImportButton) {
          response.attachments.push(buttonAttachment)
        }

        return response
      })
  }
}
