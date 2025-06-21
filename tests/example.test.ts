describe('Example Test', () => {
  it('should verify Jest is working', () => {
    expect(1 + 1).toBe(2);
  });

  it('should verify async operations work', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
}); 