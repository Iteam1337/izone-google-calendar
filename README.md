# izone-slack

REST API for the "Izone" Slack App.

The purpose of this API is to act as a relay between Google Calendar, Slack, 10 000' plans and our internal time tracking and economy system.

## Coding

### Running locally

#### 1

```
# Setup.
nvm use
npm i
npm i -g nodemon

```

#### 2

```
# Run server.
nodemon index.js
```

```
# Run tests and standard linter.
npm run watch
```

### Contributing

If you are going to contribute, make sure you create a feature branch with your changes. Keep changes clean and focused and make sure all tests are running and your code is Standard compliant before creating a PR.

```
# Create a feature branch.
git checkout -b feature/some_new_feature
```

When creating a PR, make sure to merge from develop so that your branch is ready to be merged. Also, if the code changes are not self-explanatory, add some notes explaining what you have done and how to verify its functionality.
