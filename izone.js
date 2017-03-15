'use strict'

const cli = require('./lib/cli')

let exitCode = 0
const _command = process.argv[2]

if (!_command) {
  console.error('No command specified.')
  process.exit(1)
}

const r = () => {
  switch (_command) {
    /*
     * Lists new hours and matching izone job.
     */
    case 'import':
      return cli.import(process.argv[3])
    case 'ls':
      return cli.ls(process.argv[3])
    case 'summary':
      return cli.summary(process.argv[3])
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
