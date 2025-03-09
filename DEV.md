# Local Development

## Test commands locally

```sh
# get the version of package
npm run start -- -v

# get help information
npm run start -- -h

# run the export command on test projects
npm start -- -c ./test-projects/no-package-json -o ./temp
npm start -- -c ./test-projects/no-package-lock -o ./temp
npm start -- -c ./test-projects/no-packages -o ./temp

npm start -- -c ./test-projects/main -o ./temp
npm start -- -c ./test-projects/main -o ./temp --format json


# run the update on the main test project
npm start -- update -c ./test-projects/main -o ./temp
```
