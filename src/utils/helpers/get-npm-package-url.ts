const getNpmPackageUrl = (packageName: string, packageVersion?: string): string => {
  if (!packageName) {
    return '';
  }

  const baseUrl = `https://www.npmjs.com/package/${packageName}`;

  if (packageVersion) {
    return `${baseUrl}/v/${packageVersion}`;
  }

  return baseUrl;
};

export default getNpmPackageUrl;
