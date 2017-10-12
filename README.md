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
nodemon
```

```
# Run npm-watch that runs standard linter and tests each time a file changes.
npm start
```

### Contributing

If you are going to contribute, make sure you create a feature branch with your changes. Keep changes clean and focused and make sure all tests are running and your code is Standard compliant before creating a PR.

```
# Create a feature branch.
git checkout -b feature/some_new_feature
# or, using git flow
git flow feature start some_new_feature
```

When creating a PR, make sure to merge from develop so that your branch is ready to be merged. Also, if the code changes are not self-explanatory, add some notes explaining what you have done and how to verify its functionality.

```
git pull origin develop
git push origin feature/some_new_feature
```

#### Database

View relevant fields in people_db
```
use izone;

SELECT	 p_id
		,p_firstname
		,p_lastname
		,p_izusername
		,p_slack_user_id
		,p_slack_user_name
		,p_google_calendar_address
		,p_google_calendar_id
		,p_google_token_access_token
		,p_google_token_expiry
		,p_google_token_refresh_token
FROM people_db

```
