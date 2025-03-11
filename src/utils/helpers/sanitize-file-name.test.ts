import sanitizeFileName from '@/utils/helpers/sanitize-file-name';

describe('sanitizeFileName', () => {
  it('should convert the name to lowercase', () => {
    expect(sanitizeFileName('FileName')).toBe('filename');
  });

  it('should remove @ symbols', () => {
    expect(sanitizeFileName('file@name')).toBe('filename');
  });

  it('should replace non-alphanumeric characters with hyphens', () => {
    expect(sanitizeFileName('file name!')).toBe('file-name-');

    expect(sanitizeFileName('file_name')).toBe('file-name');
  });

  it('should handle mixed cases', () => {
    expect(sanitizeFileName('File@Name!')).toBe('filename-');
  });

  it('should handle empty strings', () => {
    expect(sanitizeFileName('')).toBe('');
  });

  it('should handle strings with only special characters', () => {
    expect(sanitizeFileName('@!#')).toBe('--');
  });

  it('should handle strings with numbers', () => {
    expect(sanitizeFileName('file123')).toBe('file123');

    expect(sanitizeFileName('file@123')).toBe('file123');
  });
});
