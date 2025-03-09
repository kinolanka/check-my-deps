# @kinolanka-demo/main

This is a dummy project created specifically for testing the `check-my-deps` tool. It contains various dependency formats and specifications that can be found in real-world npm projects.

## Purpose

This project demonstrates all possible ways packages can be specified in a `package.json` file, including:

1. **Regular dependencies** with different version specifiers:
   - Exact version (`lodash: "4.17.21"`)
   - Caret ranges (`express: "^4.18.2"`) - accepts minor and patch updates
   - Tilde ranges (`axios: "~1.4.0"`) - accepts only patch updates
   - Greater than (`react: ">=18.2.0"`) - accepts any version greater or equal
   - Version ranges (`moment: ">=2.29.0 <3.0.0"`) - accepts versions within a range
   - Any version (`chalk: "*"`) - accepts any version
   - Empty version (`uuid: ""`) - latest version

2. **Git dependencies**:
   - GitHub shorthand (`rimraf: "github:isaacs/rimraf#v4.4.1"`)
   - Git URLs (`commander: "git://github.com/tj/commander.js.git#v10.0.1"`)
   - Git HTTPS (`glob: "git+https://github.com/isaacs/node-glob.git"`)
   - Git SSH (`dotenv: "git+ssh://git@github.com/motdotla/dotenv.git#v16.3.1"`)

3. **Other dependency types**:
   - Tarball URLs (`semver: "https://github.com/npm/node-semver/archive/v7.5.4.tar.gz"`)
   - Local file paths (`is-odd: "file:../local-packages/is-odd"`)
   - npm aliases (`debug: "npm:ms@latest"`)

4. **Special dependency types**:
   - `devDependencies`
   - `peerDependencies`
   - `optionalDependencies`
   - `bundleDependencies`

## Usage

This project is not meant to be run or used as a real application. It's designed specifically to test the functionality of the `check-my-deps` tool with various dependency formats.

To use this project for testing:

```bash
npx @kinolanka/check-my-deps --path ./test-project
```
