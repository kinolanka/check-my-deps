const extractRootDomain = (url: string): string => {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch {
    return url;
  }
};

export default extractRootDomain;
