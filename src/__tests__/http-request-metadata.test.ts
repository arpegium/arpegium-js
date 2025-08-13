import { httpRequestMiddleware } from "../middleware/basics/httpRequest";
import { createContext } from "./helper";
import nock from 'nock';

describe('HTTP Request Middleware with metadata', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it('should store metadata in a separate global variable', async () => {
    // Mock HTTP response with headers
    nock('https://api.example.com')
      .get('/users')
      .reply(200, { name: 'John Doe' }, {
        'content-type': 'application/json',
        'x-request-id': '12345',
        'cache-control': 'no-cache'
      });
    
    const ctx = createContext();
    const mw = {
      type: 'httpRequest',
      name: 'getUserData',
      options: {
        url: 'https://api.example.com/users',
        method: 'GET'
      }
    };
    
    const result = await httpRequestMiddleware(ctx, mw, { logger: console });
    
    // Verify the request was successful
    expect(result.status).toBe('success');
    
    // Verify the main data is stored in globals
    expect(ctx.globals.getUserData).toEqual({ name: 'John Doe' });
    
    // Verify the metadata is stored correctly
    expect(ctx.globals['getUserData-metadata']).toBeDefined();
    expect(ctx.globals['getUserData-metadata'].status).toBe(200);
    expect(ctx.globals['getUserData-metadata'].url).toBe('https://api.example.com/users');
    expect(ctx.globals['getUserData-metadata'].method).toBe('GET');
    
    // Verify headers are stored in metadata
    expect(ctx.globals['getUserData-metadata'].headers).toBeDefined();
    expect(ctx.globals['getUserData-metadata'].headers['content-type']).toBe('application/json');
    expect(ctx.globals['getUserData-metadata'].headers['x-request-id']).toBe('12345');
    expect(ctx.globals['getUserData-metadata'].headers['cache-control']).toBe('no-cache');
    
    // Verify timestamp is present
    expect(ctx.globals['getUserData-metadata'].requestTimestamp).toBeDefined();
  });
});
