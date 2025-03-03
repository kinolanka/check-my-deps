**check-my-deps**

Easily manage and monitor project dependencies.


## Usage

### Basic Usage

```sh
cd <my-npm-project>
npx @kinolanka/check-my-deps@latest
```

This will create an Excel file in your current directory with detailed information about all your dependencies.

## Excel Report Documentation

When you run check-my-deps with the Excel output format, you'll receive a comprehensive Excel file with two worksheets: "Summary" and "Dependencies". Here's what each column in these worksheets represents:

### Dependencies Worksheet

This worksheet provides detailed information about each individual dependency in your project.

| Column Header | Internal Name | Description |
|---------------|--------------|-------------|
| Package Name | `packageName` | The name of the npm package as listed in your package.json file. |
| Update Status | `updateStatus` | Indicates whether the package is up-to-date or needs an update. Possible values: "upToDate", "patch", "minor", or "major". Color-coded for easy identification (green for up-to-date, blue for patch updates, orange for minor updates, red for major updates). |
| Is Deprecated | `deprecated` | Indicates whether the package has been deprecated by its maintainers. Values are "yes" or "no". Deprecated packages are highlighted in red. |
| Required Version | `reqVersion` | The version or version range specified in your package.json file. |
| Installed Version | `installedVersion` | The actual version installed in your node_modules directory. |
| Installed Version Published Date | `installDate` | The date when the installed version was published to the npm registry. |
| Latest Minor Version | `latestMinor` | The latest available version that maintains the same major version as your installed package. |
| Latest Minor Version Published Date | `latestMinorDate` | The date when the latest minor version was published to the npm registry. |
| Latest Available Version | `latestVersion` | The most recent version available on the npm registry, regardless of major version changes. |
| Latest Version Published Date | `latestVersionDate` | The date when the latest available version was published to the npm registry. |
| Registry Source | `regSource` | The source registry from which the package was downloaded (e.g., "npmjs.com", "github.com"). |
| Dependency Type | `depType` | The type of dependency as defined in your package.json (e.g., "dependencies", "devDependencies"). |

### Summary Worksheet

This worksheet provides an aggregated overview of your project's dependencies.

| Column Header | Internal Name | Description |
|---------------|--------------|-------------|
| Dependency Type | N/A | The category of dependency (e.g., "dependencies", "devDependencies"). |
| Total | `total` | The total number of packages in each dependency category. |
| Up-to-Date | `upToDate` | The number of packages that are already using the latest version. |
| Outdated | N/A | The total number of packages that need updates (sum of major, minor, and patch updates). |
| Major | `major` | The number of packages that have major version updates available. These updates may include breaking changes. |
| Minor | `minor` | The number of packages that have minor version updates available. These typically add new features without breaking changes. |
| Patch | `patch` | The number of packages that have patch version updates available. These typically include bug fixes and security patches. |
| Deprecated | `deprecated` | The number of packages that have been deprecated by their maintainers. |

## Color Coding

The Excel report uses color coding to help you quickly identify package status:

- **Green**: Up-to-date packages
- **Blue**: Packages with patch updates available
- **Orange**: Packages with minor updates available
- **Red**: Packages with major updates available or deprecated packages

This color coding makes it easy to prioritize which dependencies to update first, with red items typically requiring the most attention.

## Benefits of the Excel Report

The Excel report format offers several advantages for managing your dependencies:

1. **Visual Overview**: Get a clear visual representation of your dependency status with color coding to quickly identify issues.

2. **Comprehensive Information**: Access all relevant information about your dependencies in one place, including version details, publication dates, and deprecation status.

3. **Dependency Prioritization**: Easily identify which dependencies need urgent attention (major updates or deprecated packages) versus those that can be updated during regular maintenance cycles.

4. **Shareable Format**: Excel files can be easily shared with team members, stakeholders, or included in project documentation.

5. **Filtering and Sorting**: Use Excel's built-in filtering and sorting capabilities to focus on specific types of dependencies or issues.

6. **Historical Tracking**: Save reports over time to track your project's dependency health and the progress of your maintenance efforts.

7. **Offline Access**: Review your dependency information even when you're offline or away from your development environment.

## Interpreting the Results

Understanding your dependency report can help you make informed decisions about package updates:

