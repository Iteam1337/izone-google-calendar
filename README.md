# izone-slack

REST API for the "Izone" Slack App.

The purpose of this API is to act as a relay between Google Calendar, Slack, 10 000' plans and our internal time tracking and economy system.

## Coding

### Running locally

```
# Setup.
nvm use
npm i
```
While working you can run tests and standards check manually or using npm watch.

```
# Run scripts.
npm run test
npm run server
npm run standard
```

```
# Run watches.
npm run watch_test
npm run watch_server
npm run watch_standard
```

### Contributing

If you are going to contribute, make sure you create a feature branch with your changes. Keep changes clean and focused and make sure all tests are running and your code is Standard compliant before creating a PR.

```
# Create a feature branch.
git checkout -b feature/some_new_feature
```

When creating a PR, make sure to merge from develop so that your branch is ready to be merged. Also, if the code changes are not self-explanatory, add some notes explaining what you have done and how to verify its functionality.
