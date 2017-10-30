const izoneService = require('./izone')

module.exports = {
  summary: ({ week, accessToken, username }) => {
    return izoneService.getWeekSummary({ week, accessToken, username })
      .then(groupedHours => {
        console.log(groupedHours)
        let total = 0
        let health = 0
        const response = {
          text: `Summary for ${week}`,
          attachments: groupedHours.map(summary => {
            total += !summary.isWorkout ? summary.hours : 0
            health += summary.isWorkout ? summary.hours : 0
            return {
              color: summary.status ? summary.status : 'good',
              text: `${summary.alias}: ${summary.hours} h`
            }
          })
        }

        response.attachments.push({
          text: `TOTAL: ${total} h, TRÄNA: ${health}`
        })

        return response
      })
  }
}
