const sanitizeFileName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/@/g, '')
    .replace(/[^a-z0-9]/g, '-');
};

export default sanitizeFileName;
