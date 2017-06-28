# izone-google-calendar

This project will be deprecated soon in favor of izone-core-api.

## Setup

```
mkdir ~/.izone
```

Save your config.json in ~/.izone

## Using
```
# list pending time entries
izone ls

# import to izone
izone import
```
## Sample config.json
```
{
  "google": {
    "calendar": {
      "id": "primary"
    },
    "secret": {
      "installed": {
        "client_id": "something.apps.googleusercontent.com",
        "project_id": "something-12345",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://accounts.google.com/o/oauth2/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": "some-secret",
        "redirect_uris": [
          "urn:ietf:wg:oauth:2.0:oob",
          "http://localhost"
        ]
      }
    }
  },
  "izone": {
    "user": "abc",
    "sql": {
      "connectionString": "mssql://user:pass@192.168.0.1/database"
    }
  }
}```
