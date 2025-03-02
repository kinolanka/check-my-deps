import extractRootDomain from './extract-root-domain';

describe('extractRootDomain', () => {
  it('should extract the root domain from a valid URL', () => {
    expect(extractRootDomain('https://www.example.com')).toBe('www.example.com');
    expect(extractRootDomain('http://subdomain.example.co.uk')).toBe('subdomain.example.co.uk');
  });

  it('should return the input if the URL is invalid', () => {
    expect(extractRootDomain('invalid-url')).toBe('invalid-url');
    expect(extractRootDomain('')).toBe('');
  });

  it('should handle URLs with ports correctly', () => {
    expect(extractRootDomain('https://example.com:8080')).toBe('example.com');
  });

  it('should handle URLs with paths correctly', () => {
    expect(extractRootDomain('https://example.com/path/to/resource')).toBe('example.com');
  });

  it('should handle URLs with query parameters correctly', () => {
    expect(extractRootDomain('https://example.com?query=param')).toBe('example.com');
  });

  it('should handle URLs with fragments correctly', () => {
    expect(extractRootDomain('https://example.com#fragment')).toBe('example.com');
  });

  it('should handle URLs with authentication information correctly', () => {
    expect(extractRootDomain('https://user:pass@example.com')).toBe('example.com');
  });

  it('should handle URLs with IP addresses correctly', () => {
    expect(extractRootDomain('https://192.168.0.1')).toBe('192.168.0.1');
  });

  it('should handle URLs with localhost correctly', () => {
    expect(extractRootDomain('https://localhost')).toBe('localhost');
  });

  it('should extract the root domain from a git+ssh URL correctly', () => {
    expect(extractRootDomain('git+ssh://git@github.com/kinolanka/eslint-config-next.git#55dc5158d6909d9aa53a4b99c3c59763383fefcb')).toBe('github.com');
  });
});
