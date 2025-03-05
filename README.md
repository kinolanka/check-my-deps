**check-my-deps**

A Node.js CLI tool to analyze npm dependencies and generate comprehensive reports of installed versions versus latest available versions.

## Features

- Analyzes all dependencies in your project
- Detects outdated packages (patch, minor, major updates)
- Identifies deprecated packages
- Exports detailed reports in Excel format
- Provides summary statistics by dependency type

## Installation & Usage

```sh
# Run directly with npx
npx @kinolanka/check-my-deps@latest
```

## Command Options

```sh
# Get help
npx @kinolanka/check-my-deps@latest -h

# Check version
npx @kinolanka/check-my-deps@latest -v

# Analyze dependencies in a specific directory
npx @kinolanka/check-my-deps@latest -c path/to/project
```

## Excel Report Contents

The generated Excel file contains two worksheets:

### Dependencies Worksheet

Detailed information about each dependency including:

| Column                   | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| Package Name             | Name of the npm package                                  |
| Update Status            | Current status (up-to-date, patch, minor, major)         |
| Is Deprecated            | Whether the package is deprecated (yes/no)               |
| Required Version         | Version specified in package.json                        |
| Installed Version        | Actual version in node_modules                           |
| Latest Minor Version     | Latest available version with same major                 |
| Latest Available Version | Most recent version on npm registry                      |
| Registry Source          | Source registry (npmjs.com, github.com, etc.)            |
| Dependency Type          | Category in package.json (dependencies, devDependencies) |

### Summary Worksheet

Aggregated statistics including:

- Total packages by dependency type
- Number of up-to-date packages
- Number of outdated packages (major, minor, patch)
- Number of deprecated packages

## License

MIT

---

For more information, visit [https://checkmydeps.com](https://checkmydeps.com)
