# check-my-deps

A Node.js CLI tool to analyze npm dependencies and generate comprehensive reports of installed versions versus latest available versions. The tool also provides the ability to update dependencies according to specified semver rules.

## Features

- Analyzes all dependencies in your project
- Detects outdated packages (patch, minor, major updates)
- Identifies deprecated packages
- Exports detailed reports in Excel or JSON format
- Provides summary statistics by dependency type
- Updates dependencies to their latest versions based on semver rules

## Installation & Usage

```sh
# Run directly with npx
npx @kinolanka/check-my-deps@latest
```

## Commands

### Export Command

Analyze dependencies in package.json and export a detailed report with version information.

```sh
# Export dependencies report (default command)
npx @kinolanka/check-my-deps@latest export

# Export with specific options
npx @kinolanka/check-my-deps@latest export --format json --output-dir ./reports
```

#### Export Options

- `-c, --cwd <cwd>` - The working directory where package.json is located. Defaults to the current directory.
- `-o, --output-dir <outputDir>` - The directory where the export file will be saved. Defaults to the current directory.
- `-s, --silent` - Prevent any output to the terminal.
- `-f, --force-overwrite` - Overwrite existing export files instead of creating unique filenames.
- `--format <format>` - The format of the export file (excel or json). Defaults to excel.

### Update Command

Update package.json dependencies according to specified semver rules.

```sh
# Check for updates without making changes
npx @kinolanka/check-my-deps@latest update --dry-run

# Update all dependencies to their latest versions
npx @kinolanka/check-my-deps@latest update

# Update dependencies to latest patch versions only
npx @kinolanka/check-my-deps@latest update --level patch
```

#### Update Options

- `-c, --cwd <cwd>` - The working directory where package.json is located. Defaults to the current directory.
- `-s, --silent` - Prevent any output to the terminal.
- `-l, --level <level>` - Specify the semver update level (latest, minor, patch). Controls how aggressive updates will be. Defaults to latest.
- `-d, --dry-run` - Show what would be updated without making actual changes to package.json.

### General Options

```sh
# Get help
npx @kinolanka/check-my-deps@latest -h

# Check version
npx @kinolanka/check-my-deps@latest -v
```

## License

MIT

---

For more information, visit [https://checkmydeps.com](https://checkmydeps.com)