### Update Status Meanings

- **upToDate**: Your installed version matches the latest available version. No action needed.
- **patch**: A patch update is available. These updates typically fix bugs and security issues without changing functionality. Generally safe to update.
- **minor**: A minor update is available. These add new features in a backward-compatible manner. Usually safe to update, but review changelogs for any potential issues.
- **major**: A major update is available. These may include breaking changes. Carefully review documentation before updating and plan for potential code changes.

### Deprecated Packages

When a package is marked as "deprecated," it means the maintainers no longer support it. You should:

1. Check the npm registry for the deprecation message, which often includes recommended alternatives
2. Plan to migrate away from deprecated packages, as they may contain security vulnerabilities or compatibility issues
3. Prioritize replacing deprecated packages over regular version updates

## Deprecated Packages Detection

One of the key features of check-my-deps is its ability to detect and highlight deprecated npm packages in your project. This is crucial for maintaining a healthy and secure codebase.

### Why Deprecated Package Detection Matters

1. **Security Risks**: Deprecated packages often contain security vulnerabilities that won't be fixed
2. **Maintenance Issues**: No ongoing support means bugs will remain unresolved
3. **Future Compatibility**: Deprecated packages may not work with newer versions of Node.js or other dependencies
4. **Better Alternatives**: Packages are often deprecated in favor of better solutions

### How Deprecated Packages Are Displayed

In the Excel report:

- The "Is Deprecated" column clearly marks each package with "yes" or "no"
- Deprecated packages are highlighted with a red background for immediate visibility
- The Summary worksheet includes a count of deprecated packages for each dependency type

### Recommended Actions for Deprecated Packages

When you identify deprecated packages:

1. Visit the npm registry page for the package to read the deprecation message
2. Look for recommended alternatives mentioned by the package maintainers
3. Create a migration plan to replace the deprecated package
4. Prioritize replacing deprecated packages over other dependency updates

Regular scanning for deprecated packages should be part of your project maintenance routine to ensure your codebase remains healthy and secure.

## Practical Examples

### Example 1: Routine Maintenance

For regular project maintenance:

1. Sort the Dependencies worksheet by "Update Status" to group similar updates together
2. Apply all patch updates first, as these are typically low-risk
3. Review and apply minor updates after testing
4. Schedule major updates for dedicated maintenance periods

### Example 2: Security Audit

When focusing on security:

1. Prioritize deprecated packages (filter by "Is Deprecated" = "yes")
2. Next, focus on packages with patch updates, as these often include security fixes
3. Check the publication dates to identify packages that haven't been updated in a long time

### Example 3: Preparing for a Major Release

When planning a significant project update:

1. Use the Summary worksheet to get an overview of how many packages need updates
2. Identify major version updates that align with your project's new features
3. Create a migration plan based on the number and complexity of required updates

## Output Format Options

check-my-deps supports multiple output formats to suit different needs:

### Excel Format (Recommended for Analysis)

```sh
npx @kinolanka/check-my-deps --output-format excel
```

The Excel format provides the most comprehensive view with visual indicators, making it ideal for:
- Detailed dependency analysis
- Sharing reports with team members
- Long-term dependency tracking
- Complex projects with many dependencies

### JSON Format (Recommended for Integration)

```sh
npx @kinolanka/check-my-deps --output-format json
```

The JSON format is perfect for:
- Integrating with other tools or scripts
- Automated processing of dependency information
- CI/CD pipelines
- Custom reporting solutions

### CSV Format (Recommended for Compatibility)

```sh
npx @kinolanka/check-my-deps --output-format csv
```

The CSV format offers:
- Compatibility with a wide range of data processing tools
- Easy import into spreadsheet applications other than Excel
- Simplified data structure for quick analysis
- Smaller file size compared to Excel

### Console Output (Default)

```sh
npx @kinolanka/check-my-deps
```

The default console output provides:
- Immediate visibility in your terminal
- Quick overview of dependency status
- No additional files generated
- Color-coded terminal output for easy reading

## Customizing the Output Path

You can specify where to save the generated report:

```sh
npx @kinolanka/check-my-deps --output-format excel --output-path ./reports/dependencies
```

This will save the Excel file to `./reports/dependencies.xlsx`.