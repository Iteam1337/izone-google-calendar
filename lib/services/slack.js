const izoneService = require('./izone')

module.exports = {
  summary: ({ week, accessToken, username }) => {
    return izoneService.getWeekSummary({ week, accessToken, username })
      .then(summary => {
        delete summary.importedIds
        const response = {
          attachments: []
        }
        response.text = `Summary for ${week}`

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
            text: `${key}: ${hour.hours} h`
          })
        }

        response.attachments.push({
          text: `TOTAL: ${summary.total} h, TRÄNA: ${summary.health}`
        })

        return response
      })
  }
}
