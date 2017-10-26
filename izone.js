const cli = require('./lib/cli')
const google = require('./lib/adapters/google')

let exitCode = 0
let _command = process.argv[2]

if (!_command) {
  _command = 'summary'
}

const r = () => {
  switch (_command) {
    /**
     * Save time entries to izone db.
     */
    case 'import':
      return google.checkConfiguration()
        .then(() => cli.import(process.argv[3]))

    /**
     * List all time entries from google calendar and izone db.
     */
    case 'ls':
      return google.checkConfiguration()
        .then(() => cli.ls(process.argv[3]))

    /**
     * Show a summary of time spent.
     */
    case 'summary':
      return google.checkConfiguration()
        .then(() => cli.summary(process.argv[3]))

    default:
      return Promise.reject(new Error((`Command '${_command}' is not declared.`)))
  }
}

r()
  .then(() => {
    console.log()
  })
  .catch(error => {
    exitCode = 1
    if (error.message) {
      console.error(`Error: ${error.message}`)
    }

    if (error.statusMessage) {
      console.error(`Error: ${error.statusCode} ${error.statusMessage}`)
    }

    console.error(error)
  })
  .then(() => {
    console.log()
    process.exit(exitCode)
  })
