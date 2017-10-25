module.exports = {
  isWorkout: eventSummary => {
    if (!eventSummary) return false

    if (eventSummary.toLowerCase().indexOf('träna:') === 0) {
      return true
    }

    if (eventSummary.toLowerCase().indexOf('dagens pass') === 0) {
      return true
    }

    return false
  }
}
