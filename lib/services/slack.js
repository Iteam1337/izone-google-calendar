const izoneService = require('./izone')

module.exports = {
  summary: parameters => {
    return izoneService.getWeekSummary(parameters)
      .then(summary => {
        delete summary.importedIds
        const response = {
          attachments: []
        }

        response.title = 'Izone'
        response.text = `Summary for ${parameters.week}`

        for (let key in summary.hours) {
          let color = 'good'
          const hour = summary.hours[key]

          switch (hour.status) {
            case 'warning':
              color = 'warning'
              break
            case 'error':
              color = 'danger'
              break
            case 'ok':
              color = 'good'
              break
          }

          response.attachments.push({
            color,
            title: `${key}:`,
            text: `${hour.hours} h`
          })

          if (hour.status !== 'ok') {
            response.attachments.push({
              fallback: '-fallback-',
              callback_id: 'izone_import_button',
              attachment_type: 'default',
              actions: [
                {
                  'name': 'import',
                  'text': `Import ${key}:`,
                  'type': 'button',
                  'value': `${key}:${parameters.week}`
                }
              ]
            })
          }
        }

        response.attachments.push({
          text: `TOTAL: ${summary.total} h, TRÄNA: ${summary.health}`
        })

        return response
      })
  }
}
